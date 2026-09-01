const cors = require('cors');

// Open CORS for public widget scripts and cross-origin form submissions
const publicCors = cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-mock-ip', 'x-forwarded-for']
});

// Controlled CORS for admin endpoints
const adminCors = cors({
  origin: ['http://localhost:3000', 'http://localhost:5501'],
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
