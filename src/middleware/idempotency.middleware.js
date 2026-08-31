const db = require('../config/db');

/**
 * Idempotency Middleware
 * If a request provides an Idempotency-Key header, we guarantee the exact same request
 * is only processed once. On subsequent retries, we return the cached response.
 */
async function idempotencyMiddleware(req, res, next) {
  const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];

  if (!idempotencyKey) {
    return next(); // No key provided, process normally
  }

  try {
    // 1. Check if we have already processed this exact key
    const existing = await db('idempotency_keys')
      .where({ key: idempotencyKey, request_path: req.originalUrl })
      .first();

    if (existing) {
      console.log(`[IDEMPOTENCY HIT] Returning cached response for key: ${idempotencyKey}`);
      // Parse JSON response body and return instantly
      const body = typeof existing.response_body === 'string' 
        ? JSON.parse(existing.response_body) 
        : existing.response_body;
        
      return res.status(existing.status_code).json(body);
    }

    // 2. We haven't seen it yet. We need to intercept the response so we can save it.
    // Monkey-patch res.json to capture the response body before sending it out.
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      // Restore original json function to prevent multiple calls
      res.json = originalJson;

      // We only cache successful POST creations (2xx codes) to avoid caching validation errors
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Save to DB asynchronously (fire-and-forget, don't block response)
        db('idempotency_keys')
          .insert({
            key: idempotencyKey,
            request_path: req.originalUrl,
            response_body: JSON.stringify(body),
            status_code: res.statusCode
          })
          .catch((err) => {
            console.error(`[IDEMPOTENCY SAVE ERROR] Failed to cache key ${idempotencyKey}:`, err.message);
          });
      }

      // Send actual response
      return originalJson(body);
    };

    next();
  } catch (err) {
    console.error(`[IDEMPOTENCY MIDDLEWARE ERROR]`, err.message);
    next();
  }
}

module.exports = { idempotencyMiddleware };
