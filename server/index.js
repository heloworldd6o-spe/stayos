require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./db/database');
const CronService = require('./services/cronService');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logging
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production' && !req.path.startsWith('/static')) {
    console.log(`[${new Date().toISOString().substring(11, 19)}] ${req.method} ${req.originalUrl}`);
  }
  next();
});

// Mount API Routers
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/organizations', require('./routes/organizations'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/beds', require('./routes/beds'));
app.use('/api/residents', require('./routes/residents'));
app.use('/api/checkins', require('./routes/checkins'));
app.use('/api/checkouts', require('./routes/checkouts'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/meals', require('./routes/meals'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/visitors', require('./routes/visitors'));
app.use('/api/notices', require('./routes/notices'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/superadmin', require('./routes/superadmin'));
app.use('/api/documents', require('./routes/documents'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    product: 'StayOS SaaS PG & Hostel Management',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend in production / fallback
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(200).send('StayOS API Server is active on port ' + PORT);
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('💥 Unhandled Server Error:', err);
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }

  // Friendly error messages instead of raw DB constraints (Rule 42)
  if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
    return res.status(400).json({ error: 'Cannot complete action because linked records depend on this item.' });
  }
  if (err.message && err.message.includes('UNIQUE constraint failed')) {
    return res.status(400).json({ error: 'A duplicate record with this name or code already exists.' });
  }

  res.status(500).json({
    error: err.message || 'An unexpected error occurred. Please try again later.'
  });
});

// Start Server (only when run directly, not when required in serverless functions like Vercel)
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL && !process.env.NETLIFY) {
  app.listen(PORT, () => {
    console.log(`🚀 StayOS Production-Ready API Server listening on http://localhost:${PORT}`);
    
    // Run daily cron automated workflows on server start
    setTimeout(() => {
      CronService.runDailyJobs().catch(e => console.error('Initial cron job error:', e));
    }, 3000);
  });
}

module.exports = app;
