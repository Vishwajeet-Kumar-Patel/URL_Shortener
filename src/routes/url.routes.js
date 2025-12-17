const express = require('express');
const URLController = require('../controllers/url.controller');
const { createUrlLimiter, abuseDetection } = require('../middleware/rateLimiter');
const { validateUrlCreation, handleValidationErrors } = require('../middleware/validator');

const router = express.Router();

/**
 * @route   POST /api/shorten
 * @desc    Create a new short URL
 * @access  Public (rate limited)
 */
router.post(
  '/shorten',
  createUrlLimiter,
  abuseDetection,
  validateUrlCreation,
  handleValidationErrors,
  URLController.createShortUrl
);

/**
 * @route   GET /api/analytics/:shortCode
 * @desc    Get analytics for a short URL
 * @access  Public
 */
router.get('/analytics/:shortCode', URLController.getAnalytics);

/**
 * @route   DELETE /api/:shortCode
 * @desc    Delete a short URL
 * @access  Public (should be protected in production)
 */
router.delete('/:shortCode', URLController.deleteShortUrl);

/**
 * @route   GET /api/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', URLController.healthCheck);

module.exports = router;
