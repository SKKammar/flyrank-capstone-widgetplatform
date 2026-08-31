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
  fields: z
    .array(fieldSchema)
    .min(1)
    .refine(
      (fields) => {
        const names = fields.map((f) => f.name.toLowerCase().trim());
        return new Set(names).size === names.length;
      },
      { message: 'Field names within a widget must be unique' }
    ),
  button_text: z.string().optional(),
  display_options: z.record(z.string(), z.any()).optional()
});

const updateWidgetSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  type: z.enum(['signup_form', 'cta', 'popover']).optional(),
  fields: z
    .array(fieldSchema)
    .min(1)
    .refine(
      (fields) => {
        const names = fields.map((f) => f.name.toLowerCase().trim());
        return new Set(names).size === names.length;
      },
      { message: 'Field names within a widget must be unique' }
    )
    .optional(),
  button_text: z.string().optional(),
  display_options: z.record(z.string(), z.any()).optional()
});

module.exports = {
  createWidgetSchema,
  updateWidgetSchema
};
