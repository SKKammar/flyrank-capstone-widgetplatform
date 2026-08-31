const jwt = require('jsonwebtoken');
const env = require('../config/env');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || typeof authHeader !== 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match || !match[1]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = match[1].trim();

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (!payload || !payload.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = { userId: payload.userId };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = authMiddleware;
