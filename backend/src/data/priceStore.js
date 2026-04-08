'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const PRICES_FILE = path.join(__dirname, '..', '..', 'prices.json');

let fileLock = false;

function acquireLock() {
  if (fileLock) {
    throw new Error('prices.json is currently being written to, please retry');
  }
  fileLock = true;
}

function releaseLock() {
  fileLock = false;
}

function getPrices() {
  try {
    const data = fs.readFileSync(PRICES_FILE, 'utf-8');
    return data ? JSON.parse(data) : null;
  } catch (err) {
    logger.error('Failed to read prices file', { file: PRICES_FILE, error: err.message });
    return null;
  }
}

function savePrices(data) {
  acquireLock();
  try {
    fs.writeFileSync(PRICES_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } finally {
    releaseLock();
  }
}

module.exports = { getPrices, savePrices };
