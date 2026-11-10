const path = require('path');
const fs = require('fs');

let Database = null;
try {
  Database = require('better-sqlite3');
} catch (e) {
  console.warn('⚠️ better-sqlite3 native module not available:', e.message);
}

let db = null;

if (Database) {
  try {
    let dbPath = path.resolve(__dirname, 'stayos.db');
    const isServerless = process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME;
    if (isServerless) {
      const tmpPath = path.join('/tmp', 'stayos.db');
      try {
        if (!fs.existsSync(tmpPath) && fs.existsSync(dbPath)) {
          fs.copyFileSync(dbPath, tmpPath);
        }
        dbPath = tmpPath;
      } catch (err) {
        console.warn('⚠️ Serverless /tmp db copy warning:', err.message);
      }
    }

    db = new Database(dbPath, { verbose: process.env.NODE_ENV === 'development' ? null : null });
    try {
      db.pragma('journal_mode = WAL');
    } catch (e) {
      db.pragma('journal_mode = DELETE');
    }
    db.pragma('foreign_keys = ON');

    // Initialize schema
    let schemaSql = '';
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      schemaSql = fs.readFileSync(schemaPath, 'utf8');
    } else {
      try {
        schemaSql = require('./schema');
      } catch (e) {
        console.warn('Could not load schema.js:', e.message);
      }
    }

    if (schemaSql) {
      try {
        db.exec(schemaSql);
      } catch (e) {
        console.warn('Schema init note:', e.message);
      }
    }

    // Ensure seed data exists if fresh database
    try {
      const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get()?.count || 0;
      if (userCount === 0) {
        const { seedData } = require('./seed');
        seedData().catch(e => console.error('Seed error:', e.message));
      }
    } catch (err) {
      console.warn('Seed check note:', err.message);
    }
  } catch (err) {
    console.warn('⚠️ Failed to initialize SQLite database file, falling back to memory store:', err.message);
    db = null;
  }
}

if (!db) {
  console.log('⚡ Initializing StayOS in-memory database engine for serverless execution...');
  db = require('./memoryDb');
}

module.exports = db;
