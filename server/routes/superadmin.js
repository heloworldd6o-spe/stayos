const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');

// All SuperAdmin routes require 'super_admin' role
router.use(requireAuth, requireRole('super_admin'));

// GET /api/superadmin/metrics (Platform-wide metrics)
router.get('/metrics', (req, res) => {
  try {
    const totalOrganizations = db.prepare('SELECT COUNT(*) as count FROM organizations').get().count;
    const activeProperties = db.prepare("SELECT COUNT(*) as count FROM properties WHERE status = 'active'").get().count;
    const totalBeds = db.prepare('SELECT COUNT(*) as count FROM beds').get().count;
    const occupiedBeds = db.prepare("SELECT COUNT(*) as count FROM beds WHERE status = 'occupied'").get().count;
    const totalResidents = db.prepare("SELECT COUNT(*) as count FROM residents WHERE status = 'active'").get().count;
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get().count;
    const totalPaymentsProcessed = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'successful'").get().total;

    const planBreakdown = db.prepare(`
      SELECT subscription_plan, COUNT(*) as count 
      FROM organizations 
      GROUP BY subscription_plan
    `).all();

    const recentSignups = db.prepare(`
      SELECT o.*, u.full_name as owner_name, u.email as owner_email
      FROM organizations o
      LEFT JOIN users u ON u.organization_id = o.id AND u.role = 'owner'
      ORDER BY o.created_at DESC
      LIMIT 10
    `).all();

    res.json({
      totalOrganizations,
      activeProperties,
      totalBeds,
      occupiedBeds,
      totalResidents,
      totalUsers,
      totalPaymentsProcessed,
      planBreakdown,
      recentSignups
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch platform metrics: ' + err.message });
  }
});

// GET /api/superadmin/organizations (List all tenant organizations)
router.get('/organizations', (req, res) => {
  try {
    const orgs = db.prepare(`
      SELECT 
        o.*,
        u.full_name as owner_name,
        u.email as owner_email,
        u.phone as owner_phone,
        (SELECT COUNT(*) FROM properties WHERE organization_id = o.id) as property_count,
        (SELECT COUNT(*) FROM beds WHERE property_id IN (SELECT id FROM properties WHERE organization_id = o.id)) as bed_count,
        (SELECT COUNT(*) FROM residents WHERE organization_id = o.id AND status = 'active') as resident_count
      FROM organizations o
      LEFT JOIN users u ON u.organization_id = o.id AND u.role = 'owner'
      ORDER BY o.created_at DESC
    `).all();

    res.json(orgs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch organizations: ' + err.message });
  }
});

// PUT /api/superadmin/organizations/:id/status (Suspend or reactivate tenant)
router.put('/organizations/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended', 'trial', 'past_due'].includes(status)) {
      return res.status(400).json({ error: 'Invalid subscription status.' });
    }

    const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    db.prepare(`
      UPDATE organizations SET
        subscription_status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, req.params.id);

    logAudit({ user: req.user, headers: req.headers, socket: req.socket }, {
      action: status === 'suspended' ? 'SUSPEND_ORGANIZATION' : 'REACTIVATE_ORGANIZATION',
      entity: 'Organization',
      entityId: req.params.id,
      newValues: { status }
    });

    res.json({ message: `Organization ${org.name} marked as ${status}.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update organization status: ' + err.message });
  }
});

// GET /api/superadmin/plans (List SaaS Pricing Plans)
router.get('/plans', (req, res) => {
  try {
    const plans = db.prepare('SELECT * FROM plans ORDER BY price_monthly ASC').all();
    const parsed = plans.map(p => ({
      ...p,
      features: JSON.parse(p.features || '[]')
    }));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch plans: ' + err.message });
  }
});

// GET /api/superadmin/audit-logs (Platform-wide audit trail)
router.get('/audit-logs', (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT a.*, o.name as organization_name
      FROM audit_logs a
      LEFT JOIN organizations o ON a.organization_id = o.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `).all();

    const parsed = logs.map(l => ({
      ...l,
      old_values: l.old_values ? JSON.parse(l.old_values) : null,
      new_values: l.new_values ? JSON.parse(l.new_values) : null
    }));

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs: ' + err.message });
  }
});

module.exports = router;
