const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, enforceTenant, requireRole } = require('../middleware/auth');
const NotificationService = require('../services/notificationService');
const { logAudit } = require('../services/auditService');
const { v4: uuidv4 } = require('../utils/uuid');

// GET /api/meals/schedule (Weekly Meal Schedule)
router.get('/schedule', requireAuth, enforceTenant, (req, res) => {
  try {
    const orgId = req.tenantId;
    let propertyId = req.query.propertyId;

    if (!propertyId) {
      // Find property of user or first property in org
      if (req.user.role === 'resident') {
        const resRec = db.prepare('SELECT property_id FROM residents WHERE user_id = ?').get(req.user.id);
        propertyId = resRec?.property_id;
      } else {
        const prop = db.prepare('SELECT id FROM properties WHERE organization_id = ? LIMIT 1').get(orgId);
        propertyId = prop?.id;
      }
    }

    if (!propertyId) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    const plans = db.prepare(`
      SELECT * FROM meal_plans WHERE property_id = ? ORDER BY day_of_week, meal_type
    `).all(propertyId);

    const parsed = plans.map(p => ({
      ...p,
      menu_items: JSON.parse(p.menu_items || '[]')
    }));

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch meal schedule: ' + err.message });
  }
});

// PUT /api/meals/schedule (Update Weekly Meal Plan item)
router.put('/schedule', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager', 'chef'), (req, res) => {
  try {
    const { propertyId, dayOfWeek, mealType, menuTitle, menuItems = [], timing } = req.body;

    if (!propertyId || !dayOfWeek || !mealType || !menuTitle) {
      return res.status(400).json({ error: 'Property, Day of Week, Meal Type, and Menu Title are required.' });
    }

    const existing = db.prepare(`
      SELECT id FROM meal_plans WHERE property_id = ? AND day_of_week = ? AND meal_type = ?
    `).get(propertyId, dayOfWeek.toLowerCase(), mealType.toLowerCase());

    if (existing) {
      db.prepare(`
        UPDATE meal_plans SET
          menu_title = ?,
          menu_items = ?,
          timing = ?
        WHERE id = ?
      `).run(menuTitle, JSON.stringify(menuItems), timing, existing.id);
    } else {
      db.prepare(`
        INSERT INTO meal_plans (id, property_id, day_of_week, meal_type, menu_title, menu_items, timing)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), propertyId, dayOfWeek.toLowerCase(), mealType.toLowerCase(), menuTitle, JSON.stringify(menuItems), timing);
    }

    res.json({ message: 'Meal plan updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update meal plan: ' + err.message });
  }
});

// GET /api/meals/daily-status (Today's live meal preparation & headcounts for Chef & Residents)
router.get('/daily-status', requireAuth, enforceTenant, (req, res) => {
  try {
    const orgId = req.tenantId;
    let propertyId = req.query.propertyId;
    const todayStr = req.query.date || new Date().toISOString().split('T')[0];
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = daysOfWeek[new Date(todayStr).getDay()];

    if (!propertyId) {
      if (req.user.role === 'resident') {
        const resRec = db.prepare('SELECT property_id FROM residents WHERE user_id = ?').get(req.user.id);
        propertyId = resRec?.property_id;
      } else {
        const prop = db.prepare('SELECT id FROM properties WHERE organization_id = ? LIMIT 1').get(orgId);
        propertyId = prop?.id;
      }
    }

    if (!propertyId) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    // Active residents count in this property
    const totalActiveResidents = db.prepare(`
      SELECT COUNT(*) as cnt FROM residents WHERE property_id = ? AND status = 'active'
    `).get(propertyId).cnt;

    const mealTypes = ['breakfast', 'lunch', 'snacks', 'dinner'];
    const results = [];

    for (const mType of mealTypes) {
      // Find today's plan menu
      const plan = db.prepare(`
        SELECT * FROM meal_plans WHERE property_id = ? AND day_of_week = ? AND meal_type = ?
      `).get(propertyId, currentDay, mType);

      // Find status record
      let statusRec = db.prepare(`
        SELECT * FROM meal_daily_status WHERE property_id = ? AND date = ? AND meal_type = ?
      `).get(propertyId, todayStr, mType);

      // Opt-out count
      const optOuts = db.prepare(`
        SELECT COUNT(*) as count FROM meal_opt_outs WHERE property_id = ? AND date = ? AND meal_type = ? AND is_opted_out = 1
      `).get(propertyId, todayStr, mType)?.count || 0;

      // Guest count
      const guests = db.prepare(`
        SELECT COALESCE(SUM(guest_count), 0) as total FROM meal_opt_outs WHERE property_id = ? AND date = ? AND meal_type = ?
      `).get(propertyId, todayStr, mType)?.total || 0;

      const expectedCount = Math.max(0, totalActiveResidents - optOuts + guests);

      if (!statusRec) {
        const statusId = uuidv4();
        db.prepare(`
          INSERT INTO meal_daily_status (id, property_id, date, meal_type, expected_count, opted_out_count, guest_count, served_count, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'pending')
        `).run(statusId, propertyId, todayStr, mType, expectedCount, optOuts, guests);

        statusRec = {
          id: statusId,
          property_id: propertyId,
          date: todayStr,
          meal_type: mType,
          expected_count: expectedCount,
          opted_out_count: optOuts,
          guest_count: guests,
          served_count: 0,
          status: 'pending',
          ready_at: null,
          notes: null
        };
      }

      // Check if logged in resident has opted out for this meal
      let myOptOut = null;
      if (req.user.role === 'resident') {
        const residentRec = db.prepare('SELECT id FROM residents WHERE user_id = ?').get(req.user.id);
        if (residentRec) {
          myOptOut = db.prepare(`
            SELECT * FROM meal_opt_outs WHERE resident_id = ? AND property_id = ? AND date = ? AND meal_type = ?
          `).get(residentRec.id, propertyId, todayStr, mType);
        }
      }

      results.push({
        mealType: mType,
        title: plan?.menu_title || `${mType.toUpperCase()} Special`,
        menuItems: plan ? JSON.parse(plan.menu_items || '[]') : [],
        timing: plan?.timing || '',
        status: statusRec.status,
        readyAt: statusRec.ready_at,
        expectedCount,
        optedOutCount: optOuts,
        guestCount: guests,
        servedCount: statusRec.served_count,
        notes: statusRec.notes,
        isMyOptedOut: !!myOptOut?.is_opted_out,
        myGuestCount: myOptOut?.guest_count || 0
      });
    }

    res.json({
      date: todayStr,
      day: currentDay,
      totalResidents: totalActiveResidents,
      meals: results
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch daily meal status: ' + err.message });
  }
});

// PUT /api/meals/status (Chef updates status to preparing, ready, completed)
router.put('/status', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager', 'chef', 'kitchen_staff'), async (req, res) => {
  try {
    const orgId = req.tenantId;
    const { propertyId, date = new Date().toISOString().split('T')[0], mealType, status, notes } = req.body;

    if (!propertyId || !mealType || !status) {
      return res.status(400).json({ error: 'Property, Meal Type, and Status are required.' });
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const readyAt = status === 'ready' ? nowStr : null;

    const existing = db.prepare(`
      SELECT * FROM meal_daily_status WHERE property_id = ? AND date = ? AND meal_type = ?
    `).get(propertyId, date, mealType.toLowerCase());

    if (existing) {
      db.prepare(`
        UPDATE meal_daily_status SET
          status = ?,
          ready_at = COALESCE(?, ready_at),
          chef_id = ?,
          notes = COALESCE(?, notes)
        WHERE id = ?
      `).run(status, readyAt, req.user.id, notes, existing.id);
    } else {
      db.prepare(`
        INSERT INTO meal_daily_status (id, property_id, date, meal_type, status, ready_at, chef_id, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), propertyId, date, mealType.toLowerCase(), status, readyAt, req.user.id, notes);
    }

    // When marked READY: Broadcast instant notification to all active residents of the property
    if (status === 'ready') {
      const prop = db.prepare('SELECT name FROM properties WHERE id = ?').get(propertyId);
      const mealName = mealType.charAt(0).toUpperCase() + mealType.slice(1);

      await NotificationService.broadcastToPropertyResidents({
        propertyId,
        organizationId: orgId,
        title: `🍽️ ${mealName} is Ready!`,
        message: `Freshly prepared ${mealName} is now being served in the dining hall at ${prop?.name || 'your property'}. Enjoy your meal!`,
        type: 'food_ready',
        data: { mealType, date, propertyId }
      });
    }

    logAudit({ user: req.user, tenantId: orgId, headers: req.headers, socket: req.socket }, {
      action: 'UPDATE_MEAL_STATUS',
      entity: 'Meal',
      entityId: `${propertyId}-${date}-${mealType}`,
      newValues: { status, mealType, date }
    });

    res.json({
      message: `Meal marked as ${status}. ${status === 'ready' ? 'Residents notified!' : ''}`,
      status,
      mealType
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update meal status: ' + err.message });
  }
});

// POST /api/meals/opt-out (Resident meal skip / extra guest meals toggle)
router.post('/opt-out', requireAuth, enforceTenant, (req, res) => {
  try {
    const { propertyId, date = new Date().toISOString().split('T')[0], mealType, isOptedOut = true, guestCount = 0, notes } = req.body;

    let residentId = null;
    if (req.user.role === 'resident') {
      const resRecord = db.prepare('SELECT id, property_id FROM residents WHERE user_id = ?').get(req.user.id);
      if (!resRecord) return res.status(404).json({ error: 'Resident profile not found.' });
      residentId = resRecord.id;
    } else {
      residentId = req.body.residentId;
    }

    if (!residentId || !mealType) {
      return res.status(400).json({ error: 'Resident ID and Meal Type are required.' });
    }

    const propId = propertyId || db.prepare('SELECT property_id FROM residents WHERE id = ?').get(residentId)?.property_id;

    const existing = db.prepare(`
      SELECT id FROM meal_opt_outs WHERE resident_id = ? AND date = ? AND meal_type = ?
    `).get(residentId, date, mealType.toLowerCase());

    if (existing) {
      db.prepare(`
        UPDATE meal_opt_outs SET
          is_opted_out = ?,
          guest_count = ?,
          notes = ?
        WHERE id = ?
      `).run(isOptedOut ? 1 : 0, Number(guestCount) || 0, notes || null, existing.id);
    } else {
      db.prepare(`
        INSERT INTO meal_opt_outs (id, resident_id, property_id, date, meal_type, is_opted_out, guest_count, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), residentId, propId, date, mealType.toLowerCase(), isOptedOut ? 1 : 0, Number(guestCount) || 0, notes || null);
    }

    res.json({
      message: isOptedOut ? `Marked skipped for ${mealType}.` : `Opted in for ${mealType}.`,
      isOptedOut,
      guestCount
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update meal preference: ' + err.message });
  }
});

module.exports = router;
