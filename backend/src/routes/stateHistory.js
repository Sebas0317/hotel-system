'use strict';

const express = require('express');
const router = express.Router();
const { getAllStateHistory, addStateChange, getStateHistoryByRoom } = require('../controllers/stateHistoryController');

router.get('/', getAllStateHistory);
router.post('/', addStateChange);
router.get('/room/:roomId', getStateHistoryByRoom);

module.exports = router;