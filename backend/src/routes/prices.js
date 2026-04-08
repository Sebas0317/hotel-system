'use strict';

const express = require('express');
const router = express.Router();
const pricesController = require('../controllers/pricesController');

// GET /prices - Get all prices (tariffs + products)
router.get('/', pricesController.getAllPrices);

// PUT /prices - Update all prices
router.put('/', pricesController.updatePrices);

module.exports = router;
