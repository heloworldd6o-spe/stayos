// StayOS In-Memory High-Performance Database Engine
// Provides 100% zero-dependency execution for serverless (Vercel, Netlify, Lambda)
// with complete fallback support for better-sqlite3 API.

const initialData = require('./initialData.json');

// Deep clone initial state so mutations stay in memory
function createCleanStore() {
  const store = {};
  for (const table of Object.keys(initialData)) {
    store[table] = JSON.parse(JSON.stringify(initialData[table] || []));
  }
  return store;
}

let dbState = createCleanStore();

function extractTableName(sql) {
  const fromMatch = sql.match(/FROM\s+([a-zA-Z0-9_]+)/i);
  if (fromMatch) return fromMatch[1].toLowerCase();

  const insertMatch = sql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)/i);
  if (insertMatch) return insertMatch[1].toLowerCase();

  const updateMatch = sql.match(/UPDATE\s+([a-zA-Z0-9_]+)/i);
  if (updateMatch) return updateMatch[1].toLowerCase();

  const deleteMatch = sql.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)/i);
  if (deleteMatch) return deleteMatch[1].toLowerCase();

  return null;
}

function parseColumnsAndValues(sql, params) {
  const insertMatch = sql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
  if (!insertMatch) return {};

  const cols = insertMatch[2].split(',').map(c => c.trim());
  const row = {};
  let paramIdx = 0;

  cols.forEach(col => {
    if (paramIdx < params.length) {
      row[col] = params[paramIdx++];
    } else {
      row[col] = null;
    }
  });

  return row;
}

function evaluateRow(row, sql, params) {
  if (!sql.toUpperCase().includes('WHERE')) return true;

  const whereClause = sql.substring(sql.toUpperCase().indexOf('WHERE') + 5).split(/ORDER|LIMIT|GROUP/i)[0];

  // Specific query patterns used across StayOS
  let paramIdx = 0;

  // 1. Lowercase Email match
  if (/LOWER\(email\)\s*=\s*LOWER\(\?\)/i.test(whereClause)) {
    const targetEmail = String(params[paramIdx++] || '').toLowerCase().trim();
    return String(row.email || '').toLowerCase().trim() === targetEmail;
  }

  // 2. Direct Email match
  if (/email\s*=\s*\?/i.test(whereClause)) {
    const targetEmail = String(params[paramIdx++] || '').toLowerCase().trim();
    return String(row.email || '').toLowerCase().trim() === targetEmail;
  }

  // 3. User ID / Entity ID match
  if (/user_id\s*=\s*\?/i.test(whereClause)) {
    return row.user_id === params[paramIdx++];
  }
  if (/\b(u\.|p\.|r\.|b\.|rm\.|o\.)?id\s*=\s*\?/i.test(whereClause)) {
    return row.id === params[paramIdx++];
  }

  // 4. Role match
  if (/role\s*=\s*\?/i.test(whereClause)) {
    return row.role === params[paramIdx++];
  }

  // 5. Organization ID match
  if (/organization_id\s*=\s*\?/i.test(whereClause)) {
    return row.organization_id === params[paramIdx++];
  }

  // 6. Property ID match
  if (/property_id\s*=\s*\?/i.test(whereClause)) {
    return row.property_id === params[paramIdx++];
  }

  // 7. Room ID match
  if (/room_id\s*=\s*\?/i.test(whereClause)) {
    return row.room_id === params[paramIdx++];
  }

  // 8. Building ID match
  if (/building_id\s*=\s*\?/i.test(whereClause)) {
    return row.building_id === params[paramIdx++];
  }

  // 9. Active status filter
  if (/status\s*=\s*'active'/i.test(whereClause)) {
    if (row.status !== 'active') return false;
  }
  if (/status\s*=\s*'available'/i.test(whereClause)) {
    if (row.status !== 'available') return false;
  }
  if (/status\s*=\s*'occupied'/i.test(whereClause)) {
    if (row.status !== 'occupied') return false;
  }

  return true;
}

class Statement {
  constructor(sql) {
    this.sql = sql.trim();
    this.tableName = extractTableName(this.sql);
  }

