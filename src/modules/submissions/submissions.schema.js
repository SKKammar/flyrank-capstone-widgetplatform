const { z } = require('zod');

const submissionSchema = z.object({
  widget_id: z.string().uuid(),
  data: z
    .record(z.string(), z.any())
    .refine((obj) => Object.keys(obj).length <= 20, {
      message: 'Submissions can have at most 20 fields'
    }),
  honeypot: z.string().max(0).optional()
});

module.exports = { submissionSchema };
