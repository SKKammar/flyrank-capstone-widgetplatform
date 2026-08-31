const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.issues || parsed.error.errors
      });
    }
    req.validatedBody = parsed.data;
    return next();
  } catch (err) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.message
    });
  }
};

module.exports = validate;
