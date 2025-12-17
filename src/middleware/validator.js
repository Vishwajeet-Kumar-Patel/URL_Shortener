const { body, validationResult } = require('express-validator');

/**
 * Validation rules for URL creation
 */
const validateUrlCreation = [
  body('url')
    .notEmpty()
    .withMessage('URL is required')
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Invalid URL format')
    .isLength({ max: 2048 })
    .withMessage('URL is too long'),
  
  body('expiresIn')
    .optional()
    .isInt({ min: 60, max: 31536000 })
    .withMessage('Expiration must be between 60 seconds and 1 year'),
];

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  next();
};

module.exports = {
  validateUrlCreation,
  handleValidationErrors,
};
