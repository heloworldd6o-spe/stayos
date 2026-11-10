let app;
let initError = null;

try {
  app = require('../server/index');
} catch (err) {
  initError = err;
  console.error('💥 StayOS API Initialization Error:', err);
}

module.exports = (req, res) => {
  // Ensure req.url has /api prefix for Express routing if stripped by Vercel
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + req.url;
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-organization-id');

  // Parse string body if Vercel delivers it unparsed
  if (req.body && typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
    } catch (e) {}
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (initError) {
    return res.status(500).json({
      error: `Server Initialization Failed: ${initError.message}`,
      stack: initError.stack
    });
  }

  try {
    return app(req, res);
  } catch (err) {
    console.error('💥 StayOS Request Processing Error:', err);
    return res.status(500).json({
      error: `Request Processing Failed: ${err.message}`,
      stack: err.stack
    });
  }
};