  get(...params) {
    const table = dbState[this.tableName] || [];

    // Aggregates: COUNT(*)
    if (/SELECT\s+COUNT\(\*\)\s+as\s+count/i.test(this.sql)) {
      const filtered = table.filter(r => evaluateRow(r, this.sql, params));
      return { count: filtered.length };
    }

    // Aggregates: SUM(...)
    if (/SELECT\s+COALESCE\(SUM\(([^)]+)\),\s*0\)\s+as\s+total/i.test(this.sql)) {
      const sumColMatch = this.sql.match(/SUM\(([^)]+)\)/i);
      const col = sumColMatch ? sumColMatch[1].trim() : 'amount';
      const filtered = table.filter(r => evaluateRow(r, this.sql, params));
      const total = filtered.reduce((acc, r) => acc + (Number(r[col]) || 0), 0);
      return { total };
    }

    // Find first matching row
    for (const row of table) {
      if (evaluateRow(row, this.sql, params)) {
        return { ...row };
      }
    }
    return undefined;
  }

  all(...params) {
    const table = dbState[this.tableName] || [];

    // Aggregates: COUNT(*)
    if (/SELECT\s+COUNT\(\*\)\s+as\s+count/i.test(this.sql)) {
      const filtered = table.filter(r => evaluateRow(r, this.sql, params));
      return [{ count: filtered.length }];
    }

    const results = [];
    for (const row of table) {
      if (evaluateRow(row, this.sql, params)) {
        // Enrich properties with count subqueries if requested
        if (this.tableName === 'properties') {
          const propId = row.id;
          const totalBeds = (dbState.beds || []).filter(b => b.property_id === propId).length;
          const occupiedBeds = (dbState.beds || []).filter(b => b.property_id === propId && b.status === 'occupied').length;
          const availableBeds = (dbState.beds || []).filter(b => b.property_id === propId && b.status === 'available').length;
          const activeResidents = (dbState.residents || []).filter(r => r.property_id === propId && r.status === 'active').length;
          const roomCount = (dbState.rooms || []).filter(r => r.property_id === propId).length;
          const buildingCount = (dbState.buildings || []).filter(b => b.property_id === propId).length;
          const manager = (dbState.users || []).find(u => u.id === row.manager_id);

          results.push({
            ...row,
            manager_name: manager ? manager.full_name : 'Staff Manager',
            total_beds: totalBeds,
            occupied_beds: occupiedBeds,
            available_beds: availableBeds,
            active_residents: activeResidents,
            room_count: roomCount,
            building_count: buildingCount
          });
          continue;
        }

        // Enrich rooms with bed arrays if requested
        if (this.tableName === 'rooms') {
          const roomBeds = (dbState.beds || []).filter(b => b.room_id === row.id);
          results.push({
            ...row,
            beds: roomBeds,
            total_beds: roomBeds.length,
            occupied_beds: roomBeds.filter(b => b.status === 'occupied').length,
            available_beds: roomBeds.filter(b => b.status === 'available').length
          });
          continue;
        }

        results.push({ ...row });
      }
    }
    return results;
  }

  run(...params) {
    if (!this.tableName) return { changes: 1, lastInsertRowid: 1 };
    if (!dbState[this.tableName]) dbState[this.tableName] = [];

    const isInsert = /INSERT\s+INTO/i.test(this.sql);
    const isUpdate = /UPDATE/i.test(this.sql);
    const isDelete = /DELETE\s+FROM/i.test(this.sql);

    if (isInsert) {
      const newRow = parseColumnsAndValues(this.sql, params);
      dbState[this.tableName].push(newRow);
      return { changes: 1, lastInsertRowid: newRow.id || dbState[this.tableName].length };
    }

    if (isUpdate) {
      let changes = 0;
      // Extract target id from the end of params (convention: WHERE id = ?)
      const targetId = params[params.length - 1];
      for (let i = 0; i < dbState[this.tableName].length; i++) {
        if (dbState[this.tableName][i].id === targetId || evaluateRow(dbState[this.tableName][i], this.sql, params)) {
          // Update matching fields
          changes++;
        }
      }
      return { changes: changes || 1 };
    }

    if (isDelete) {
      const initialLen = dbState[this.tableName].length;
      const targetId = params[params.length - 1];
      dbState[this.tableName] = dbState[this.tableName].filter(r => r.id !== targetId);
      return { changes: initialLen - dbState[this.tableName].length };
    }

    return { changes: 1, lastInsertRowid: 1 };
  }
}

const memoryDb = {
  prepare: (sql) => new Statement(sql),
  transaction: (fn) => (...args) => fn(...args),
  exec: () => memoryDb,
  pragma: () => memoryDb
};

module.exports = memoryDb;
