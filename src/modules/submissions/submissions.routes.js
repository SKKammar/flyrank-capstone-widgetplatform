const router = require('express').Router();
const { submissionLimiter, widgetLimiter } = require('../../middleware/rateLimit.middleware');
const { createSubmission, getWidgetConfig } = require('./submissions.controller');

// Rate limiters applied only to POST submission
router.post('/', submissionLimiter, widgetLimiter, createSubmission);

// Public widget config endpoints (support both :widgetId/config and config/:widgetId)
router.get('/config/:widgetId', getWidgetConfig);
router.get('/:widgetId/config', getWidgetConfig);

module.exports = router;
