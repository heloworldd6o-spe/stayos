const db = require('../db/database');
const { v4: uuidv4 } = require('../utils/uuid');

class NotificationService {
  /**
   * Send notification to a specific user or list of users
   */
  static async notify({ organizationId, userId, title, message, type = 'system', data = {}, channel = 'in_app' }) {
    try {
      // Check user preferences
      const prefs = db.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').get(userId);

      // Verify category preference if available
      if (prefs) {
        if (type === 'food_ready' && !prefs.food_alerts) return null;
        if (type.startsWith('payment') && !prefs.payment_alerts) return null;
        if (type.startsWith('complaint') && !prefs.complaint_alerts) return null;
        if (type === 'notice' && !prefs.notice_alerts) return null;
      }

      const id = uuidv4();
      const insert = db.prepare(`
        INSERT INTO notifications (id, organization_id, user_id, title, message, type, data, is_read, channel)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
      `);

      insert.run(id, organizationId || null, userId, title, message, type, JSON.stringify(data), channel);

      // Simulate multi-channel provider dispatch
      if (prefs?.whatsapp_enabled) {
        console.log(`📱 [WhatsApp Gateway Mock] Dispatched to user ${userId}: "${title} - ${message}"`);
      }
      if (prefs?.email_enabled) {
        console.log(`📧 [Email SMTP Mock] Dispatched to user ${userId}: "${title}"`);
      }

      return id;
    } catch (err) {
      console.error('⚠️ Notification delivery error:', err.message);
      return null;
    }
  }

  /**
   * Broadcast notification to all residents of a property
   */
  static async broadcastToPropertyResidents({ propertyId, organizationId, title, message, type = 'notice', data = {} }) {
    try {
      const residents = db.prepare(`
        SELECT user_id FROM residents WHERE property_id = ? AND status = 'active' AND user_id IS NOT NULL
      `).all(propertyId);

      for (const res of residents) {
        await this.notify({
          organizationId,
          userId: res.user_id,
          title,
          message,
          type,
          data
        });
      }
      return residents.length;
    } catch (err) {
      console.error('⚠️ Broadcast error:', err.message);
      return 0;
    }
  }
}

module.exports = NotificationService;
