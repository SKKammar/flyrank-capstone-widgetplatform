const router = require('express').Router();
const authMiddleware = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const { createWidgetSchema, updateWidgetSchema } = require('./widgets.schema');
const {
  getUserWidgets,
  createWidget,
  getWidgetById,
  updateWidget,
  deleteWidget,
  getEmbedSnippet
} = require('./widgets.controller');

// Enforce authentication on all widget routes
router.use(authMiddleware);

router.get('/', getUserWidgets);
router.post('/', validate(createWidgetSchema), createWidget);
router.get('/:id', getWidgetById);
router.put('/:id', validate(updateWidgetSchema), updateWidget);
router.delete('/:id', deleteWidget);
router.get('/:id/embed', getEmbedSnippet);

module.exports = router;
