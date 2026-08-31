const { v4: uuidv4 } = require('uuid');
const db = require('../../config/db');

function formatWidget(widget) {
  if (!widget) return null;
  const formatted = { ...widget };
  if (typeof formatted.fields === 'string') {
    try {
      formatted.fields = JSON.parse(formatted.fields);
    } catch {
      // keep as is
    }
  }
  if (typeof formatted.display_options === 'string') {
    try {
      formatted.display_options = JSON.parse(formatted.display_options);
    } catch {
      // keep as is
    }
  }
  return formatted;
}

async function createWidget(userId, data) {
  const id = uuidv4();
  const now = new Date();

  const insertData = {
    id,
    user_id: userId,
    title: data.title,
    description: data.description || null,
    type: data.type,
    fields: typeof data.fields === 'string' ? data.fields : JSON.stringify(data.fields),
    button_text: data.button_text || 'Submit',
    display_options: data.display_options
      ? (typeof data.display_options === 'string' ? data.display_options : JSON.stringify(data.display_options))
      : JSON.stringify({}),
    version: 1,
    created_at: now,
    updated_at: now
  };

  await db('widgets').insert(insertData);
  const created = await db('widgets').where({ id, user_id: userId }).first();
  return formatWidget(created);
}

async function getUserWidgets(userId) {
  const rows = await db('widgets').where({ user_id: userId }).orderBy('created_at', 'desc');
  return rows.map(formatWidget);
}

async function getWidgetById(widgetId, userId) {
  const existingAny = await db('widgets').where({ id: widgetId }).first();
  if (!existingAny) {
    const error = new Error('Widget not found');
    error.status = 404;
    throw error;
  }
  if (existingAny.user_id !== userId) {
    const error = new Error('Forbidden: Widget belongs to another user');
    error.status = 403;
    throw error;
  }
  return formatWidget(existingAny);
}

async function updateWidget(widgetId, userId, data) {
  const existing = await getWidgetById(widgetId, userId);

  const updateData = {
    version: (existing.version || 1) + 1,
    updated_at: new Date()
  };

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.fields !== undefined) {
    updateData.fields = typeof data.fields === 'string' ? data.fields : JSON.stringify(data.fields);
  }
  if (data.button_text !== undefined) updateData.button_text = data.button_text;
  if (data.display_options !== undefined) {
    updateData.display_options = typeof data.display_options === 'string' ? data.display_options : JSON.stringify(data.display_options);
  }

  await db('widgets')
    .where({ id: widgetId, user_id: userId })
    .update(updateData);

  const updated = await db('widgets').where({ id: widgetId, user_id: userId }).first();
  return formatWidget(updated);
}

async function deleteWidget(widgetId, userId) {
  await getWidgetById(widgetId, userId);
  await db('widgets').where({ id: widgetId, user_id: userId }).del();
  return true;
}

function generateEmbedSnippet(widgetId, version = 1) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  return `<script src="${baseUrl}/widget.js?id=${widgetId}&v=${version}"></script>`;
}

module.exports = {
  createWidget,
  getUserWidgets,
  getWidgetById,
  updateWidget,
  deleteWidget,
  generateEmbedSnippet,
  formatWidget
};
