'use strict';

const express = require('express');
const router = express.Router();
const { getAllHistory, addHistoryEntry, getHistoryByRoom } = require('../controllers/historyController');

router.get('/', getAllHistory);
router.post('/', addHistoryEntry);
router.get('/room/:roomId', getHistoryByRoom);

module.exports = router;