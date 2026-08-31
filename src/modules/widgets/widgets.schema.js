const { z } = require('zod');

const fieldSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['text', 'email', 'tel', 'textarea']),
  required: z.boolean().optional()
});

const createWidgetSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  type: z.enum(['signup_form', 'cta', 'popover']),
  fields: z.array(fieldSchema).min(1),
  button_text: z.string().optional(),
  display_options: z.record(z.string(), z.any()).optional()
});

const updateWidgetSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  type: z.enum(['signup_form', 'cta', 'popover']).optional(),
  fields: z.array(fieldSchema).min(1).optional(),
  button_text: z.string().optional(),
  display_options: z.record(z.string(), z.any()).optional()
});

module.exports = {
  createWidgetSchema,
  updateWidgetSchema
};
