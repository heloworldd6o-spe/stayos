const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, enforceTenant, requireRole } = require('../middleware/auth');
const NotificationService = require('../services/notificationService');
const { v4: uuidv4 } = require('../utils/uuid');

// GET /api/visitors (List visitors with filters)
router.get('/', requireAuth, enforceTenant, (req, res) => {
  try {
    const orgId = req.tenantId;
    const { propertyId, status, date } = req.query;

    let query = `
      SELECT 
        v.*,
        r.full_name as resident_name,
        r.phone as resident_phone,
        rm.room_number,
        b.bed_number,
        p.name as property_name
      FROM visitors v
      JOIN residents r ON v.resident_id = r.id
      JOIN properties p ON v.property_id = p.id
      LEFT JOIN rooms rm ON r.current_room_id = rm.id
      LEFT JOIN beds b ON r.current_bed_id = b.id
      WHERE v.organization_id = ?
    `;

    const params = [orgId];

    // Role check: If resident, only show their own visitor passes
    if (req.user.role === 'resident') {
      const myResident = db.prepare('SELECT id FROM residents WHERE user_id = ?').get(req.user.id);
      if (myResident) {
        query += ' AND v.resident_id = ?';
        params.push(myResident.id);
      }
    }

    if (propertyId) {
      query += ' AND v.property_id = ?';
      params.push(propertyId);
    }
    if (status && status !== 'all') {
      query += ' AND v.status = ?';
      params.push(status);
    }
    if (date) {
      query += ' AND v.visit_date = ?';
      params.push(date);
    }

    query += ' ORDER BY v.visit_date DESC, v.created_at DESC';

    const visitors = db.prepare(query).all(...params);
    res.json(visitors);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch visitors: ' + err.message });
  }
});

// POST /api/visitors/request (Resident or Front Desk creates visitor pass request)
router.post('/request', requireAuth, enforceTenant, (req, res) => {
  try {
    const orgId = req.tenantId;
    const {
      visitorName,
      visitorPhone,
      relationship,
      purpose,
      visitDate = new Date().toISOString().split('T')[0],
      expectedTime = '04:00 PM',
      idType,
      idNumber
    } = req.body;

    let residentId = null;
    let propertyId = null;

    if (req.user.role === 'resident') {
      const resRecord = db.prepare('SELECT id, property_id FROM residents WHERE user_id = ?').get(req.user.id);
      if (!resRecord) return res.status(404).json({ error: 'Resident profile not found.' });
      residentId = resRecord.id;
      propertyId = resRecord.property_id;
    } else {
      residentId = req.body.residentId;
      propertyId = req.body.propertyId;
    }

    if (!visitorName || !visitorPhone || !relationship || !residentId || !propertyId) {
      return res.status(400).json({ error: 'Visitor Name, Phone, and Relationship are required.' });
    }

    const visitorId = `vis-${uuidv4().substring(0, 8)}`;
    const autoApprove = ['super_admin', 'owner', 'manager', 'warden', 'receptionist'].includes(req.user.role);

    db.prepare(`
      INSERT INTO visitors (
        id, organization_id, property_id, resident_id, visitor_name,
        visitor_phone, relationship, purpose, visit_date, expected_time,
        id_type, id_number, status, approved_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      visitorId, orgId, propertyId, residentId, visitorName.trim(),
      visitorPhone.trim(), relationship, purpose || 'Personal visit',
      visitDate, expectedTime, idType || 'Aadhaar', idNumber || '',
      autoApprove ? 'approved' : 'pending',
      autoApprove ? req.user.full_name : null
    );

    res.status(201).json({
      message: autoApprove ? 'Visitor pass approved.' : 'Visitor pass requested. Warden approval pending.',
      visitorId,
      status: autoApprove ? 'approved' : 'pending'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to request visitor pass: ' + err.message });
  }
});

// PUT /api/visitors/:id/status (Warden / Reception approval, check-in, check-out)
router.put('/:id/status', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager', 'warden', 'receptionist'), (req, res) => {
  try {
    const orgId = req.tenantId;
    const { status, checkInTime, checkOutTime } = req.body;

    const visitor = db.prepare(`
      SELECT v.*, r.user_id as resident_user_id, r.full_name as resident_name 
      FROM visitors v
      JOIN residents r ON v.resident_id = r.id
      WHERE v.id = ? AND v.organization_id = ?
    `).get(req.params.id, orgId);

    if (!visitor) return res.status(404).json({ error: 'Visitor record not found.' });

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    db.prepare(`
      UPDATE visitors SET
        status = ?,
        check_in_time = COALESCE(?, check_in_time),
        check_out_time = COALESCE(?, check_out_time),
        approved_by = COALESCE(?, approved_by)
      WHERE id = ?
    `).run(
      status,
      status === 'checked_in' ? (checkInTime || nowTime) : null,
      status === 'checked_out' ? (checkOutTime || nowTime) : null,
      req.user.full_name,
      req.params.id
    );

    // Notify resident if approved or checked in
    if (visitor.resident_user_id) {
      if (status === 'approved') {
        NotificationService.notify({
          organizationId: orgId,
          userId: visitor.resident_user_id,
          title: '✅ Visitor Pass Approved',
          message: `Visitor pass for ${visitor.visitor_name} has been approved by ${req.user.full_name}.`,
          type: 'visitor_approval',
          data: { visitorId: visitor.id }
        });
      } else if (status === 'checked_in') {
        NotificationService.notify({
          organizationId: orgId,
          userId: visitor.resident_user_id,
          title: '👋 Visitor Arrived at Gate',
          message: `Your visitor ${visitor.visitor_name} has arrived at the reception gate.`,
          type: 'visitor_approval',
          data: { visitorId: visitor.id }
        });
      }
    }

    res.json({ message: `Visitor status updated to ${status}.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update visitor status: ' + err.message });
  }
});

module.exports = router;
