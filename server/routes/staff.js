const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { requireAuth, enforceTenant, requireRole } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');
const { v4: uuidv4 } = require('../utils/uuid');

// GET /api/staff (List all staff members)
router.get('/', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager', 'accountant', 'warden'), (req, res) => {
  try {
    const orgId = req.tenantId;
    const { propertyId, role, status } = req.query;

    let query = `
      SELECT 
        s.*,
        p.name as property_name,
        u.email as user_email,
        u.avatar_url,
        (
          SELECT status FROM staff_attendance 
          WHERE staff_id = s.id AND date = date('now')
        ) as today_attendance
      FROM staff s
      JOIN properties p ON s.property_id = p.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.organization_id = ?
    `;

    const params = [orgId];

    if (propertyId) {
      query += ' AND s.property_id = ?';
      params.push(propertyId);
    }
    if (role && role !== 'all') {
      query += ' AND s.role = ?';
      params.push(role);
    }
    if (status && status !== 'all') {
      query += ' AND s.status = ?';
      params.push(status);
    }

    query += ' ORDER BY s.name ASC';

    const staff = db.prepare(query).all(...params);
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch staff: ' + err.message });
  }
});

// POST /api/staff (Add new staff member + create user login)
router.post('/', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager'), async (req, res) => {
  try {
    const orgId = req.tenantId;
    const {
      propertyId, name, phone, email, role,
      joiningDate = new Date().toISOString().split('T')[0],
      salary = 0, emergencyContact
    } = req.body;

    if (!propertyId || !name || !phone || !role) {
      return res.status(400).json({ error: 'Property, Name, Phone, and Role are required.' });
    }

    const staffId = `staff-${uuidv4().substring(0, 8)}`;
    const userId = `user-${uuidv4().substring(0, 8)}`;
    const passwordHash = await bcrypt.hash('password123', 10);

    const staffTx = db.transaction(() => {
      // 1. Create user login if email provided
      if (email) {
        const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
        if (!existingUser) {
          db.prepare(`
            INSERT INTO users (id, organization_id, role, full_name, email, phone, password_hash, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
          `).run(userId, orgId, role, name.trim(), email.trim(), phone.trim(), passwordHash);

          db.prepare(`
            INSERT INTO notification_preferences (id, user_id) VALUES (?, ?)
          `).run(uuidv4(), userId);
        }
      }

      // 2. Create staff record
      db.prepare(`
        INSERT INTO staff (
          id, organization_id, user_id, property_id, name,
          phone, email, role, joining_date, salary, emergency_contact, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `).run(
        staffId, orgId, email ? userId : null, propertyId, name.trim(),
        phone.trim(), email ? email.trim() : null, role, joiningDate,
        Number(salary) || 0, emergencyContact || null
      );
    });

    staffTx();

    logAudit({ user: req.user, tenantId: orgId, headers: req.headers, socket: req.socket }, {
      action: 'ADD_STAFF',
      entity: 'Staff',
      entityId: staffId,
      newValues: { name, role, propertyId }
    });

    res.status(201).json({ message: 'Staff member added successfully.', staffId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add staff member: ' + err.message });
  }
});

// GET /api/staff/attendance/today (Today's Attendance Roster)
router.get('/attendance/today', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager', 'warden', 'receptionist'), (req, res) => {
  try {
    const orgId = req.tenantId;
    const propertyId = req.query.propertyId;
    const todayStr = req.query.date || new Date().toISOString().split('T')[0];

    let query = `
      SELECT 
        s.id as staff_id,
        s.name,
        s.role,
        s.phone,
        p.name as property_name,
        a.id as attendance_id,
        COALESCE(a.status, 'unmarked') as status,
        a.check_in_time,
        a.check_out_time,
        a.notes
      FROM staff s
      JOIN properties p ON s.property_id = p.id
      LEFT JOIN staff_attendance a ON a.staff_id = s.id AND a.date = ?
      WHERE s.organization_id = ? AND s.status = 'active'
    `;

    const params = [todayStr, orgId];

    if (propertyId) {
      query += ' AND s.property_id = ?';
      params.push(propertyId);
    }

    query += ' ORDER BY s.name ASC';

    const roster = db.prepare(query).all(...params);
    res.json({ date: todayStr, roster });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch attendance roster: ' + err.message });
  }
});

// POST /api/staff/attendance/mark (Mark single or bulk staff attendance)
router.post('/attendance/mark', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager', 'warden', 'receptionist'), (req, res) => {
  try {
    const orgId = req.tenantId;
    const { staffId, propertyId, date = new Date().toISOString().split('T')[0], status = 'present', checkInTime, checkOutTime, notes } = req.body;

    if (!staffId || !status) {
      return res.status(400).json({ error: 'Staff ID and Status are required.' });
    }

    const propId = propertyId || db.prepare('SELECT property_id FROM staff WHERE id = ?').get(staffId)?.property_id;

    const existing = db.prepare('SELECT id FROM staff_attendance WHERE staff_id = ? AND date = ?').get(staffId, date);

    if (existing) {
      db.prepare(`
        UPDATE staff_attendance SET
          status = ?,
          check_in_time = COALESCE(?, check_in_time),
          check_out_time = COALESCE(?, check_out_time),
          notes = COALESCE(?, notes),
          recorded_by = ?
        WHERE id = ?
      `).run(status, checkInTime, checkOutTime, notes, req.user.full_name, existing.id);
    } else {
      db.prepare(`
        INSERT INTO staff_attendance (
          id, organization_id, property_id, staff_id, date,
          check_in_time, check_out_time, status, notes, recorded_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(), orgId, propId, staffId, date,
        checkInTime || '09:00 AM', checkOutTime || null, status, notes || '', req.user.full_name
      );
    }

    res.json({ message: 'Attendance marked successfully.', date, status });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark attendance: ' + err.message });
  }
});

module.exports = router;
