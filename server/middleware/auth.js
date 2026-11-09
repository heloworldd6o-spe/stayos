const jwt = require('jsonwebtoken');
const db = require('../db/database');

const JWT_SECRET = process.env.AUTH_SECRET || 'stayos_production_jwt_secret_key_2026_secure';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      organization_id: user.organization_id,
      role: user.role,
      email: user.email,
      full_name: user.full_name
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function requireAuth(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in to continue.' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch latest user state from database
    const user = db.prepare('SELECT id, organization_id, role, full_name, email, phone, avatar_url, is_active FROM users WHERE id = ?').get(decoded.id);
    
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User account is inactive or no longer exists.' });
    }

    // Attach user to request
    req.user = user;
    req.organizationId = user.organization_id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
  }
}

// Role Authorization middleware
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Super Admin can access everything
    if (req.user.role === 'super_admin') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Your role '${req.user.role}' does not have permission for this action.`
      });
    }

    next();
  };
}

// Tenant Isolation Middleware
function enforceTenant(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Super Admin can pass tenant in header or query if authorized
  if (req.user.role === 'super_admin') {
    req.tenantId = req.headers['x-organization-id'] || req.query.organizationId || null;
    return next();
  }

  if (!req.user.organization_id) {
    return res.status(403).json({ error: 'No organization assigned to this user.' });
  }

  req.tenantId = req.user.organization_id;
  next();
}

module.exports = {
  JWT_SECRET,
  generateToken,
  requireAuth,
  requireRole,
  enforceTenant
};
