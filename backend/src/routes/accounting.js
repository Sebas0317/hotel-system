'use strict';

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getAccountingSummary, exportReport } = require('../controllers/accountingController');

// All accounting routes require admin auth
router.use(requireAuth);

router.get('/summary', getAccountingSummary);
router.get('/export', exportReport);

module.exports = router;
