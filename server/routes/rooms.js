const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, enforceTenant, requireRole } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');
const { v4: uuidv4 } = require('../utils/uuid');

// GET /api/rooms (List rooms with rich filters)
router.get('/', requireAuth, enforceTenant, (req, res) => {
  try {
    const orgId = req.tenantId;
    const { propertyId, buildingId, floorId, roomType, acType, status, search } = req.query;

    let query = `
      SELECT 
        r.*,
        p.name as property_name,
        b.name as building_name,
        f.floor_name,
        (SELECT COUNT(*) FROM beds WHERE room_id = r.id) as total_beds,
        (SELECT COUNT(*) FROM beds WHERE room_id = r.id AND status = 'occupied') as occupied_beds,
        (SELECT COUNT(*) FROM beds WHERE room_id = r.id AND status = 'available') as available_beds
      FROM rooms r
      JOIN properties p ON r.property_id = p.id
      JOIN buildings b ON r.building_id = b.id
      JOIN floors f ON r.floor_id = f.id
      WHERE p.organization_id = ?
    `;

    const params = [orgId];

    if (propertyId) {
      query += ' AND r.property_id = ?';
      params.push(propertyId);
    }
    if (buildingId) {
      query += ' AND r.building_id = ?';
      params.push(buildingId);
    }
    if (floorId) {
      query += ' AND r.floor_id = ?';
      params.push(floorId);
    }
    if (roomType) {
      query += ' AND r.room_type = ?';
      params.push(roomType);
    }
    if (acType) {
      query += ' AND r.ac_type = ?';
      params.push(acType);
    }
    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (r.room_number LIKE ? OR b.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY p.name ASC, b.name ASC, f.floor_number ASC, r.room_number ASC';

    const rooms = db.prepare(query).all(...params);

    // Fetch beds for each room
    const roomsWithBeds = rooms.map(room => {
      const beds = db.prepare(`
        SELECT 
          b.*,
          res.id as resident_id,
          res.full_name as resident_name,
          res.phone as resident_phone,
          res.photo_url as resident_photo,
          res.joining_date
        FROM beds b
        LEFT JOIN residents res ON res.current_bed_id = b.id AND res.status = 'active'
        WHERE b.room_id = ?
        ORDER BY b.bed_number ASC
      `).all(room.id);

      return {
        ...room,
        amenities: JSON.parse(room.amenities || '[]'),
        beds
      };
    });

    res.json(roomsWithBeds);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rooms: ' + err.message });
  }
});

// GET /api/rooms/:id (Single room details)
router.get('/:id', requireAuth, enforceTenant, (req, res) => {
  try {
    const orgId = req.tenantId;
    const room = db.prepare(`
      SELECT 
        r.*,
        p.name as property_name,
        b.name as building_name,
        f.floor_name
      FROM rooms r
      JOIN properties p ON r.property_id = p.id
      JOIN buildings b ON r.building_id = b.id
      JOIN floors f ON r.floor_id = f.id
      WHERE r.id = ? AND p.organization_id = ?
    `).get(req.params.id, orgId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    const beds = db.prepare(`
      SELECT 
        b.*,
        res.id as resident_id,
        res.full_name as resident_name,
        res.phone as resident_phone,
        res.photo_url as resident_photo,
        res.joining_date
      FROM beds b
      LEFT JOIN residents res ON res.current_bed_id = b.id AND res.status = 'active'
      WHERE b.room_id = ?
      ORDER BY b.bed_number ASC
    `).all(room.id);

    res.json({
      ...room,
      amenities: JSON.parse(room.amenities || '[]'),
      beds
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch room details: ' + err.message });
  }
});

// POST /api/rooms (Create room & automatically generate its beds)
router.post('/', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager'), (req, res) => {
  try {
    const orgId = req.tenantId;
    let propertyId = req.body.propertyId || req.body.property_id;
    let buildingId = req.body.buildingId || req.body.building_id;
    let floorId = req.body.floorId || req.body.floor_id;
    const roomNumberRaw = req.body.roomNumber || req.body.room_number;
    const roomType = req.body.roomType || req.body.room_type || 'double';
    const capacity = Number(req.body.capacity) || 2;
    const acType = req.body.acType || req.body.ac_type || (req.body.is_ac ? 'ac' : 'non_ac');
    const bathroomType = req.body.bathroomType || req.body.bathroom_type || (req.body.has_attached_bathroom ? 'attached' : 'common');
    const baseRent = Number(req.body.baseRent ?? req.body.rent_amount ?? req.body.base_rent ?? 8500);
    const baseDeposit = Number(req.body.baseDeposit ?? req.body.deposit_amount ?? req.body.base_deposit ?? 15000);
    const amenities = req.body.amenities || [];

    if (!roomNumberRaw || !String(roomNumberRaw).trim()) {
      return res.status(400).json({ error: 'Room number is required.' });
    }
    const roomNumber = String(roomNumberRaw).trim();

    // Auto-resolve propertyId if omitted
    if (!propertyId) {
      const defaultProp = db.prepare('SELECT id FROM properties WHERE organization_id = ? ORDER BY id ASC').get(orgId);
      if (defaultProp) {
        propertyId = defaultProp.id;
      } else {
        return res.status(400).json({ error: 'Property is required. Please select or create a property first.' });
      }
    }

    // Verify property belongs to this organization
    const prop = db.prepare('SELECT id FROM properties WHERE id = ? AND organization_id = ?').get(propertyId, orgId);
    if (!prop) {
      return res.status(403).json({ error: 'Property not found in your organization.' });
    }

    // Auto-resolve buildingId if omitted or invalid
    if (buildingId) {
      const bldg = db.prepare('SELECT id FROM buildings WHERE id = ? AND property_id = ?').get(buildingId, propertyId);
      if (!bldg) buildingId = null;
    }
    if (!buildingId) {
      let bldg = db.prepare('SELECT id FROM buildings WHERE property_id = ? ORDER BY id ASC').get(propertyId);
      if (!bldg) {
        const newBldgId = `bldg-${uuidv4().substring(0, 8)}`;
        db.prepare('INSERT INTO buildings (id, property_id, name, code, total_floors) VALUES (?, ?, ?, ?, ?)').run(
          newBldgId, propertyId, 'Main Wing', 'MAIN', 3
        );
        bldg = { id: newBldgId };
      }
      buildingId = bldg.id;
    }

    // Auto-resolve floorId if omitted or invalid
    if (floorId) {
      const flr = db.prepare('SELECT id FROM floors WHERE id = ? AND property_id = ?').get(floorId, propertyId);
      if (!flr) floorId = null;
    }
    if (!floorId) {
      let flr = db.prepare('SELECT id FROM floors WHERE property_id = ? AND (building_id = ? OR building_id IS NULL) ORDER BY floor_number ASC').get(propertyId, buildingId);
      if (!flr) {
        flr = db.prepare('SELECT id FROM floors WHERE property_id = ? ORDER BY floor_number ASC').get(propertyId);
      }
      if (!flr) {
        const f0Id = `floor-${uuidv4().substring(0, 8)}`;
        const f1Id = `floor-${uuidv4().substring(0, 8)}`;
        db.prepare('INSERT INTO floors (id, building_id, property_id, floor_number, floor_name) VALUES (?, ?, ?, 0, ?)').run(
          f0Id, buildingId, propertyId, 'Ground Floor'
        );
        db.prepare('INSERT INTO floors (id, building_id, property_id, floor_number, floor_name) VALUES (?, ?, ?, 1, ?)').run(
          f1Id, buildingId, propertyId, '1st Floor'
        );
        flr = { id: f1Id };
      }
      floorId = flr.id;
    }

    // Check duplicate room number in property
    const existing = db.prepare('SELECT id FROM rooms WHERE property_id = ? AND room_number = ?').get(propertyId, roomNumber);
    if (existing) {
      return res.status(400).json({ error: `Room ${roomNumber} already exists in this property.` });
    }

    const roomId = `room-${uuidv4().substring(0, 8)}`;
    const bedCount = Number(capacity) || 1;

    const createRoomTx = db.transaction(() => {
      // 1. Insert room
      db.prepare(`
        INSERT INTO rooms (
          id, property_id, building_id, floor_id, room_number,
          room_type, capacity, ac_type, bathroom_type,
          base_rent, base_deposit, amenities, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')
      `).run(
        roomId, propertyId, buildingId, floorId, roomNumber,
        roomType, bedCount, acType, bathroomType,
        Number(baseRent), Number(baseDeposit), JSON.stringify(amenities)
      );

      // 2. Automatically generate lettered beds (e.g. 101-A, 101-B, 101-C)
      const bedLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const insertBed = db.prepare(`
        INSERT INTO beds (id, room_id, property_id, bed_number, status, monthly_rent)
        VALUES (?, ?, ?, ?, 'available', ?)
      `);

      for (let i = 0; i < bedCount; i++) {
        const bedLetter = bedLetters[i] || `${i + 1}`;
        const bedNumber = `${roomNumber}-${bedLetter}`;
        insertBed.run(uuidv4(), roomId, propertyId, bedNumber, Number(baseRent));
      }
    });

    createRoomTx();

    logAudit({ user: req.user, tenantId: orgId, headers: req.headers, socket: req.socket }, {
      action: 'CREATE_ROOM',
      entity: 'Room',
      entityId: roomId,
      newValues: { roomNumber, capacity: bedCount, baseRent }
    });

    const newRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
    res.status(201).json(newRoom);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create room: ' + err.message });
  }
});

// PUT /api/rooms/:id (Update room details)
router.put('/:id', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager'), (req, res) => {
  try {
    const orgId = req.tenantId;
    const { roomType, acType, bathroomType, baseRent, baseDeposit, amenities, status } = req.body;

    const existing = db.prepare(`
      SELECT r.* FROM rooms r
      JOIN properties p ON r.property_id = p.id
      WHERE r.id = ? AND p.organization_id = ?
    `).get(req.params.id, orgId);

    if (!existing) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    db.prepare(`
      UPDATE rooms SET
        room_type = COALESCE(?, room_type),
        ac_type = COALESCE(?, ac_type),
        bathroom_type = COALESCE(?, bathroom_type),
        base_rent = COALESCE(?, base_rent),
        base_deposit = COALESCE(?, base_deposit),
        amenities = COALESCE(?, amenities),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      roomType, acType, bathroomType,
      baseRent !== undefined ? Number(baseRent) : null,
      baseDeposit !== undefined ? Number(baseDeposit) : null,
      amenities ? JSON.stringify(amenities) : null,
      status,
      req.params.id
    );

    res.json({ message: 'Room updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update room: ' + err.message });
  }
});

module.exports = router;
