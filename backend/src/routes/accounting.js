'use strict';

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { writeRateLimiter } = require('../middleware/rateLimiters');
const {
  getAccountingSummary,
  exportReport,
} = require('../controllers/accountingController');

// All accounting routes require admin/owner/operator/auth
router.use(requireAuth);
router.use(requireRole('admin', 'owner', 'operator', 'analyst'));

router.get('/summary', getAccountingSummary);
router.get('/export', writeRateLimiter, exportReport);

module.exports = router;
