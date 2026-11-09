const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, enforceTenant, requireRole } = require('../middleware/auth');
const NotificationService = require('../services/notificationService');
const { logAudit } = require('../services/auditService');
const { v4: uuidv4 } = require('uuid');

// GET /api/complaints (List complaints with category, priority, status filters)
router.get('/', requireAuth, enforceTenant, (req, res) => {
  try {
    const orgId = req.tenantId;
    const { propertyId, status, category, priority, residentId } = req.query;

    let query = `
      SELECT 
        c.*,
        r.full_name as resident_name,
        r.phone as resident_phone,
        rm.room_number,
        p.name as property_name,
        s.name as assigned_staff_name
      FROM complaints c
      JOIN residents r ON c.resident_id = r.id
      JOIN properties p ON c.property_id = p.id
      LEFT JOIN rooms rm ON c.room_id = rm.id
      LEFT JOIN staff s ON c.assigned_to_staff_id = s.id
      WHERE c.organization_id = ?
    `;

    const params = [orgId];

    // Role check: If resident, only show their own complaints
    if (req.user.role === 'resident') {
      const myResident = db.prepare('SELECT id FROM residents WHERE user_id = ?').get(req.user.id);
      if (myResident) {
        query += ' AND c.resident_id = ?';
        params.push(myResident.id);
      }
    } else if (req.user.role === 'maintenance') {
      // If maintenance staff, show assigned complaints or all open complaints
      const staffRec = db.prepare('SELECT id FROM staff WHERE user_id = ?').get(req.user.id);
      if (staffRec) {
        query += ' AND (c.assigned_to_staff_id = ? OR c.assigned_to_staff_id IS NULL)';
        params.push(staffRec.id);
      }
    } else {
      if (residentId) {
        query += ' AND c.resident_id = ?';
        params.push(residentId);
      }
    }

    if (propertyId) {
      query += ' AND c.property_id = ?';
      params.push(propertyId);
    }
    if (status && status !== 'all') {
      query += ' AND c.status = ?';
      params.push(status);
    }
    if (category && category !== 'all') {
      query += ' AND c.category = ?';
      params.push(category);
    }
    if (priority) {
      query += ' AND c.priority = ?';
      params.push(priority);
    }

    query += ' ORDER BY CASE c.status WHEN "submitted" THEN 1 WHEN "assigned" THEN 2 WHEN "in_progress" THEN 3 ELSE 4 END, c.created_at DESC';

    const complaints = db.prepare(query).all(...params);
    const parsed = complaints.map(c => ({
      ...c,
      photos: JSON.parse(c.photos || '[]')
    }));

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch complaints: ' + err.message });
  }
});

