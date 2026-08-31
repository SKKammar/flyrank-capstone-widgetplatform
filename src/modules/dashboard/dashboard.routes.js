const router = require('express').Router();
const authMiddleware = require('../../middleware/auth.middleware');
const { getSubmissions, getStats } = require('./dashboard.controller');

router.use(authMiddleware);

router.get('/submissions', getSubmissions);
router.get('/stats', getStats);

module.exports = router;
