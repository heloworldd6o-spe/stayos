const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let dbPath = path.resolve(__dirname, 'stayos.db');

// Support serverless environments (Vercel / Netlify / AWS Lambda) where project root is read-only
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

const db = new Database(dbPath, { verbose: process.env.NODE_ENV === 'development' ? null : null });

// Enforce foreign keys and WAL mode for maximum performance and concurrency
try {
  db.pragma('journal_mode = WAL');
} catch (e) {
  db.pragma('journal_mode = DELETE');
}
db.pragma('foreign_keys = ON');

// Initialize schema
function initDatabase() {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
    console.log('✅ Database schema initialized successfully');
  }

  // Ensure every property has at least one building and floor
  try {
    const properties = db.prepare('SELECT id, name FROM properties').all();
    for (const prop of properties) {
      let bldg = db.prepare('SELECT id FROM buildings WHERE property_id = ?').get(prop.id);
      if (!bldg) {
        const bldgId = `bldg-${prop.id.replace('prop-', '')}-main`;
        db.prepare('INSERT INTO buildings (id, property_id, name, code, total_floors) VALUES (?, ?, ?, ?, ?)')
          .run(bldgId, prop.id, 'Main Wing', 'MAIN', 3);
        bldg = { id: bldgId };
      }
      const floorCount = db.prepare('SELECT COUNT(*) as count FROM floors WHERE property_id = ?').get(prop.id).count;
      if (floorCount === 0) {
        db.prepare('INSERT INTO floors (id, building_id, property_id, floor_number, floor_name) VALUES (?, ?, ?, 0, ?)')
          .run(`floor-${prop.id.replace('prop-', '')}-0`, bldg.id, prop.id, 'Ground Floor');
        db.prepare('INSERT INTO floors (id, building_id, property_id, floor_number, floor_name) VALUES (?, ?, ?, 1, ?)')
          .run(`floor-${prop.id.replace('prop-', '')}-1`, bldg.id, prop.id, '1st Floor');
        db.prepare('INSERT INTO floors (id, building_id, property_id, floor_number, floor_name) VALUES (?, ?, ?, 2, ?)')
          .run(`floor-${prop.id.replace('prop-', '')}-2`, bldg.id, prop.id, '2nd Floor');
      }
    }
  } catch (err) {
    console.warn('⚠️ Building/floor self-heal note:', err.message);
  }
}

initDatabase();

module.exports = db;
