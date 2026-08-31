const widgetsService = require('./widgets.service');

async function getUserWidgets(req, res) {
  try {
    const widgets = await widgetsService.getUserWidgets(req.user.userId);
    return res.status(200).json(widgets);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

async function createWidget(req, res) {
  try {
    const data = req.validatedBody || req.body;
    const widget = await widgetsService.createWidget(req.user.userId, data);
    return res.status(201).json(widget);
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }
}

async function getWidgetById(req, res) {
  try {
    const widget = await widgetsService.getWidgetById(req.params.id, req.user.userId);
    return res.status(200).json(widget);
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }
}

async function updateWidget(req, res) {
  try {
    const data = req.validatedBody || req.body;
    const updated = await widgetsService.updateWidget(req.params.id, req.user.userId, data);
    return res.status(200).json(updated);
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }
}

async function deleteWidget(req, res) {
  try {
    await widgetsService.deleteWidget(req.params.id, req.user.userId);
    return res.status(204).send();
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }
}

async function getEmbedSnippet(req, res) {
  try {
    // Verify widget exists and user owns it
    const widget = await widgetsService.getWidgetById(req.params.id, req.user.userId);
    const snippet = widgetsService.generateEmbedSnippet(req.params.id, widget.version || 1);
    if (req.query.format === 'json') {
      return res.status(200).json({ snippet, version: widget.version || 1 });
    }
    return res.status(200).send(snippet);
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }
}

module.exports = {
  getUserWidgets,
  createWidget,
  getWidgetById,
  updateWidget,
  deleteWidget,
  getEmbedSnippet
};
