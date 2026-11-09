const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, enforceTenant, requireRole } = require('../middleware/auth');
const CronService = require('../services/cronService');
const { logAudit } = require('../services/auditService');

// GET /api/organizations/current (Current tenant details & quota consumption)
router.get('/current', requireAuth, enforceTenant, (req, res) => {
  try {
    const orgId = req.tenantId;
    const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(orgId);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    // Quotas and usage
    const totalProperties = db.prepare('SELECT COUNT(*) as cnt FROM properties WHERE organization_id = ?').get(orgId).cnt;
    const totalBeds = db.prepare('SELECT COUNT(*) as cnt FROM beds WHERE property_id IN (SELECT id FROM properties WHERE organization_id = ?)').get(orgId).cnt;
    const totalStaff = db.prepare('SELECT COUNT(*) as cnt FROM staff WHERE organization_id = ?').get(orgId).cnt;
    const totalResidents = db.prepare("SELECT COUNT(*) as cnt FROM residents WHERE organization_id = ? AND status = 'active'").get(orgId).cnt;

    // Subscription plan details
    const plan = db.prepare('SELECT * FROM plans WHERE code = ?').get(org.subscription_plan);

    res.json({
      organization: org,
      usage: {
        properties: { current: totalProperties, max: org.max_properties },
        beds: { current: totalBeds, max: org.max_beds },
        staff: { current: totalStaff, max: org.max_staff },
        activeResidents: totalResidents
      },
      plan: plan ? { ...plan, features: JSON.parse(plan.features || '[]') } : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch organization settings: ' + err.message });
  }
});

// PUT /api/organizations/settings (Update org settings)
router.put('/settings', requireAuth, enforceTenant, requireRole('super_admin', 'owner'), (req, res) => {
  try {
    const orgId = req.tenantId;
    const {
      name, logoUrl, contactEmail, contactPhone, address,
      currency = 'INR', currencySymbol = '₹', timezone = 'Asia/Kolkata',
      invoicePrefix = 'STAY', lateFeePercentage = 2.0, lateFeeGraceDays = 5,
      gstEnabled = 0, gstNumber
    } = req.body;

    const existing = db.prepare('SELECT * FROM organizations WHERE id = ?').get(orgId);
    if (!existing) return res.status(404).json({ error: 'Organization not found.' });

    db.prepare(`
      UPDATE organizations SET
        name = COALESCE(?, name),
        logo_url = COALESCE(?, logo_url),
        contact_email = COALESCE(?, contact_email),
        contact_phone = COALESCE(?, contact_phone),
        address = COALESCE(?, address),
        currency = COALESCE(?, currency),
        currency_symbol = COALESCE(?, currency_symbol),
        timezone = COALESCE(?, timezone),
        invoice_prefix = COALESCE(?, invoice_prefix),
        late_fee_percentage = COALESCE(?, late_fee_percentage),
        late_fee_grace_days = COALESCE(?, late_fee_grace_days),
        gst_enabled = COALESCE(?, gst_enabled),
        gst_number = COALESCE(?, gst_number),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name, logoUrl, contactEmail, contactPhone, address,
      currency, currencySymbol, timezone,
      invoicePrefix, Number(lateFeePercentage) || 2.0, Number(lateFeeGraceDays) || 5,
      gstEnabled ? 1 : 0, gstNumber || null,
      orgId
    );

    logAudit({ user: req.user, tenantId: orgId, headers: req.headers, socket: req.socket }, {
      action: 'UPDATE_ORGANIZATION_SETTINGS',
      entity: 'Organization',
      entityId: orgId,
      newValues: { name, invoicePrefix, gstEnabled }
    });

    const updated = db.prepare('SELECT * FROM organizations WHERE id = ?').get(orgId);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update organization settings: ' + err.message });
  }
});

// POST /api/organizations/cron/trigger (Manual trigger for automated background reminders & invoices)
router.post('/cron/trigger', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager'), async (req, res) => {
  try {
    const results = await CronService.runDailyJobs();
    res.json({
      message: 'Background daily automation completed successfully.',
      results
    });
  } catch (err) {
    res.status(500).json({ error: 'Cron execution failed: ' + err.message });
  }
});

module.exports = router;