// POST /api/complaints (Submit new complaint)
router.post('/', requireAuth, enforceTenant, (req, res) => {
  try {
    const orgId = req.tenantId;
    const {
      propertyId,
      category,
      title,
      description,
      priority = 'medium',
      photos = []
    } = req.body;

    let residentId = null;
    let roomId = null;
    let propId = propertyId;

    if (req.user.role === 'resident') {
      const resRecord = db.prepare('SELECT id, property_id, current_room_id FROM residents WHERE user_id = ?').get(req.user.id);
      if (!resRecord) return res.status(404).json({ error: 'Resident profile not found.' });
      residentId = resRecord.id;
      roomId = resRecord.current_room_id;
      propId = resRecord.property_id;
    } else {
      residentId = req.body.residentId;
      roomId = req.body.roomId;
    }

    if (!propId || !residentId || !category || !title || !description) {
      return res.status(400).json({ error: 'Please provide Category, Title, and Description.' });
    }

    const complaintId = `comp-${uuidv4().substring(0, 8)}`;

    db.prepare(`
      INSERT INTO complaints (
        id, organization_id, property_id, resident_id, room_id,
        category, title, description, photos, priority, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted')
    `).run(
      complaintId, orgId, propId, residentId, roomId || null,
      category, title.trim(), description.trim(),
      JSON.stringify(photos), priority
    );

    // Notify managers & wardens of the property
    const staffManagers = db.prepare(`
      SELECT user_id FROM staff 
      WHERE property_id = ? AND role IN ('manager', 'warden', 'maintenance') AND user_id IS NOT NULL
    `).all(propId);

    for (const sm of staffManagers) {
      NotificationService.notify({
        organizationId: orgId,
        userId: sm.user_id,
        title: `🛠️ New ${priority.toUpperCase()} Complaint: ${title}`,
        message: `${req.user.full_name} submitted a ${category} complaint: "${title}".`,
        type: 'complaint_update',
        data: { complaintId, priority, category }
      });
    }

    logAudit({ user: req.user, tenantId: orgId, headers: req.headers, socket: req.socket }, {
      action: 'SUBMIT_COMPLAINT',
      entity: 'Complaint',
      entityId: complaintId,
      newValues: { category, title, priority }
    });

    res.status(201).json({
      message: 'Complaint submitted successfully.',
      complaintId
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit complaint: ' + err.message });
  }
});

// PUT /api/complaints/:id/assign (Assign staff member & create maintenance task)
router.put('/:id/assign', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager', 'warden'), (req, res) => {
  try {
    const orgId = req.tenantId;
    const { staffId } = req.body;

    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ? AND organization_id = ?').get(req.params.id, orgId);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

    const staff = db.prepare('SELECT * FROM staff WHERE id = ?').get(staffId);
    if (!staff) return res.status(404).json({ error: 'Staff member not found.' });

    const assignTx = db.transaction(() => {
      // 1. Update complaint status
      db.prepare(`
        UPDATE complaints 
        SET status = 'assigned', assigned_to_staff_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(staffId, req.params.id);

      // 2. Create or update linked maintenance task
      const existingTask = db.prepare('SELECT id FROM maintenance_tasks WHERE complaint_id = ?').get(req.params.id);
      if (!existingTask) {
        db.prepare(`
          INSERT INTO maintenance_tasks (
            id, organization_id, property_id, complaint_id, title,
            description, room_id, assigned_staff_id, priority, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_progress')
        `).run(
          uuidv4(), orgId, complaint.property_id, complaint.id, complaint.title,
          complaint.description, complaint.room_id, staffId, complaint.priority
        );
      }
    });

    assignTx();

    // Notify assigned staff
    if (staff.user_id) {
      NotificationService.notify({
        organizationId: orgId,
        userId: staff.user_id,
        title: `🛠️ Task Assigned: ${complaint.title}`,
        message: `You have been assigned to resolve ticket #${complaint.id}. Priority: ${complaint.priority}.`,
        type: 'maintenance_update',
        data: { complaintId: complaint.id }
      });
    }

    // Notify resident
    const resident = db.prepare('SELECT user_id FROM residents WHERE id = ?').get(complaint.resident_id);
    if (resident?.user_id) {
      NotificationService.notify({
        organizationId: orgId,
        userId: resident.user_id,
        title: `🛠️ Ticket Assigned to ${staff.name}`,
        message: `Your complaint "${complaint.title}" has been assigned to our staff ${staff.name}.`,
        type: 'complaint_update',
        data: { complaintId: complaint.id }
      });
    }

    res.json({ message: `Assigned to ${staff.name} successfully.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign complaint: ' + err.message });
  }
});

// PUT /api/complaints/:id/status (Update status to in_progress, resolved, closed)
router.put('/:id/status', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager', 'warden', 'maintenance'), (req, res) => {
  try {
    const orgId = req.tenantId;
    const { status, resolutionNotes, actualCost = 0 } = req.body;

    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ? AND organization_id = ?').get(req.params.id, orgId);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const resolvedAt = (status === 'resolved' || status === 'closed') ? nowStr : null;

    const updateTx = db.transaction(() => {
      db.prepare(`
        UPDATE complaints SET
          status = ?,
          resolution_notes = COALESCE(?, resolution_notes),
          resolved_at = COALESCE(?, resolved_at),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, resolutionNotes, resolvedAt, req.params.id);

      // Update maintenance task
      db.prepare(`
        UPDATE maintenance_tasks SET
          status = ?,
          actual_cost = COALESCE(?, actual_cost),
          notes = COALESCE(?, notes),
          completed_at = COALESCE(?, completed_at),
          updated_at = CURRENT_TIMESTAMP
        WHERE complaint_id = ?
      `).run(
        status === 'resolved' || status === 'closed' ? 'completed' : 'in_progress',
        Number(actualCost) || null,
        resolutionNotes,
        resolvedAt,
        req.params.id
      );
    });

    updateTx();

    // Notify resident of resolution
    const resident = db.prepare('SELECT user_id FROM residents WHERE id = ?').get(complaint.resident_id);
    if (resident?.user_id && (status === 'resolved' || status === 'closed')) {
      NotificationService.notify({
        organizationId: orgId,
        userId: resident.user_id,
        title: `✅ Complaint Resolved: ${complaint.title}`,
        message: `Your complaint has been marked as resolved: ${resolutionNotes || 'Repairs completed.'}`,
        type: 'complaint_update',
        data: { complaintId: complaint.id, status }
      });
    }

    logAudit({ user: req.user, tenantId: orgId, headers: req.headers, socket: req.socket }, {
      action: 'RESOLVE_COMPLAINT',
      entity: 'Complaint',
      entityId: req.params.id,
      newValues: { status, resolutionNotes }
    });

    res.json({ message: `Complaint status updated to ${status}.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update complaint status: ' + err.message });
  }
});

module.exports = router;
