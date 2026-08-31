const rateLimit = require('express-rate-limit');

// Per-IP rate limit for submissions
const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // 20 submissions per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});

// Per-Widget rate limit for submissions (keyed by widget_id)
const widgetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 submissions per widget per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.body?.widget_id || 'unknown_widget';
  },
  message: { error: 'Too many requests for this widget, please try again later' }
});

module.exports = { submissionLimiter, widgetLimiter };
