const db = require('../db/database');
const { v4: uuidv4 } = require('uuid');

function logAudit(req, { action, entity, entityId = null, oldValues = null, newValues = null }) {
  try {
    const user = req.user || {};
    const orgId = req.tenantId || user.organization_id || null;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'StayOS Client';

    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, organization_id, user_id, user_name, action, entity, entity_id, old_values, new_values, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      uuidv4(),
      orgId,
      user.id || 'system',
      user.full_name || 'System Worker',
      action,
      entity,
      entityId ? String(entityId) : null,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      ip,
      userAgent
    );
  } catch (err) {
    console.error('⚠️ Failed to write audit log:', err.message);
  }
}

module.exports = { logAudit };
