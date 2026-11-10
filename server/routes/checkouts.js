const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, enforceTenant, requireRole } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');
const NotificationService = require('../services/notificationService');
const { v4: uuidv4 } = require('../utils/uuid');

// POST /api/checkouts/calculate (Preview settlement breakdown before confirming)
router.post('/calculate', requireAuth, enforceTenant, (req, res) => {
  try {
    const orgId = req.tenantId;
    const { residentId, deductions = 0 } = req.body;

    if (!residentId) {
      return res.status(400).json({ error: 'Resident ID is required.' });
    }

    const resident = db.prepare(`
      SELECT r.*, rm.room_number, b.bed_number, p.name as property_name
      FROM residents r
      LEFT JOIN rooms rm ON r.current_room_id = rm.id
      LEFT JOIN beds b ON r.current_bed_id = b.id
      LEFT JOIN properties p ON r.property_id = p.id
      WHERE r.id = ? AND r.organization_id = ?
    `).get(residentId, orgId);

    if (!resident) {
      return res.status(404).json({ error: 'Resident not found.' });
    }

    // Pending unpaid invoices
    const pendingInvoices = db.prepare(`
      SELECT * FROM invoices 
      WHERE resident_id = ? AND status IN ('pending', 'partially_paid', 'overdue')
    `).all(residentId);

    const pendingDues = pendingInvoices.reduce((acc, inv) => acc + (inv.balance_amount || 0), 0);
    const depositPaid = Number(resident.deposit_amount) || 0;
    const deductionAmt = Number(deductions) || 0;

    // Settlement calculation:
    // Net Payable/Refundable = Deposit Paid - Pending Invoices Dues - Damage Deductions
    const netRefundable = depositPaid - pendingDues - deductionAmt;

    res.json({
      resident: {
        id: resident.id,
        fullName: resident.full_name,
        roomNumber: resident.room_number,
        bedNumber: resident.bed_number,
        propertyName: resident.property_name,
        joiningDate: resident.joining_date
      },
      depositPaid,
      pendingDues,
      pendingInvoices,
      deductions: deductionAmt,
      netRefundable, // Positive means refund to resident, Negative means resident owes money
      status: resident.status
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate checkout settlement: ' + err.message });
  }
});

// POST /api/checkouts/settle (Execute formal checkout, bed release & archive)
router.post('/settle', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager', 'receptionist'), (req, res) => {
  try {
    const orgId = req.tenantId;
    const {
      residentId,
      deductions = 0,
      deductionReason = 'None',
      depositRefunded = 0,
      duesSettled = 0,
      paymentMethod = 'upi',
      notes = 'Formal checkout completed'
    } = req.body;

    const resident = db.prepare(`
      SELECT r.*, rm.room_number, b.bed_number, p.name as property_name
      FROM residents r
      LEFT JOIN rooms rm ON r.current_room_id = rm.id
      LEFT JOIN beds b ON r.current_bed_id = b.id
      LEFT JOIN properties p ON r.property_id = p.id
      WHERE r.id = ? AND r.organization_id = ?
    `).get(residentId, orgId);

    if (!resident) {
      return res.status(404).json({ error: 'Resident not found.' });
    }

    if (resident.status === 'checked_out') {
      return res.status(400).json({ error: 'Resident is already checked out.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const checkoutLogId = uuidv4();
    const settlementReceiptNumber = `NOC-SETTLE-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const settleTx = db.transaction(() => {
      // 1. Release the bed (set to 'available')
      if (resident.current_bed_id) {
        db.prepare(`
          UPDATE beds SET status = 'available' WHERE id = ?
        `).run(resident.current_bed_id);
      }

      // 2. Update room occupancy
      if (resident.current_room_id) {
        const totalBeds = db.prepare('SELECT COUNT(*) as cnt FROM beds WHERE room_id = ?').get(resident.current_room_id).cnt;
        const occupiedBeds = db.prepare("SELECT COUNT(*) as cnt FROM beds WHERE room_id = ? AND status = 'occupied'").get(resident.current_room_id).cnt;
        const newStatus = occupiedBeds === 0 ? 'available' : (occupiedBeds >= totalBeds ? 'fully_occupied' : 'partially_occupied');
        db.prepare('UPDATE rooms SET status = ? WHERE id = ?').run(newStatus, resident.current_room_id);
      }

      // 3. Close open room allocation
      db.prepare(`
        UPDATE room_allocations 
        SET end_date = ?, status = 'terminated'
        WHERE resident_id = ? AND status = 'active'
      `).run(todayStr, residentId);

      // 4. Mark all pending invoices as settled if dues were collected
      if (Number(duesSettled) > 0) {
        const pendingInvoices = db.prepare(`
          SELECT * FROM invoices 
          WHERE resident_id = ? AND status IN ('pending', 'partially_paid', 'overdue')
        `).all(residentId);

        let remainingSettlement = Number(duesSettled);
        for (const inv of pendingInvoices) {
          if (remainingSettlement <= 0) break;
          const payAmt = Math.min(remainingSettlement, inv.balance_amount);
          const newPaid = inv.paid_amount + payAmt;
          const newBal = inv.balance_amount - payAmt;
          const status = newBal === 0 ? 'paid' : 'partially_paid';

          db.prepare(`
            UPDATE invoices SET paid_amount = ?, balance_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
          `).run(newPaid, newBal, status, inv.id);

          // Record payment
          db.prepare(`
            INSERT INTO payments (
              id, organization_id, property_id, resident_id, invoice_id,
              transaction_id, receipt_number, amount, payment_method, status,
              payment_date, notes, recorded_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'successful', ?, ?, ?)
          `).run(
            uuidv4(), orgId, resident.property_id, residentId, inv.id,
            `TXN_COUT_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
            `RCPT-COUT-${Math.floor(10000 + Math.random() * 90000)}`,
            payAmt, paymentMethod, now, 'Checkout Dues Settlement', req.user.full_name
          );

          remainingSettlement -= payAmt;
        }
      }

      // 5. If deposit refunded, record refund transaction
      if (Number(depositRefunded) > 0) {
        db.prepare(`
          INSERT INTO refunds (
            id, organization_id, property_id, resident_id, amount,
            reason, refund_method, status, processed_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?)
        `).run(
          uuidv4(), orgId, resident.property_id, residentId,
          Number(depositRefunded), 'Security Deposit Refund on Check-Out',
          paymentMethod, req.user.full_name
        );
      }

      // 6. Mark resident status as 'checked_out' and clear current bed/room references
      db.prepare(`
        UPDATE residents SET
          status = 'checked_out',
          actual_checkout_date = ?,
          current_room_id = NULL,
          current_bed_id = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(todayStr, residentId);

      // 7. Insert Checkout Log
      db.prepare(`
        INSERT INTO checkin_checkout_records (
          id, organization_id, property_id, resident_id, type,
          action_date, staff_user_id, room_id, bed_id,
          deposit_refunded, pending_dues_settled, deductions, deduction_reason, notes
        ) VALUES (?, ?, ?, ?, 'check_out', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        checkoutLogId, orgId, resident.property_id, residentId,
        now, req.user.id, resident.current_room_id || 'N/A', resident.current_bed_id || 'N/A',
        Number(depositRefunded), Number(duesSettled), Number(deductions), deductionReason, notes
      );
    });

    settleTx();

    // Trigger departure notification
    if (resident.user_id) {
      NotificationService.notify({
        organizationId: orgId,
        userId: resident.user_id,
        title: '👋 Checkout Completed & Settled',
        message: `Your check-out from ${resident.property_name} is complete. Settlement Certificate #${settlementReceiptNumber}. Thank you for staying with us!`,
        type: 'checkout_reminder',
        data: { residentId, settlementReceiptNumber }
      });
    }

    logAudit({ user: req.user, tenantId: orgId, headers: req.headers, socket: req.socket }, {
      action: 'CHECK_OUT_RESIDENT',
      entity: 'Resident',
      entityId: residentId,
      newValues: {
        fullName: resident.full_name,
        depositRefunded: Number(depositRefunded),
        deductions: Number(deductions),
        releasedBed: resident.bed_number
      }
    });

    res.json({
      message: 'Resident successfully checked out. Bed has been released.',
      settlementReceiptNumber,
      residentName: resident.full_name,
      freedBed: resident.bed_number,
      depositRefunded: Number(depositRefunded),
      deductions: Number(deductions)
    });
  } catch (err) {
    console.error('Checkout settle error:', err);
    res.status(500).json({ error: 'Failed to complete check-out settlement: ' + err.message });
  }
});

module.exports = router;
