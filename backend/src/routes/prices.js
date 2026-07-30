'use strict';

const express = require('express');
const router = express.Router();
const pricesController = require('../controllers/pricesController');
const { requireAuth } = require('../middleware/auth');

// GET /prices - Get all prices (tariffs + products) — public
router.get('/', pricesController.getAllPrices);

// PUT /prices - Update all prices — admin only
router.put('/', requireAuth, pricesController.updatePrices);

module.exports = router;
