const cors = require('cors');

// Open CORS for public widget scripts and cross-origin form submissions
const publicCors = cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-mock-ip', 'x-forwarded-for']
});

const { ALLOWED_ADMIN_ORIGIN } = require('./env');

// Controlled CORS for admin endpoints (Strictly limits access to the Vercel Dashboard)
const adminCors = cors({
  origin: (origin, cb) => {
    // In production, we ONLY allow the exact ALLOWED_ADMIN_ORIGIN (e.g. https://my-dashboard.vercel.app)
    // If origin is undefined (e.g. curl/postman), we allow it only if not strictly enforced, but for maximum security we can block or allow.
    // Given the capstone context, we allow exact match or undefined (for local CLI testing).
    if (!origin || origin === ALLOWED_ADMIN_ORIGIN) {
      return cb(null, true);
    }
    return cb(new Error('CORS Policy Violation: Origin not allowed for Admin API'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-mock-ip', 'x-forwarded-for']
});

// Global preflight OPTIONS handler compatible with Express 5
function optionsPreflightHandler(req, res, next) {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-mock-ip, x-forwarded-for, x-requested-with, accept');
    res.header('Access-Control-Max-Age', '86400');
    return res.sendStatus(204);
  }
  next();
}

// JSON parse error handler for malformed payload syntax
function jsonErrorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  return next(err);
}

function configureAppMiddleware(app) {
  // Preflight handler
  app.use(optionsPreflightHandler);
}

module.exports = {
  publicCors,
  adminCors,
  optionsPreflightHandler,
  jsonErrorHandler,
  configureAppMiddleware
};
