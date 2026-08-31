const fs = require('fs');
const path = require('path');

const widgetScriptPath = path.join(__dirname, '../../../public/widget.js');

module.exports = function widgetScriptHandler(req, res) {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');

  try {
    let scriptContent = fs.readFileSync(widgetScriptPath, 'utf8');

    // If widget id is passed as query parameter, prepend default definition
    if (req.query && req.query.id) {
      const safeId = String(req.query.id).replace(/[^a-zA-Z0-9_-]/g, '');
      const prefix = `window.__FLYRANK_WIDGET_ID__ = "${safeId}";\n`;
      return res.status(200).send(prefix + scriptContent);
    }

    return res.status(200).send(scriptContent);
  } catch (err) {
    console.error('Error serving widget.js:', err);
    return res.status(500).send('console.error("FlyRank widget script unavailable");');
  }
};
