const submissionsService = require('./submissions.service');
const { submissionSchema } = require('./submissions.schema');

async function createSubmission(req, res) {
  try {
    // 1. Honeypot check — if filled by bot (any truthy, non-empty string/number/boolean), silently return 200
    const rawHoneypot = req.body?.honeypot;
    const isBot =
      rawHoneypot !== undefined &&
      rawHoneypot !== null &&
      rawHoneypot !== false &&
      String(rawHoneypot).trim().length > 0;

    if (isBot) {
      return res.status(200).json({
        success: true,
        message: 'Submission received'
      });
    }

    // 2. Validate request body with Zod schema
    const parsed = submissionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.issues || parsed.error.errors
      });
    }

    const { widget_id, data } = parsed.data;

    // Extract real client IP (handling proxies, arrays, testing headers, sockets)
    const forwardedHeader = req.headers['x-forwarded-for'];
    const forwardedFirst = Array.isArray(forwardedHeader)
      ? forwardedHeader[0]
      : forwardedHeader;

    const ip =
      req.headers['x-mock-ip'] ||
      forwardedFirst?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress;

    // 3 & 4. Verify widget exists and create submission (normalizing widget_id)
    const submission = await submissionsService.createSubmission(widget_id.toLowerCase(), data, ip);

    // 5. Return 201 Created
    return res.status(201).json({
      success: true,
      id: submission.id
    });
  } catch (err) {
    if (err.status === 404 || err.message === 'Widget not found') {
      return res.status(404).json({ error: 'Widget not found' });
    }
    return res.status(err.status || 400).json({ error: err.message });
  }
}

async function getWidgetConfig(req, res) {
  try {
    const { widgetId } = req.params;
    const config = await submissionsService.getWidgetConfig(widgetId);

    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).json(config);
  } catch (err) {
    if (err.status === 404 || err.message === 'Widget not found') {
      return res.status(404).json({ error: 'Widget not found' });
    }
    return res.status(err.status || 400).json({ error: err.message });
  }
}

module.exports = {
  createSubmission,
  getWidgetConfig
};
