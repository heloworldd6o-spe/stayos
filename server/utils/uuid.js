const crypto = require('crypto');

/**
 * Universal UUID v4 generator using Node's native crypto module.
 * Works seamlessly in CommonJS environments (Node.js 14+ / 16+ / 18+ / 20+ / Vercel Serverless)
 * without external pure-ESM dependency conflicts.
 */
function v4() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

module.exports = {
  v4,
  uuidv4: v4,
  default: { v4, uuidv4: v4 }
};

