const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, enforceTenant, requireRole } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');

// GET /api/beds (List beds with status filters)
router.get('/', requireAuth, enforceTenant, (req, res) => {
  try {
    const orgId = req.tenantId;
    const { propertyId, status, roomId } = req.query;

    let query = `
      SELECT 
        b.*,
        r.room_number,
        r.room_type,
        r.ac_type,
        r.bathroom_type,
        p.name as property_name,
        bldg.name as building_name,
        f.floor_name,
        res.id as resident_id,
        res.full_name as resident_name,
        res.phone as resident_phone,
        res.gender as resident_gender,
        res.joining_date
      FROM beds b
      JOIN rooms r ON b.room_id = r.id
      JOIN properties p ON b.property_id = p.id
      JOIN buildings bldg ON r.building_id = bldg.id
      JOIN floors f ON r.floor_id = f.id
      LEFT JOIN residents res ON res.current_bed_id = b.id AND res.status = 'active'
      WHERE p.organization_id = ?
    `;

    const params = [orgId];

    if (propertyId) {
      query += ' AND b.property_id = ?';
      params.push(propertyId);
    }
    if (roomId) {
      query += ' AND b.room_id = ?';
      params.push(roomId);
    }
    if (status) {
      query += ' AND b.status = ?';
      params.push(status);
    }

    query += ' ORDER BY p.name ASC, r.room_number ASC, b.bed_number ASC';

    const beds = db.prepare(query).all(...params);
    res.json(beds);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch beds: ' + err.message });
  }
});

// GET /api/beds/vacant (Dedicated Vacant Beds Module)
router.get('/vacant', requireAuth, enforceTenant, (req, res) => {
  try {
    const orgId = req.tenantId;
    const { propertyId, acType, roomType, gender } = req.query;

    let query = `
      SELECT 
        b.*,
        r.room_number,
        r.room_type,
        r.ac_type,
        r.bathroom_type,
        r.base_deposit,
        r.amenities,
        p.name as property_name,
        bldg.name as building_name,
        f.floor_name
      FROM beds b
      JOIN rooms r ON b.room_id = r.id
      JOIN properties p ON b.property_id = p.id
      JOIN buildings bldg ON r.building_id = bldg.id
      JOIN floors f ON r.floor_id = f.id
      WHERE p.organization_id = ? AND b.status = 'available'
    `;

    const params = [orgId];

    if (propertyId) {
      query += ' AND b.property_id = ?';
      params.push(propertyId);
    }
    if (acType) {
      query += ' AND r.ac_type = ?';
      params.push(acType);
    }
    if (roomType) {
      query += ' AND r.room_type = ?';
      params.push(roomType);
    }

    query += ' ORDER BY p.name ASC, r.room_number ASC, b.bed_number ASC';

    const vacantBeds = db.prepare(query).all(...params);
    const parsed = vacantBeds.map(b => ({
      ...b,
      amenities: JSON.parse(b.amenities || '[]')
    }));

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vacant beds: ' + err.message });
  }
});

// PUT /api/beds/:id/status (Update bed status - maintenance, blocked, available)
router.put('/:id/status', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager', 'warden', 'receptionist'), (req, res) => {
  try {
    const orgId = req.tenantId;
    const { status, monthlyRent } = req.body;

    if (!status || !['available', 'occupied', 'reserved', 'maintenance', 'blocked'].includes(status)) {
      return res.status(400).json({ error: 'Invalid bed status.' });
    }

    const bed = db.prepare(`
      SELECT b.* FROM beds b
      JOIN properties p ON b.property_id = p.id
      WHERE b.id = ? AND p.organization_id = ?
    `).get(req.params.id, orgId);

    if (!bed) {
      return res.status(404).json({ error: 'Bed not found.' });
    }

    // Prevent changing status of an occupied bed to available without checkout
    if (bed.status === 'occupied' && status === 'available') {
      const activeResident = db.prepare("SELECT id, full_name FROM residents WHERE current_bed_id = ? AND status = 'active'").get(bed.id);
      if (activeResident) {
        return res.status(400).json({
          error: `Cannot mark bed available because resident '${activeResident.full_name}' is currently assigned. Please initiate formal Check-Out.`
        });
      }
    }

    db.prepare(`
      UPDATE beds 
      SET status = ?, monthly_rent = COALESCE(?, monthly_rent)
      WHERE id = ?
    `).run(status, monthlyRent ? Number(monthlyRent) : null, req.params.id);

    // Refresh room status automatically
    updateRoomOccupancyStatus(bed.room_id);

    logAudit({ user: req.user, tenantId: orgId, headers: req.headers, socket: req.socket }, {
      action: 'UPDATE_BED_STATUS',
      entity: 'Bed',
      entityId: req.params.id,
      newValues: { status, bedNumber: bed.bed_number }
    });

    res.json({ message: 'Bed status updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update bed status: ' + err.message });
  }
});

// Helper to keep room status synchronized with its bed states
function updateRoomOccupancyStatus(roomId) {
  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
      FROM beds WHERE room_id = ?
    `).get(roomId);

    let newStatus = 'available';
    if (stats.occupied === stats.total && stats.total > 0) {
      newStatus = 'fully_occupied';
    } else if (stats.occupied > 0) {
      newStatus = 'partially_occupied';
    } else if (stats.maintenance === stats.total && stats.total > 0) {
      newStatus = 'maintenance';
    }

    db.prepare('UPDATE rooms SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, roomId);
  } catch (e) {
    console.error('Failed to sync room status:', e.message);
  }
}

module.exports = router;
