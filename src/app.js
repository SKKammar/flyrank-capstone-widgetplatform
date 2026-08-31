require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./modules/auth/auth.routes');
const widgetRoutes = require('./modules/widgets/widgets.routes');
const submissionRoutes = require('./modules/submissions/submissions.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const widgetScriptHandler = require('./modules/widgets/widget-script.handler');

const app = express();

// Express 5 compatible CORS configuration (cors() middleware automatically handles preflight OPTIONS)
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-mock-ip, x-forwarded-for');
    return res.sendStatus(204);
  }
  next();
});

// Public widget script asset
app.get('/widget.js', cors(), widgetScriptHandler);

// Public submission route — open CORS for cross-origin forms, 10kb limit
app.use(
  '/api/submissions',
  cors(),
  express.json({ limit: '10kb' }),
  (err, req, res, next) => {
    if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
    return next(err);
  },
  submissionRoutes
);

// Admin routes CORS
const adminCors = cors({
  origin: (origin, cb) => cb(null, true),
  credentials: true
});

app.use(
  '/api/auth',
  adminCors,
  express.json(),
  (err, req, res, next) => {
    if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
    return next(err);
  },
  authRoutes
);

app.use(
  '/api/widgets',
  adminCors,
  express.json(),
  (err, req, res, next) => {
    if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
    return next(err);
  },
  widgetRoutes
);

app.use(
  '/api/dashboard',
  adminCors,
  express.json(),
  (err, req, res, next) => {
    if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
    return next(err);
  },
  dashboardRoutes
);

// Global JSON error handler
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  return next(err);
});

// Fallback 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Global unhandled error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  const status = err.status || 500;
  return res.status(status).json({ error: err.message || 'Internal Server Error' });
});

module.exports = app;
