const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, enforceTenant, requireRole } = require('../middleware/auth');
const PaymentService = require('../services/paymentService');
const { logAudit } = require('../services/auditService');

// GET /api/payments (List payments with filters)
router.get('/', requireAuth, enforceTenant, (req, res) => {
  try {
    const orgId = req.tenantId;
    const { propertyId, residentId, method, status, search } = req.query;

    let query = `
      SELECT 
        p.*,
        r.full_name as resident_name,
        r.phone as resident_phone,
        prop.name as property_name,
        rm.room_number,
        b.bed_number,
        i.invoice_number,
        o.currency_symbol
      FROM payments p
      JOIN residents r ON p.resident_id = r.id
      JOIN properties prop ON p.property_id = prop.id
      JOIN organizations o ON p.organization_id = o.id
      LEFT JOIN rooms rm ON r.current_room_id = rm.id
      LEFT JOIN beds b ON r.current_bed_id = b.id
      LEFT JOIN invoices i ON p.invoice_id = i.id
      WHERE p.organization_id = ?
    `;

    const params = [orgId];

    // Role check: If resident, only show their own payments
    if (req.user.role === 'resident') {
      const myResident = db.prepare('SELECT id FROM residents WHERE user_id = ?').get(req.user.id);
      if (myResident) {
        query += ' AND p.resident_id = ?';
        params.push(myResident.id);
      }
    } else {
      if (residentId) {
        query += ' AND p.resident_id = ?';
        params.push(residentId);
      }
    }

    if (propertyId) {
      query += ' AND p.property_id = ?';
      params.push(propertyId);
    }
    if (method) {
      query += ' AND p.payment_method = ?';
      params.push(method);
    }
    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (p.receipt_number LIKE ? OR p.transaction_id LIKE ? OR r.full_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY p.payment_date DESC, p.created_at DESC';

    const payments = db.prepare(query).all(...params);
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payments: ' + err.message });
  }
});

// GET /api/payments/:id/receipt (Official printable receipt)
router.get('/:id/receipt', requireAuth, enforceTenant, (req, res) => {
  try {
    const orgId = req.tenantId;
    const payment = db.prepare(`
      SELECT 
        p.*,
        r.full_name as resident_name,
        r.phone as resident_phone,
        r.email as resident_email,
        r.permanent_address as resident_address,
        prop.name as property_name,
        prop.address as property_address,
        prop.city as property_city,
        prop.contact_number as property_contact,
        rm.room_number,
        b.bed_number,
        i.invoice_number,
        i.billing_month,
        i.billing_year,
        i.total_amount as invoice_total,
        i.balance_amount as remaining_balance,
        o.name as organization_name,
        o.logo_url as organization_logo,
        o.contact_email as organization_email,
        o.contact_phone as organization_phone,
        o.currency_symbol,
        o.gst_enabled,
        o.gst_number
      FROM payments p
      JOIN residents r ON p.resident_id = r.id
      JOIN properties prop ON p.property_id = prop.id
      JOIN organizations o ON p.organization_id = o.id
      LEFT JOIN rooms rm ON r.current_room_id = rm.id
      LEFT JOIN beds b ON r.current_bed_id = b.id
      LEFT JOIN invoices i ON p.invoice_id = i.id
      WHERE p.id = ? AND p.organization_id = ?
    `).get(req.params.id, orgId);

    if (!payment) {
      return res.status(404).json({ error: 'Payment receipt not found.' });
    }

    // Role check: If resident, ensure ownership
    if (req.user.role === 'resident') {
      const myResident = db.prepare('SELECT id FROM residents WHERE user_id = ?').get(req.user.id);
      if (!myResident || myResident.id !== payment.resident_id) {
        return res.status(403).json({ error: 'Unauthorized to view this receipt.' });
      }
    }

    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment receipt: ' + err.message });
  }
});

// POST /api/payments/create-order (Create verified payment gateway order for online/UPI checkout)
router.post('/create-order', requireAuth, enforceTenant, (req, res) => {
  try {
    const orgId = req.tenantId;
    const { invoiceId, amount } = req.body;

    // Identify resident
    let residentId = null;
    if (req.user.role === 'resident') {
      const resRecord = db.prepare('SELECT id FROM residents WHERE user_id = ?').get(req.user.id);
      if (!resRecord) return res.status(404).json({ error: 'Resident profile not found.' });
      residentId = resRecord.id;
    } else {
      residentId = req.body.residentId;
    }

    if (!invoiceId || !residentId) {
      return res.status(400).json({ error: 'Invoice ID and Resident ID are required.' });
    }

    const orderData = PaymentService.createPaymentOrder({
      organizationId: orgId,
      propertyId: req.body.propertyId,
      residentId,
      invoiceId,
      amount
    });

    res.json(orderData);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/payments/verify (Server-side payment verification & atomic settlement)
router.post('/verify', requireAuth, enforceTenant, (req, res) => {
  try {
    const orgId = req.tenantId;
    const {
      invoiceId,
      amount,
      paymentMethod = 'upi',
      gatewayOrderId,
      gatewayPaymentId,
      gatewaySignature
    } = req.body;

    let residentId = null;
    if (req.user.role === 'resident') {
      const resRecord = db.prepare('SELECT id FROM residents WHERE user_id = ?').get(req.user.id);
      if (!resRecord) return res.status(404).json({ error: 'Resident profile not found.' });
      residentId = resRecord.id;
    } else {
      residentId = req.body.residentId;
    }

    const result = PaymentService.verifyAndProcessPayment({
      organizationId: orgId,
      propertyId: req.body.propertyId,
      residentId,
      invoiceId,
      amount,
      paymentMethod,
      gatewayOrderId,
      gatewayPaymentId,
      gatewaySignature,
      recordedBy: req.user.full_name || 'Online Gateway Verified'
    });

    logAudit({ user: req.user, tenantId: orgId, headers: req.headers, socket: req.socket }, {
      action: 'PAYMENT_VERIFIED_SUCCESS',
      entity: 'Payment',
      entityId: result.paymentId,
      newValues: {
        receiptNumber: result.receiptNumber,
        amount: result.amount,
        method: paymentMethod,
        invoiceNumber: result.invoiceNumber
      }
    });

    res.json({
      success: true,
      message: 'Payment verified and settled successfully.',
      ...result
    });
  } catch (err) {
    res.status(400).json({ error: 'Payment verification failed: ' + err.message });
  }
});

// POST /api/payments/record-offline (Record Cash / Bank Transfer / UPI at desk)
router.post('/record-offline', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager', 'accountant', 'receptionist'), (req, res) => {
  try {
    const orgId = req.tenantId;
    const {
      residentId,
      invoiceId,
      amount,
      paymentMethod = 'cash',
      transactionReference,
      notes
    } = req.body;

    if (!residentId || !invoiceId || !amount) {
      return res.status(400).json({ error: 'Resident, Invoice, and Amount are required.' });
    }

    const result = PaymentService.verifyAndProcessPayment({
      organizationId: orgId,
      residentId,
      invoiceId,
      amount: Number(amount),
      paymentMethod,
      gatewayPaymentId: transactionReference || null,
      recordedBy: `${req.user.full_name} (${req.user.role})`
    });

    logAudit({ user: req.user, tenantId: orgId, headers: req.headers, socket: req.socket }, {
      action: 'RECORD_OFFLINE_PAYMENT',
      entity: 'Payment',
      entityId: result.paymentId,
      newValues: {
        receiptNumber: result.receiptNumber,
        amount: Number(amount),
        method: paymentMethod
      }
    });

    res.status(201).json({
      success: true,
      message: 'Offline payment recorded and receipt generated.',
      ...result
    });
  } catch (err) {
    res.status(400).json({ error: 'Failed to record payment: ' + err.message });
  }
});

module.exports = router;
