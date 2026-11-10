const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { requireAuth, enforceTenant, requireRole } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');
const { v4: uuidv4 } = require('../utils/uuid');

// GET /api/residents (List residents with search, property filter, status filter)
router.get('/', requireAuth, enforceTenant, (req, res) => {
  try {
    const orgId = req.tenantId;
    const { propertyId, status = 'active', search } = req.query;

    let query = `
      SELECT 
        r.*,
        p.name as property_name,
        rm.room_number,
        rm.room_type,
        b.bed_number,
        bldg.name as building_name,
        f.floor_name,
        (
          SELECT COALESCE(SUM(balance_amount), 0) 
          FROM invoices 
          WHERE resident_id = r.id AND status IN ('pending', 'partially_paid', 'overdue')
        ) as total_outstanding
      FROM residents r
      JOIN properties p ON r.property_id = p.id
      LEFT JOIN rooms rm ON r.current_room_id = rm.id
      LEFT JOIN beds b ON r.current_bed_id = b.id
      LEFT JOIN buildings bldg ON rm.building_id = bldg.id
      LEFT JOIN floors f ON rm.floor_id = f.id
      WHERE r.organization_id = ?
    `;

    const params = [orgId];

    if (propertyId) {
      query += ' AND r.property_id = ?';
      params.push(propertyId);
    }
    if (status && status !== 'all') {
      query += ' AND r.status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (r.full_name LIKE ? OR r.phone LIKE ? OR r.email LIKE ? OR rm.room_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY r.created_at DESC';

    const residents = db.prepare(query).all(...params);
    res.json(residents);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch residents: ' + err.message });
  }
});

// GET /api/residents/:id (Get full resident profile with invoices, payments, complaints)
router.get('/:id', requireAuth, enforceTenant, (req, res) => {
  try {
    const orgId = req.tenantId;
    const residentId = req.params.id;

    // Authorization check: If logged in as resident, ensure they can only view their own profile (Rule 6)
    if (req.user.role === 'resident') {
      const myResident = db.prepare('SELECT id FROM residents WHERE user_id = ?').get(req.user.id);
      if (!myResident || myResident.id !== residentId) {
        return res.status(403).json({ error: 'Unauthorized. You can only view your own resident profile.' });
      }
    }

    const resident = db.prepare(`
      SELECT 
        r.*,
        p.name as property_name,
        p.address as property_address,
        p.city as property_city,
        rm.room_number,
        rm.room_type,
        rm.ac_type,
        rm.bathroom_type,
        b.bed_number,
        bldg.name as building_name,
        f.floor_name
      FROM residents r
      JOIN properties p ON r.property_id = p.id
      LEFT JOIN rooms rm ON r.current_room_id = rm.id
      LEFT JOIN beds b ON r.current_bed_id = b.id
      LEFT JOIN buildings bldg ON rm.building_id = bldg.id
      LEFT JOIN floors f ON rm.floor_id = f.id
      WHERE r.id = ? AND r.organization_id = ?
    `).get(residentId, orgId);

    if (!resident) {
      return res.status(404).json({ error: 'Resident not found.' });
    }

    // Invoices
    const invoices = db.prepare(`
      SELECT * FROM invoices WHERE resident_id = ? ORDER BY due_date DESC
    `).all(residentId);

    // Payments
    const payments = db.prepare(`
      SELECT * FROM payments WHERE resident_id = ? ORDER BY payment_date DESC
    `).all(residentId);

    // Complaints
    const complaints = db.prepare(`
      SELECT * FROM complaints WHERE resident_id = ? ORDER BY created_at DESC
    `).all(residentId);

    // Documents
    const documents = db.prepare(`
      SELECT * FROM resident_documents WHERE resident_id = ? ORDER BY created_at DESC
    `).all(residentId);

    // Stay history
    const stayHistory = db.prepare(`
      SELECT 
        ra.*,
        rm.room_number,
        b.bed_number,
        p.name as property_name
      FROM room_allocations ra
      JOIN rooms rm ON ra.room_id = rm.id
      JOIN beds b ON ra.bed_id = b.id
      JOIN properties p ON ra.property_id = p.id
      WHERE ra.resident_id = ?
      ORDER BY ra.start_date DESC
    `).all(residentId);

    // Calculate outstanding
    const outstanding = invoices.reduce((acc, inv) => acc + (inv.balance_amount || 0), 0);

    // Roommates sharing the room
    const roommates = resident.current_room_id ? db.prepare(`
      SELECT r.id, r.full_name, r.phone, b.bed_number
      FROM residents r
      LEFT JOIN beds b ON r.current_bed_id = b.id
      WHERE r.current_room_id = ? AND r.id != ? AND r.status = 'active'
    `).all(resident.current_room_id, residentId) : [];

    res.json({
      ...resident,
      outstanding,
      invoices,
      payments,
      complaints,
      documents,
      stayHistory,
      roommates
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch resident details: ' + err.message });
  }
});

// PUT /api/residents/:id (Update resident profile)
router.put('/:id', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager', 'receptionist'), (req, res) => {
  try {
    const orgId = req.tenantId;
    const {
      fullName, gender, dob, phone, email,
      emergencyContactName, emergencyContactPhone, emergencyContactRelation,
      permanentAddress, idType, idNumber, occupation,
      organizationOrCollege, foodPreference, medicalNotes,
      monthlyRent, depositAmount, rentDueDay, status
    } = req.body;

    const existing = db.prepare('SELECT * FROM residents WHERE id = ? AND organization_id = ?').get(req.params.id, orgId);
    if (!existing) {
      return res.status(404).json({ error: 'Resident not found.' });
    }

    db.prepare(`
      UPDATE residents SET
        full_name = COALESCE(?, full_name),
        gender = COALESCE(?, gender),
        dob = COALESCE(?, dob),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        emergency_contact_name = COALESCE(?, emergency_contact_name),
        emergency_contact_phone = COALESCE(?, emergency_contact_phone),
        emergency_contact_relation = COALESCE(?, emergency_contact_relation),
        permanent_address = COALESCE(?, permanent_address),
        id_type = COALESCE(?, id_type),
        id_number = COALESCE(?, id_number),
        occupation = COALESCE(?, occupation),
        organization_or_college = COALESCE(?, organization_or_college),
        food_preference = COALESCE(?, food_preference),
        medical_notes = COALESCE(?, medical_notes),
        monthly_rent = COALESCE(?, monthly_rent),
        deposit_amount = COALESCE(?, deposit_amount),
        rent_due_day = COALESCE(?, rent_due_day),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      fullName, gender, dob, phone, email,
      emergencyContactName, emergencyContactPhone, emergencyContactRelation,
      permanentAddress, idType, idNumber, occupation,
      organizationOrCollege, foodPreference, medicalNotes,
      monthlyRent ? Number(monthlyRent) : null,
      depositAmount ? Number(depositAmount) : null,
      rentDueDay ? Number(rentDueDay) : null,
      status,
      req.params.id
    );

    logAudit({ user: req.user, tenantId: orgId, headers: req.headers, socket: req.socket }, {
      action: 'UPDATE_RESIDENT',
      entity: 'Resident',
      entityId: req.params.id,
      newValues: { fullName, status }
    });

    res.json({ message: 'Resident profile updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update resident: ' + err.message });
  }
});

module.exports = router;
