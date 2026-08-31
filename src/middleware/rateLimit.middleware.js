const rateLimit = require('express-rate-limit');

function extractClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const firstForwarded = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return (
    req.headers['x-mock-ip'] ||
    firstForwarded?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

// Per-IP rate limit for submissions
const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // 20 submissions per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => extractClientIp(req),
  message: { error: 'Too many requests, please try again later' }
});

// Per-Widget rate limit for submissions (keyed by widget_id, with IP fallback)
const widgetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 submissions per widget per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (req.body && req.body.widget_id && typeof req.body.widget_id === 'string') {
      return `widget_${req.body.widget_id.toLowerCase()}`;
    }
    return `ip_${extractClientIp(req)}`;
  },
  message: { error: 'Too many requests for this widget, please try again later' }
});

module.exports = { submissionLimiter, widgetLimiter };
