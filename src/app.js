require('dotenv').config();
const express = require('express');
const { configureAppMiddleware } = require('./config/middleware');
const { configureRoutes } = require('./config/routes');

const app = express();

// 1. Configure app-level middleware (CORS preflight, global headers)
configureAppMiddleware(app);

// 2. Configure and mount all modular routes & error handlers
configureRoutes(app);

module.exports = app;
