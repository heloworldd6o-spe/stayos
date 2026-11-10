const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, enforceTenant, requireRole } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');
const NotificationService = require('../services/notificationService');
const { v4: uuidv4 } = require('../utils/uuid');

// GET /api/invoices (List invoices with rich filters)
router.get('/', requireAuth, enforceTenant, (req, res) => {
  try {
    const orgId = req.tenantId;
    const { propertyId, residentId, status, month, year, search } = req.query;

    let query = `
      SELECT 
        i.*,
        r.full_name as resident_name,
        r.phone as resident_phone,
        r.email as resident_email,
        p.name as property_name,
        rm.room_number,
        b.bed_number,
        o.currency_symbol,
        o.gst_enabled,
        o.gst_number
      FROM invoices i
      JOIN residents r ON i.resident_id = r.id
      JOIN properties p ON i.property_id = p.id
      JOIN organizations o ON i.organization_id = o.id
      LEFT JOIN rooms rm ON r.current_room_id = rm.id
      LEFT JOIN beds b ON r.current_bed_id = b.id
      WHERE i.organization_id = ?
    `;

    const params = [orgId];

    // Role check: If resident role, only show their own invoices (Rule 6)
    if (req.user.role === 'resident') {
      const myResident = db.prepare('SELECT id FROM residents WHERE user_id = ?').get(req.user.id);
      if (myResident) {
        query += ' AND i.resident_id = ?';
        params.push(myResident.id);
      }
    } else {
      if (residentId) {
        query += ' AND i.resident_id = ?';
        params.push(residentId);
      }
    }

    if (propertyId) {
      query += ' AND i.property_id = ?';
      params.push(propertyId);
    }
    if (status && status !== 'all') {
      query += ' AND i.status = ?';
      params.push(status);
    }
    if (month) {
      query += ' AND i.billing_month = ?';
      params.push(Number(month));
    }
    if (year) {
      query += ' AND i.billing_year = ?';
      params.push(Number(year));
    }
    if (search) {
      query += ' AND (i.invoice_number LIKE ? OR r.full_name LIKE ? OR rm.room_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY i.due_date DESC, i.created_at DESC';

    const invoices = db.prepare(query).all(...params);
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invoices: ' + err.message });
  }
});

// GET /api/invoices/:id (Single invoice with payment history and breakdown)
router.get('/:id', requireAuth, enforceTenant, (req, res) => {
  try {
    const orgId = req.tenantId;
    const inv = db.prepare(`
      SELECT 
        i.*,
        r.full_name as resident_name,
        r.phone as resident_phone,
        r.email as resident_email,
        r.permanent_address as resident_address,
        p.name as property_name,
        p.address as property_address,
        p.city as property_city,
        p.contact_number as property_phone,
        rm.room_number,
        b.bed_number,
        o.name as organization_name,
        o.currency_symbol,
        o.gst_enabled,
        o.gst_number
      FROM invoices i
      JOIN residents r ON i.resident_id = r.id
      JOIN properties p ON i.property_id = p.id
      JOIN organizations o ON i.organization_id = o.id
      LEFT JOIN rooms rm ON r.current_room_id = rm.id
      LEFT JOIN beds b ON r.current_bed_id = b.id
      WHERE i.id = ? AND i.organization_id = ?
    `).get(req.params.id, orgId);

    if (!inv) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    // Role check: If resident role, ensure it is their own invoice
    if (req.user.role === 'resident') {
      const myResident = db.prepare('SELECT id FROM residents WHERE user_id = ?').get(req.user.id);
      if (!myResident || myResident.id !== inv.resident_id) {
        return res.status(403).json({ error: 'Unauthorized to view this invoice.' });
      }
    }

    // Fetch payments applied to this invoice
    const payments = db.prepare(`
      SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC
    `).all(inv.id);

    res.json({
      ...inv,
      payments
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invoice details: ' + err.message });
  }
});

// POST /api/invoices (Create custom/ad-hoc invoice)
router.post('/', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager', 'accountant', 'warden', 'receptionist'), (req, res) => {
  try {
    const orgId = req.tenantId;
    const {
      propertyId, residentId,
      billingMonth = new Date().getMonth() + 1,
      billingYear = new Date().getFullYear(),
      periodStart, periodEnd,
      rentAmount = 0, electricityAmount = 0, messAmount = 0,
      laundryAmount = 0, maintenanceAmount = 0, lateFeeAmount = 0,
      discountAmount = 0, taxAmount = 0,
      dueDate, notes = 'Monthly Rent Invoice'
    } = req.body;

    if (!propertyId || !residentId || !dueDate) {
      return res.status(400).json({ error: 'Property, Resident, and Due Date are required.' });
    }

    const org = db.prepare('SELECT invoice_prefix FROM organizations WHERE id = ?').get(orgId);
    const prefix = org?.invoice_prefix || 'STAY';
    const invoiceNumber = `${prefix}-${billingYear}-${String(billingMonth).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;
    const invoiceId = `inv-${uuidv4().substring(0, 8)}`;

    const total = (Number(rentAmount) || 0) +
                  (Number(electricityAmount) || 0) +
                  (Number(messAmount) || 0) +
                  (Number(laundryAmount) || 0) +
                  (Number(maintenanceAmount) || 0) +
                  (Number(lateFeeAmount) || 0) +
                  (Number(taxAmount) || 0) -
                  (Number(discountAmount) || 0);

    if (total <= 0) {
      return res.status(400).json({ error: 'Invoice total must be greater than zero.' });
    }

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
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, 0, ?, 'pending', ?, ?
      )
    `).run(
      invoiceId, orgId, propertyId, residentId, invoiceNumber,
      Number(billingMonth), Number(billingYear),
      periodStart || `${billingYear}-${String(billingMonth).padStart(2, '0')}-01`,
      periodEnd || `${billingYear}-${String(billingMonth).padStart(2, '0')}-28`,
      Number(rentAmount) || 0, Number(electricityAmount) || 0, Number(messAmount) || 0,
      Number(laundryAmount) || 0, Number(maintenanceAmount) || 0, Number(lateFeeAmount) || 0,
      Number(discountAmount) || 0, Number(taxAmount) || 0,
      total, total, dueDate, notes
    );

    // Notify resident
    const resident = db.prepare('SELECT user_id FROM residents WHERE id = ?').get(residentId);
    if (resident?.user_id) {
      NotificationService.notify({
        organizationId: orgId,
        userId: resident.user_id,
        title: '📄 New Invoice Generated',
        message: `Invoice ${invoiceNumber} for ₹${total.toLocaleString('en-IN')} has been generated. Due date: ${dueDate}.`,
        type: 'payment_reminder',
        data: { invoiceId, amount: total, dueDate }
      });
    }

    logAudit({ user: req.user, tenantId: orgId, headers: req.headers, socket: req.socket }, {
      action: 'CREATE_INVOICE',
      entity: 'Invoice',
      entityId: invoiceId,
      newValues: { invoiceNumber, total, dueDate }
    });

    res.status(201).json({
      message: 'Invoice created successfully.',
      invoiceId,
      invoiceNumber,
      totalAmount: total
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create invoice: ' + err.message });
  }
});

// POST /api/invoices/generate-monthly (Bulk Recurring Rent Generator for all active residents)
router.post('/generate-monthly', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager', 'accountant'), (req, res) => {
  try {
    const orgId = req.tenantId;
    const { propertyId, month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.body;

    let query = "SELECT * FROM residents WHERE organization_id = ? AND status = 'active'";
    const params = [orgId];

    if (propertyId) {
      query += ' AND property_id = ?';
      params.push(propertyId);
    }

    const activeResidents = db.prepare(query).all(...params);
    const org = db.prepare('SELECT invoice_prefix FROM organizations WHERE id = ?').get(orgId);
    const prefix = org?.invoice_prefix || 'STAY';

    let generatedCount = 0;
    let skippedCount = 0;

    const bulkTx = db.transaction(() => {
      for (const res of activeResidents) {
        // Check if invoice for this month and year already exists for resident
        const existing = db.prepare(`
          SELECT id FROM invoices 
          WHERE resident_id = ? AND billing_month = ? AND billing_year = ?
        `).get(res.id, Number(month), Number(year));

        if (existing) {
          skippedCount++;
          continue;
        }

        const dueDay = res.rent_due_day || 5;
        const dueDate = `${year}-${String(month).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;
        const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
        const periodEnd = `${year}-${String(month).padStart(2, '0')}-28`;
        const invNumber = `${prefix}-${year}-${String(month).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;
        const invId = `inv-${uuidv4().substring(0, 8)}`;

        const rent = res.monthly_rent || 0;
        const discount = res.discount_amount || 0;
        const total = Math.max(0, rent - discount);

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
            0, 0, ?, 0,
            ?, 0, ?, 'pending', ?, ?
          )
        `).run(
          invId, orgId, res.property_id, res.id, invNumber,
          Number(month), Number(year), periodStart, periodEnd,
          rent, discount, total, total, dueDate, `Monthly Recurring Rent for ${month}/${year}`
        );

        if (res.user_id) {
          NotificationService.notify({
            organizationId: orgId,
            userId: res.user_id,
            title: `📄 Rent Invoice for ${month}/${year}`,
            message: `Your monthly rent invoice of ₹${total.toLocaleString('en-IN')} is ready. Due date: ${dueDate}.`,
            type: 'payment_reminder',
            data: { invoiceId: invId, amount: total, dueDate }
          });
        }

        generatedCount++;
      }
    });

    bulkTx();

    logAudit({ user: req.user, tenantId: orgId, headers: req.headers, socket: req.socket }, {
      action: 'BULK_GENERATE_INVOICES',
      entity: 'Invoice',
      newValues: { month, year, generatedCount, skippedCount }
    });

    res.json({
      message: `Generated ${generatedCount} recurring invoices successfully. (${skippedCount} already existed).`,
      generatedCount,
      skippedCount
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate monthly invoices: ' + err.message });
  }
});

module.exports = router;
