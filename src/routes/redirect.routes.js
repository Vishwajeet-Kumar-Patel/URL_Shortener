const express = require('express');
const URLController = require('../controllers/url.controller');

const router = express.Router();

/**
 * @route   GET /:shortCode
 * @desc    Redirect to original URL
 * @access  Public
 */
router.get('/:shortCode', URLController.redirectToOriginal);

module.exports = router;
