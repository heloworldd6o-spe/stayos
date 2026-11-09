const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, enforceTenant, requireRole } = require('../middleware/auth');
const NotificationService = require('../services/notificationService');
const { logAudit } = require('../services/auditService');
const { v4: uuidv4 } = require('uuid');

// GET /api/notices (List active announcements)
router.get('/', requireAuth, enforceTenant, (req, res) => {
  try {
    const orgId = req.tenantId;
    const { propertyId, priority } = req.query;

    let query = `
      SELECT 
        n.*,
        p.name as property_name
      FROM notices n
      LEFT JOIN properties p ON n.property_id = p.id
      WHERE n.organization_id = ?
    `;

    const params = [orgId];

    if (propertyId) {
      query += ' AND (n.property_id = ? OR n.property_id IS NULL)';
      params.push(propertyId);
    }
    if (priority && priority !== 'all') {
      query += ' AND n.priority = ?';
      params.push(priority);
    }

    query += " ORDER BY CASE n.priority WHEN 'urgent' THEN 1 WHEN 'important' THEN 2 ELSE 3 END, n.created_at DESC";

    const notices = db.prepare(query).all(...params);
    res.json(notices);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notices: ' + err.message });
  }
});

// POST /api/notices (Broadcast new digital notice)
router.post('/', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager', 'warden', 'accountant'), async (req, res) => {
  try {
    const orgId = req.tenantId;
    const {
      title,
      message,
      priority = 'normal',
      propertyId = null,
      targetType = 'all',
      targetId = null,
      expiresAt = null
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Notice Title and Message are required.' });
    }

    const noticeId = `notc-${uuidv4().substring(0, 8)}`;

    db.prepare(`
      INSERT INTO notices (
        id, organization_id, property_id, title, message,
        priority, target_type, target_id, expires_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      noticeId, orgId, propertyId || null, title.trim(), message.trim(),
      priority, targetType, targetId || null, expiresAt || null, req.user.full_name
    );

    // Broadcast in-app alerts to target audience
    if (propertyId) {
      await NotificationService.broadcastToPropertyResidents({
        propertyId,
        organizationId: orgId,
        title: `📢 Notice: ${title}`,
        message: message.substring(0, 120) + (message.length > 120 ? '...' : ''),
        type: 'notice',
        data: { noticeId, priority }
      });
    }

    logAudit({ user: req.user, tenantId: orgId, headers: req.headers, socket: req.socket }, {
      action: 'BROADCAST_NOTICE',
      entity: 'Notice',
      entityId: noticeId,
      newValues: { title, priority, targetType }
    });

    res.status(201).json({ message: 'Notice published and broadcasted.', noticeId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create notice: ' + err.message });
  }
});

// DELETE /api/notices/:id
router.delete('/:id', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager'), (req, res) => {
  try {
    const orgId = req.tenantId;
    db.prepare('DELETE FROM notices WHERE id = ? AND organization_id = ?').run(req.params.id, orgId);
    res.json({ message: 'Notice deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete notice: ' + err.message });
  }
});

module.exports = router;
