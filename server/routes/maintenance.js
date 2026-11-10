const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, enforceTenant, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('../utils/uuid');

// GET /api/maintenance (List maintenance tasks)
router.get('/', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager', 'warden', 'maintenance'), (req, res) => {
  try {
    const orgId = req.tenantId;
    const { propertyId, status } = req.query;

    let query = `
      SELECT 
        m.*,
        p.name as property_name,
        rm.room_number,
        s.name as assigned_staff_name,
        c.title as complaint_title
      FROM maintenance_tasks m
      JOIN properties p ON m.property_id = p.id
      LEFT JOIN rooms rm ON m.room_id = rm.id
      LEFT JOIN staff s ON m.assigned_staff_id = s.id
      LEFT JOIN complaints c ON m.complaint_id = c.id
      WHERE m.organization_id = ?
    `;

    const params = [orgId];

    if (req.user.role === 'maintenance') {
      const staffRec = db.prepare('SELECT id FROM staff WHERE user_id = ?').get(req.user.id);
      if (staffRec) {
        query += ' AND (m.assigned_staff_id = ? OR m.assigned_staff_id IS NULL)';
        params.push(staffRec.id);
      }
    }

    if (propertyId) {
      query += ' AND m.property_id = ?';
      params.push(propertyId);
    }
    if (status && status !== 'all') {
      query += ' AND m.status = ?';
      params.push(status);
    }

    query += ' ORDER BY m.created_at DESC';

    const tasks = db.prepare(query).all(...params);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch maintenance tasks: ' + err.message });
  }
});

// POST /api/maintenance (Create manual maintenance task)
router.post('/', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager', 'warden', 'maintenance'), (req, res) => {
  try {
    const orgId = req.tenantId;
    const { propertyId, title, description, roomId, assignedStaffId, priority = 'medium', estimatedCost = 0 } = req.body;

    if (!propertyId || !title) {
      return res.status(400).json({ error: 'Property and Title are required.' });
    }

    const taskId = `maint-${uuidv4().substring(0, 8)}`;

    db.prepare(`
      INSERT INTO maintenance_tasks (
        id, organization_id, property_id, title, description,
        room_id, assigned_staff_id, priority, estimated_cost, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      taskId, orgId, propertyId, title.trim(), description || '',
      roomId || null, assignedStaffId || null, priority, Number(estimatedCost) || 0
    );

    res.status(201).json({ message: 'Task created successfully.', taskId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create maintenance task: ' + err.message });
  }
});

// PUT /api/maintenance/:id (Update task status, costs, notes)
router.put('/:id', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager', 'warden', 'maintenance'), (req, res) => {
  try {
    const orgId = req.tenantId;
    const { status, actualCost, notes } = req.body;

    const task = db.prepare('SELECT * FROM maintenance_tasks WHERE id = ? AND organization_id = ?').get(req.params.id, orgId);
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const completedAt = status === 'completed' ? nowStr : null;

    db.prepare(`
      UPDATE maintenance_tasks SET
        status = COALESCE(?, status),
        actual_cost = COALESCE(?, actual_cost),
        notes = COALESCE(?, notes),
        completed_at = COALESCE(?, completed_at),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, actualCost !== undefined ? Number(actualCost) : null, notes, completedAt, req.params.id);

    res.json({ message: 'Maintenance task updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update maintenance task: ' + err.message });
  }
});

module.exports = router;
