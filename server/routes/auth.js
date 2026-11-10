const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { generateToken, requireAuth } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');
const { v4: uuidv4 } = require('../utils/uuid');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide both email and password.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'This account has been deactivated. Please contact your administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Fetch Organization details if applicable
    let organization = null;
    if (user.organization_id) {
      organization = db.prepare('SELECT * FROM organizations WHERE id = ?').get(user.organization_id);
      if (organization && organization.subscription_status === 'suspended' && user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Organization account is suspended. Please contact platform support.' });
      }
    }

    // Fetch Resident details if user is a resident
    let resident = null;
    if (user.role === 'resident') {
      resident = db.prepare(`
        SELECT r.*, p.name as property_name, rm.room_number, b.bed_number 
        FROM residents r
        LEFT JOIN properties p ON r.property_id = p.id
        LEFT JOIN rooms rm ON r.current_room_id = rm.id
        LEFT JOIN beds b ON r.current_bed_id = b.id
        WHERE r.user_id = ?
      `).get(user.id);
    }

    const token = generateToken(user);

    // Audit log
    logAudit({ user, headers: req.headers, socket: req.socket }, {
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: user.id
    });

    res.json({
      token,
      user: {
        id: user.id,
        organization_id: user.organization_id,
        role: user.role,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        avatar_url: user.avatar_url
      },
      organization,
      resident
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
});

// POST /api/auth/register (New Organization Signup)
router.post('/register', async (req, res) => {
  try {
    const { orgName, fullName, email, phone, password, propertyName, city, planCode = 'growth' } = req.body || {};
    if (!orgName || !fullName || !email || !password) {
      return res.status(400).json({ error: 'Please provide organization name, your full name, email, and password.' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    const orgId = `org-${uuidv4().substring(0, 8)}`;
    const userId = `user-${uuidv4().substring(0, 8)}`;
    const propId = `prop-${uuidv4().substring(0, 8)}`;
    const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);
    const passwordHash = await bcrypt.hash(password, 10);

    const signupTx = db.transaction(() => {
      // 1. Insert Organization
      db.prepare(`
        INSERT INTO organizations (id, name, slug, contact_email, contact_phone, currency, currency_symbol, subscription_plan, subscription_status)
        VALUES (?, ?, ?, ?, ?, 'INR', '₹', ?, 'active')
      `).run(orgId, orgName, slug, email, phone || '', planCode);

      // 2. Insert Owner User
      db.prepare(`
        INSERT INTO users (id, organization_id, role, full_name, email, phone, password_hash, is_active)
        VALUES (?, ?, 'owner', ?, ?, ?, ?, 1)
      `).run(userId, orgId, fullName, email, phone || '', passwordHash);

      // 3. Insert Initial Property if provided
      if (propertyName) {
        db.prepare(`
          INSERT INTO properties (id, organization_id, name, type, address, city, state, pincode, contact_number, manager_id, status)
          VALUES (?, ?, ?, 'pg', ?, ?, 'State', '000000', ?, ?, 'active')
        `).run(propId, orgId, propertyName, city || 'City Center', city || 'City', phone || '', userId);

        // Add default building & floor
        const bldgId = uuidv4();
        const floorId = uuidv4();
        db.prepare(`INSERT INTO buildings (id, property_id, name, total_floors) VALUES (?, ?, 'Main Wing', 2)`).run(bldgId, propId);
        db.prepare(`INSERT INTO floors (id, building_id, property_id, floor_number, floor_name) VALUES (?, ?, ?, 1, '1st Floor')`).run(floorId, bldgId, propId);
      }

      // 4. Default notification preferences
      db.prepare(`
        INSERT INTO notification_preferences (id, user_id, in_app_enabled, email_enabled, whatsapp_enabled, sms_enabled)
        VALUES (?, ?, 1, 1, 1, 0)
      `).run(uuidv4(), userId);
    });

    signupTx();

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const organization = db.prepare('SELECT * FROM organizations WHERE id = ?').get(orgId);
    const token = generateToken(user);

    logAudit({ user, headers: req.headers, socket: req.socket }, {
      action: 'ORGANIZATION_REGISTER',
      entity: 'Organization',
      entityId: orgId,
      newValues: { orgName, email }
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        organization_id: user.organization_id,
        role: user.role,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone
      },
      organization
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to create organization account: ' + err.message });
  }
});

// GET /api/auth/me (Get authenticated user state)
router.get('/me', requireAuth, (req, res) => {
  try {
    const user = req.user;
    let organization = null;
    if (user.organization_id) {
      organization = db.prepare('SELECT * FROM organizations WHERE id = ?').get(user.organization_id);
    }

    let resident = null;
    if (user.role === 'resident') {
      resident = db.prepare(`
        SELECT r.*, p.name as property_name, rm.room_number, b.bed_number 
        FROM residents r
        LEFT JOIN properties p ON r.property_id = p.id
        LEFT JOIN rooms rm ON r.current_room_id = rm.id
        LEFT JOIN beds b ON r.current_bed_id = b.id
        WHERE r.user_id = ?
      `).get(user.id);
    }

    res.json({
      user,
      organization,
      resident
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
});

// POST /api/auth/demo-switch (Instant role switch for demo and testing)
router.post('/demo-switch', (req, res) => {
  try {
    const { role, email } = req.body || {};
    let targetUser = null;

    if (email) {
      targetUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    } else if (role) {
      targetUser = db.prepare('SELECT * FROM users WHERE role = ? LIMIT 1').get(role);
    }

    if (!targetUser) {
      return res.status(404).json({ error: 'Demo user for role not found. Please run seed.' });
    }

    const token = generateToken(targetUser);
    let organization = null;
    if (targetUser.organization_id) {
      organization = db.prepare('SELECT * FROM organizations WHERE id = ?').get(targetUser.organization_id);
    }

    let resident = null;
    if (targetUser.role === 'resident') {
      resident = db.prepare(`
        SELECT r.*, p.name as property_name, rm.room_number, b.bed_number 
        FROM residents r
        LEFT JOIN properties p ON r.property_id = p.id
        LEFT JOIN rooms rm ON r.current_room_id = rm.id
        LEFT JOIN beds b ON r.current_bed_id = b.id
        WHERE r.user_id = ?
      `).get(targetUser.id);
    }

    res.json({
      token,
      user: {
        id: targetUser.id,
        organization_id: targetUser.organization_id,
        role: targetUser.role,
        full_name: targetUser.full_name,
        email: targetUser.email,
        phone: targetUser.phone,
        avatar_url: targetUser.avatar_url
      },
      organization,
      resident
    });
  } catch (err) {
    res.status(500).json({ error: 'Role switch error: ' + err.message });
  }
});

module.exports = router;
