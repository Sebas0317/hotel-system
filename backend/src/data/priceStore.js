'use strict';

const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

const PRICES_FILE = path.join(__dirname, '..', '..', 'prices.json');

// ── Async file locking ──
let fileLock = false;

async function acquireLock() {
  while (fileLock) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  fileLock = true;
}

function releaseLock() {
  fileLock = false;
}

// ── In-memory cache ──
let cachedPrices = null;
let cacheExpiry = 0;
const CACHE_TTL = 30000; // Prices change rarely, cache longer

function getFromCache() {
  if (cachedPrices && Date.now() < cacheExpiry) {
    return cachedPrices;
  }
  return null;
}

function setInCache(data) {
  cachedPrices = data;
  cacheExpiry = Date.now() + CACHE_TTL;
}

function invalidateCache() {
  cachedPrices = null;
  cacheExpiry = 0;
}

// ── Async read/write ──
async function getPrices() {
  const cached = getFromCache();
  if (cached !== null) return cached;

  try {
    const data = await fs.readFile(PRICES_FILE, 'utf-8');
    const prices = data ? JSON.parse(data) : null;
    if (prices) setInCache(prices);
    return prices;
  } catch (err) {
    logger.error('Failed to read prices file', { file: PRICES_FILE, error: err.message });
    return null;
  }
}

async function savePrices(data) {
  await acquireLock();
  try {
    await fs.writeFile(PRICES_FILE, JSON.stringify(data, null, 2), 'utf-8');
    invalidateCache();
  } finally {
    releaseLock();
  }
}

module.exports = { getPrices, savePrices, invalidateCache };
