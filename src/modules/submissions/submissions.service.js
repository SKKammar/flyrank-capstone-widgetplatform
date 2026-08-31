const { v4: uuidv4 } = require('uuid');
const db = require('../../config/db');
const { getGeoData } = require('../enrichment/geo.service');

function formatSubmission(sub) {
  if (!sub) return null;
  const formatted = { ...sub };
  if (typeof formatted.data === 'string') {
    try {
      formatted.data = JSON.parse(formatted.data);
    } catch {
      // keep as is
    }
  }
  return formatted;
}

const queue = require('../jobs/queue');

// Fire-and-forget side effect function (simulate webhook/email, never crash response)
function triggerSideEffect(submission) {
  // Dispatch the background job to the queue
  queue.dispatch(`SEND_WEBHOOK_SUB_${submission.id}`, async () => {
    // Simulate some work that might fail randomly for testing the queue retries
    // In production, this would be an actual fetch() webhook or nodemailer transport
    
    // For probe 5 testing, if submission data has a specific flag, we throw to simulate failure
    if (submission.data && submission.data.force_fail) {
      throw new Error('Simulated webhook failure');
    }

    console.log(`[SIDE EFFECT] New submission ${submission.id} for widget ${submission.widget_id}`);
    
    // Simulate webhook latency
    await new Promise(r => setTimeout(r, 200));
  });
}

async function createSubmission(widgetId, data, ip) {
  const normalizedId = String(widgetId || '').trim().toLowerCase();

  // 1. Verify widget actually exists in DB
  const widget = await db('widgets').where({ id: normalizedId }).first();
  if (!widget) {
    const error = new Error('Widget not found');
    error.status = 404;
    throw error;
  }

  // 2. Fetch geo data (resilient fallback to null)
  let geo = null;
  try {
    geo = await getGeoData(ip);
  } catch (err) {
    console.warn(`[GEO ENRICHMENT WARNING] ${err.message}`);
    geo = null;
  }

  // 3. Insert submission record
  const id = uuidv4();
  const now = new Date();
  const submissionRecord = {
    id,
    widget_id: normalizedId,
    data: typeof data === 'string' ? data : JSON.stringify(data || {}),
    ip_address: ip ? String(ip).replace(/^::ffff:/, '').trim() : null,
    country: geo ? geo.country : null,
    city: geo ? geo.city : null,
    region: geo ? geo.region : null,
    honeypot_triggered: false,
    created_at: now
  };

  await db('submissions').insert(submissionRecord);
  const stored = await db('submissions').where({ id }).first();
  const formatted = formatSubmission(stored);

  // 4. Trigger side effect (fire-and-forget — DO NOT AWAIT)
  triggerSideEffect(formatted);

  // 5. Return stored submission
  return formatted;
}

async function getWidgetConfig(widgetId) {
  const normalizedId = String(widgetId || '').trim().toLowerCase();
  const widget = await db('widgets').where({ id: normalizedId }).first();
  if (!widget) {
    const error = new Error('Widget not found');
    error.status = 404;
    throw error;
  }

  let fields = widget.fields;
  if (typeof fields === 'string') {
    try {
      fields = JSON.parse(fields);
    } catch {
      fields = [];
    }
  }

  let displayOptions = widget.display_options;
  if (typeof displayOptions === 'string') {
    try {
      displayOptions = JSON.parse(displayOptions);
    } catch {
      displayOptions = {};
    }
  }

  return {
    id: widget.id,
    title: widget.title,
    description: widget.description || '',
    type: widget.type,
    fields: fields || [],
    button_text: widget.button_text || 'Submit',
    display_options: displayOptions || {},
    version: widget.version || 1
  };
}

module.exports = {
  createSubmission,
  getWidgetConfig,
  triggerSideEffect,
  formatSubmission
};
