const express = require('express');
const { publicCors, adminCors, jsonErrorHandler } = require('./middleware');

const authRoutes = require('../modules/auth/auth.routes');
const widgetRoutes = require('../modules/widgets/widgets.routes');
const submissionRoutes = require('../modules/submissions/submissions.routes');
const dashboardRoutes = require('../modules/dashboard/dashboard.routes');
const widgetScriptHandler = require('../modules/widgets/widget-script.handler');

function configureRoutes(app) {
  // Health check endpoint
  app.get(['/', '/api/health', '/health'], (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'FlyRank Widget Platform',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // Public widget script asset
  app.get('/widget.js', publicCors, widgetScriptHandler);

  // Public submission endpoint — open CORS for cross-origin forms, 10kb limit
  app.use(
    '/api/submissions',
    publicCors,
    express.json({ limit: '10kb' }),
    jsonErrorHandler,
    submissionRoutes
  );

  // Admin routes — restricted CORS, JSON body parser
  app.use(
    '/api/auth',
    adminCors,
    express.json(),
    jsonErrorHandler,
    authRoutes
  );

  app.use(
    '/api/widgets',
    adminCors,
    express.json(),
    jsonErrorHandler,
    widgetRoutes
  );

  app.use(
    '/api/dashboard',
    adminCors,
    express.json(),
    jsonErrorHandler,
    dashboardRoutes
  );

  // Global JSON parse error fallback
  app.use(jsonErrorHandler);

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
}

module.exports = { configureRoutes };
