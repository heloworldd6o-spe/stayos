const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, enforceTenant, requireRole } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');
const { v4: uuidv4 } = require('uuid');

// GET /api/properties (List all properties for this tenant)
router.get('/', requireAuth, enforceTenant, (req, res) => {
  try {
    const orgId = req.tenantId;
    const properties = db.prepare(`
      SELECT 
        p.*,
        u.full_name as manager_name,
        (SELECT COUNT(*) FROM buildings WHERE property_id = p.id) as building_count,
        (SELECT COUNT(*) FROM rooms WHERE property_id = p.id) as room_count,
        (SELECT COUNT(*) FROM beds WHERE property_id = p.id) as total_beds,
        (SELECT COUNT(*) FROM beds WHERE property_id = p.id AND status = 'occupied') as occupied_beds,
        (SELECT COUNT(*) FROM beds WHERE property_id = p.id AND status = 'available') as available_beds,
        (SELECT COUNT(*) FROM residents WHERE property_id = p.id AND status = 'active') as active_residents
      FROM properties p
      LEFT JOIN users u ON p.manager_id = u.id
      WHERE p.organization_id = ?
      ORDER BY p.name ASC
    `).all(orgId);

    // Parse JSON fields
    const parsed = properties.map(p => ({
      ...p,
      amenities: JSON.parse(p.amenities || '[]'),
      rules: JSON.parse(p.rules || '[]'),
      photos: JSON.parse(p.photos || '[]'),
      occupancy_percent: p.total_beds > 0 ? Math.round((p.occupied_beds / p.total_beds) * 100) : 0
    }));

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch properties: ' + err.message });
  }
});

// GET /api/properties/:id (Get single property details)
router.get('/:id', requireAuth, enforceTenant, (req, res) => {
  try {
    const orgId = req.tenantId;
    const prop = db.prepare(`
      SELECT p.*, u.full_name as manager_name
      FROM properties p
      LEFT JOIN users u ON p.manager_id = u.id
      WHERE p.id = ? AND p.organization_id = ?
    `).get(req.params.id, orgId);

    if (!prop) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const buildings = db.prepare('SELECT * FROM buildings WHERE property_id = ?').all(prop.id);
    const floors = db.prepare('SELECT * FROM floors WHERE property_id = ? ORDER BY floor_number ASC').all(prop.id);
    const rooms = db.prepare('SELECT * FROM rooms WHERE property_id = ?').all(prop.id);
    const beds = db.prepare('SELECT * FROM beds WHERE property_id = ?').all(prop.id);

    res.json({
      ...prop,
      amenities: JSON.parse(prop.amenities || '[]'),
      rules: JSON.parse(prop.rules || '[]'),
      photos: JSON.parse(prop.photos || '[]'),
      buildings,
      floors,
      rooms,
      beds
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load property: ' + err.message });
  }
});

// POST /api/properties (Create new property)
router.post('/', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager'), (req, res) => {
  try {
    const orgId = req.tenantId;
    const {
      name, type = 'pg', address, city, state, pincode,
      contactNumber, email, managerId, amenities = [], rules = [], photos = [],
      rentDueDay = 5, gracePeriodDays = 3, lateFeeAmount = 250
    } = req.body;

    if (!name || !address || !city || !contactNumber) {
      return res.status(400).json({ error: 'Please provide Property Name, Address, City, and Contact Number.' });
    }

    const propId = `prop-${uuidv4().substring(0, 8)}`;
    const bldgId = uuidv4();
    const floor0Id = uuidv4();
    const floor1Id = uuidv4();

    const insertTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO properties (
          id, organization_id, name, type, address, city, state, pincode,
          contact_number, email, manager_id, amenities, rules, photos,
          rent_due_day, grace_period_days, late_fee_amount, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `).run(
        propId, orgId, name, type, address, city, state || 'Telangana', pincode || '500000',
        contactNumber, email || '', managerId || null,
        JSON.stringify(amenities), JSON.stringify(rules), JSON.stringify(photos),
        Number(rentDueDay) || 5, Number(gracePeriodDays) || 3, Number(lateFeeAmount) || 250
      );

      // Create default building & 2 floors
      db.prepare(`INSERT INTO buildings (id, property_id, name, code, total_floors) VALUES (?, ?, 'Main Wing', 'MW', 2)`).run(bldgId, propId);
      db.prepare(`INSERT INTO floors (id, building_id, property_id, floor_number, floor_name) VALUES (?, ?, ?, 0, 'Ground Floor')`).run(floor0Id, bldgId, propId);
      db.prepare(`INSERT INTO floors (id, building_id, property_id, floor_number, floor_name) VALUES (?, ?, ?, 1, '1st Floor')`).run(floor1Id, bldgId, propId);
    });

    insertTx();

    logAudit({ user: req.user, tenantId: orgId, headers: req.headers, socket: req.socket }, {
      action: 'CREATE_PROPERTY',
      entity: 'Property',
      entityId: propId,
      newValues: { name, type, city }
    });

    const newProp = db.prepare('SELECT * FROM properties WHERE id = ?').get(propId);
    res.status(201).json(newProp);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create property: ' + err.message });
  }
});

// PUT /api/properties/:id (Update property)
router.put('/:id', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager'), (req, res) => {
  try {
    const orgId = req.tenantId;
    const {
      name, type, address, city, state, pincode,
      contactNumber, email, managerId, amenities, rules, photos,
      rentDueDay, gracePeriodDays, lateFeeAmount, status
    } = req.body;

    const existing = db.prepare('SELECT * FROM properties WHERE id = ? AND organization_id = ?').get(req.params.id, orgId);
    if (!existing) {
      return res.status(404).json({ error: 'Property not found' });
    }

    db.prepare(`
      UPDATE properties SET
        name = COALESCE(?, name),
        type = COALESCE(?, type),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        pincode = COALESCE(?, pincode),
        contact_number = COALESCE(?, contact_number),
        email = COALESCE(?, email),
        manager_id = COALESCE(?, manager_id),
        amenities = COALESCE(?, amenities),
        rules = COALESCE(?, rules),
        photos = COALESCE(?, photos),
        rent_due_day = COALESCE(?, rent_due_day),
        grace_period_days = COALESCE(?, grace_period_days),
        late_fee_amount = COALESCE(?, late_fee_amount),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name, type, address, city, state, pincode,
      contactNumber, email, managerId,
      amenities ? JSON.stringify(amenities) : null,
      rules ? JSON.stringify(rules) : null,
      photos ? JSON.stringify(photos) : null,
      rentDueDay, gracePeriodDays, lateFeeAmount, status,
      req.params.id
    );

    logAudit({ user: req.user, tenantId: orgId, headers: req.headers, socket: req.socket }, {
      action: 'UPDATE_PROPERTY',
      entity: 'Property',
      entityId: req.params.id,
      newValues: { name, status }
    });

    const updated = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update property: ' + err.message });
  }
});

module.exports = router;
