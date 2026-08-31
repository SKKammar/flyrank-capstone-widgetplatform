const fs = require('fs');
const path = require('path');

const widgetScriptPath = path.join(__dirname, '../../../public/widget.js');

module.exports = function widgetScriptHandler(req, res) {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');

  try {
    let scriptContent = fs.readFileSync(widgetScriptPath, 'utf8');

    let prefix = '';
    if (req.query && req.query.id) {
      const safeId = String(req.query.id).replace(/[^a-zA-Z0-9_-]/g, '');
      prefix += `window.__FLYRANK_WIDGET_ID__ = "${safeId}";\n`;
    }
    if (req.query && req.query.v) {
      const safeVersion = String(req.query.v).replace(/[^0-9]/g, '');
      prefix += `window.__FLYRANK_WIDGET_VERSION__ = "${safeVersion}";\n`;
    }

    return res.status(200).send(prefix + scriptContent);
  } catch (err) {
    console.error('Error serving widget.js:', err);
    return res.status(500).send('console.error("FlyRank widget script unavailable");');
  }
};
