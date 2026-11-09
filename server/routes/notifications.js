const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

// GET /api/notifications (User notification inbox)
router.get('/', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 50
    `).all(userId);

    const unreadCount = db.prepare(`
      SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0
    `).get(userId).count;

    const parsed = notifications.map(n => ({
      ...n,
      data: JSON.parse(n.data || '{}')
    }));

    res.json({ notifications: parsed, unreadCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications: ' + err.message });
  }
});

// PUT /api/notifications/:id/read (Mark single notification as read)
router.put('/:id/read', requireAuth, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification: ' + err.message });
  }
});

// PUT /api/notifications/read-all (Mark all notifications as read)
router.put('/read-all', requireAuth, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all as read: ' + err.message });
  }
});

// GET /api/notifications/preferences
router.get('/preferences', requireAuth, (req, res) => {
  try {
    let prefs = db.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').get(req.user.id);
    if (!prefs) {
      prefs = {
        in_app_enabled: 1,
        email_enabled: 1,
        whatsapp_enabled: 1,
        sms_enabled: 0,
        food_alerts: 1,
        payment_alerts: 1,
        complaint_alerts: 1,
        notice_alerts: 1
      };
    }
    res.json(prefs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch preferences: ' + err.message });
  }
});

// PUT /api/notifications/preferences
router.put('/preferences', requireAuth, (req, res) => {
  try {
    const {
      in_app_enabled = 1,
      email_enabled = 1,
      whatsapp_enabled = 1,
      sms_enabled = 0,
      food_alerts = 1,
      payment_alerts = 1,
      complaint_alerts = 1,
      notice_alerts = 1
    } = req.body;

    const existing = db.prepare('SELECT id FROM notification_preferences WHERE user_id = ?').get(req.user.id);
    if (existing) {
      db.prepare(`
        UPDATE notification_preferences SET
          in_app_enabled = ?,
          email_enabled = ?,
          whatsapp_enabled = ?,
          sms_enabled = ?,
          food_alerts = ?,
          payment_alerts = ?,
          complaint_alerts = ?,
          notice_alerts = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(
        in_app_enabled ? 1 : 0, email_enabled ? 1 : 0, whatsapp_enabled ? 1 : 0, sms_enabled ? 1 : 0,
        food_alerts ? 1 : 0, payment_alerts ? 1 : 0, complaint_alerts ? 1 : 0, notice_alerts ? 1 : 0,
        req.user.id
      );
    } else {
      db.prepare(`
        INSERT INTO notification_preferences (
          id, user_id, in_app_enabled, email_enabled, whatsapp_enabled, sms_enabled,
          food_alerts, payment_alerts, complaint_alerts, notice_alerts
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        require('uuid').v4(), req.user.id,
        in_app_enabled ? 1 : 0, email_enabled ? 1 : 0, whatsapp_enabled ? 1 : 0, sms_enabled ? 1 : 0,
        food_alerts ? 1 : 0, payment_alerts ? 1 : 0, complaint_alerts ? 1 : 0, notice_alerts ? 1 : 0
      );
    }

    res.json({ message: 'Notification preferences updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update preferences: ' + err.message });
  }
});

module.exports = router;
