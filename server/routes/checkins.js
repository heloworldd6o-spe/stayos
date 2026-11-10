const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { requireAuth, enforceTenant, requireRole } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');
const NotificationService = require('../services/notificationService');
const { v4: uuidv4 } = require('../utils/uuid');

// POST /api/checkins (Full Check-In Workflow)
router.post('/', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager', 'receptionist'), async (req, res) => {
  try {
    const orgId = req.tenantId;
    const {
      // Personal
      fullName, gender, dob, phone, email,
      emergencyContactName, emergencyContactPhone, emergencyContactRelation,
      permanentAddress,
      // Identity
      idType = 'aadhaar', idNumber, idDocumentUrl,
      // Stay
      propertyId, roomId, bedId,
      joiningDate = new Date().toISOString().split('T')[0],
      expectedCheckoutDate,
      occupation = 'working_professional',
      organizationOrCollege,
      foodPreference = 'veg',
      medicalNotes,
      // Financial
      monthlyRent,
      depositAmount = 0,
      initialPaymentAmount = 0,
      paymentMethod = 'upi',
      rentDueDay = 5
    } = req.body;

    if (!fullName || !phone || !email || !propertyId || !roomId || !bedId || !monthlyRent) {
      return res.status(400).json({ error: 'Please provide all required fields (Name, Phone, Email, Property, Room, Bed, Monthly Rent).' });
    }

    // 1. Validate Bed and Tenant Isolation
    const bed = db.prepare(`
      SELECT b.*, r.room_number, p.name as property_name, o.currency_symbol, o.invoice_prefix
      FROM beds b
      JOIN rooms r ON b.room_id = r.id
      JOIN properties p ON b.property_id = p.id
      JOIN organizations o ON p.organization_id = o.id
      WHERE b.id = ? AND b.property_id = ? AND p.organization_id = ?
    `).get(bedId, propertyId, orgId);

    if (!bed) {
      return res.status(404).json({ error: 'Selected bed not found in this property.' });
    }

    // Rule 1: One bed cannot have two active residents
    if (bed.status === 'occupied') {
      return res.status(400).json({ error: 'Unable to allocate this bed because it is already assigned to another resident.' });
    }

    const residentId = `res-${uuidv4().substring(0, 8)}`;
    const userId = `user-${uuidv4().substring(0, 8)}`;
    const allocationId = uuidv4();
    const checkinLogId = uuidv4();
    const invoiceId = `inv-${Date.now()}`;
    const paymentId = uuidv4();
    const invoiceNumber = `${bed.invoice_prefix || 'USTAY'}-${new Date().getFullYear()}-${new Date().getMonth() + 1}-${Math.floor(100 + Math.random() * 900)}`;
    const receiptNumber = `RCPT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const rentAmt = Number(monthlyRent);
    const depAmt = Number(depositAmount) || 0;
    const initialPay = Number(initialPaymentAmount) || 0;
    const totalFirstInvoice = rentAmt + depAmt;

    // Check if user login already exists by email
    let existingUser = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
    let finalUserId = existingUser ? existingUser.id : userId;

    const defaultPasswordHash = await bcrypt.hash('password123', 10);

    // Run atomic check-in transaction
    const checkinTx = db.transaction(() => {
      // 1. Create linked user account for resident portal access if not exists
      if (!existingUser) {
        db.prepare(`
          INSERT INTO users (id, organization_id, role, full_name, email, phone, password_hash, is_active)
          VALUES (?, ?, 'resident', ?, ?, ?, ?, 1)
        `).run(userId, orgId, fullName.trim(), email.trim(), phone.trim(), defaultPasswordHash);

        db.prepare(`
          INSERT INTO notification_preferences (id, user_id, in_app_enabled, email_enabled, whatsapp_enabled, sms_enabled)
          VALUES (?, ?, 1, 1, 1, 0)
        `).run(uuidv4(), userId);
      }

      // 2. Insert resident profile
      db.prepare(`
        INSERT INTO residents (
          id, organization_id, property_id, user_id, full_name,
          gender, dob, phone, email,
          emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
          permanent_address, id_type, id_number, id_document_url,
          occupation, organization_or_college, food_preference, medical_notes,
          current_room_id, current_bed_id, joining_date, expected_checkout_date,
          monthly_rent, deposit_amount, rent_due_day, status
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, 'active'
        )
      `).run(
        residentId, orgId, propertyId, finalUserId, fullName.trim(),
        gender, dob || null, phone.trim(), email.trim(),
        emergencyContactName || '', emergencyContactPhone || '', emergencyContactRelation || '',
        permanentAddress || '', idType, idNumber || '', idDocumentUrl || null,
        occupation, organizationOrCollege || '', foodPreference, medicalNotes || '',
        roomId, bedId, joiningDate, expectedCheckoutDate || null,
        rentAmt, depAmt, Number(rentDueDay) || 5
      );

      // 3. Mark Bed Occupied
      db.prepare(`
        UPDATE beds SET status = 'occupied', monthly_rent = ? WHERE id = ?
      `).run(rentAmt, bedId);

      // 4. Update Room status
      const totalBedsInRoom = db.prepare('SELECT COUNT(*) as count FROM beds WHERE room_id = ?').get(roomId).count;
      const occupiedBedsInRoom = db.prepare("SELECT COUNT(*) as count FROM beds WHERE room_id = ? AND status = 'occupied'").get(roomId).count;
      const newRoomStatus = occupiedBedsInRoom >= totalBedsInRoom ? 'fully_occupied' : 'partially_occupied';
      db.prepare('UPDATE rooms SET status = ? WHERE id = ?').run(newRoomStatus, roomId);

      // 5. Create Room Allocation History
      db.prepare(`
        INSERT INTO room_allocations (
          id, resident_id, bed_id, room_id, property_id, start_date,
          monthly_rent, deposit_paid, allocated_by, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `).run(
        allocationId, residentId, bedId, roomId, propertyId, joiningDate,
        rentAmt, depAmt, req.user.full_name
      );

      // 6. Create Initial Invoice (Rent + Security Deposit)
      const isInitialPaid = initialPay >= totalFirstInvoice;
      const initialBalance = Math.max(0, totalFirstInvoice - initialPay);
      const invoiceStatus = isInitialPaid ? 'paid' : (initialPay > 0 ? 'partially_paid' : 'pending');
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

      db.prepare(`
        INSERT INTO invoices (
          id, organization_id, property_id, resident_id, invoice_number,
          billing_month, billing_year, period_start, period_end,
          rent_amount, electricity_amount, mess_amount, laundry_amount,
          maintenance_amount, late_fee_amount, discount_amount, tax_amount,
          total_amount, paid_amount, balance_amount, status, due_date, notes
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, 0, 0, 0,
          0, 0, 0, 0,
          ?, ?, ?, ?, ?, ?
        )
      `).run(
        invoiceId, orgId, propertyId, residentId, invoiceNumber,
        new Date().getMonth() + 1, new Date().getFullYear(), joiningDate, expectedCheckoutDate || joiningDate,
        rentAmt + depAmt,
        totalFirstInvoice, initialPay, initialBalance, invoiceStatus,
        joiningDate, 'First Month Rent & Security Deposit Joining Invoice'
      );

      // 7. If initial payment was made, record payment receipt
      if (initialPay > 0) {
        db.prepare(`
          INSERT INTO payments (
            id, organization_id, property_id, resident_id, invoice_id,
            transaction_id, receipt_number, amount, payment_method, status,
            payment_date, notes, recorded_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'successful', ?, ?, ?)
        `).run(
          paymentId, orgId, propertyId, residentId, invoiceId,
          `TXN_CHK_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
          receiptNumber, initialPay, paymentMethod, now,
          `Initial Check-In Payment collected by ${req.user.full_name}`,
          req.user.full_name
        );
      }

      // 8. Record Check-In Log
      db.prepare(`
        INSERT INTO checkin_checkout_records (
          id, organization_id, property_id, resident_id, type,
          action_date, staff_user_id, room_id, bed_id,
          deposit_collected, pending_dues_settled, notes
        ) VALUES (?, ?, ?, ?, 'check_in', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        checkinLogId, orgId, propertyId, residentId,
        now, req.user.id, roomId, bedId,
        depAmt, initialPay, `Check-in completed. Welcome to ${bed.property_name}!`
      );
    });

    checkinTx();

    // Welcome Notification
    NotificationService.notify({
      organizationId: orgId,
      userId: finalUserId,
      title: `🎉 Welcome to ${bed.property_name}!`,
      message: `Your room ${bed.room_number} (Bed ${bed.bed_number}) is ready. You can view meal menus, log complaints, and pay rent through your StayOS portal.`,
      type: 'notice',
      data: { residentId, propertyId, bedNumber: bed.bed_number }
    });

    logAudit({ user: req.user, tenantId: orgId, headers: req.headers, socket: req.socket }, {
      action: 'CHECK_IN_RESIDENT',
      entity: 'Resident',
      entityId: residentId,
      newValues: { fullName, roomNumber: bed.room_number, bedNumber: bed.bed_number, initialPay }
    });

    res.status(201).json({
      message: 'Check-in completed successfully!',
      residentId,
      invoiceId,
      invoiceNumber,
      receiptNumber: initialPay > 0 ? receiptNumber : null,
      bedAssigned: bed.bed_number
    });
  } catch (err) {
    console.error('Checkin error:', err);
    res.status(500).json({ error: 'Failed to process check-in: ' + err.message });
  }
});

module.exports = router;
