'use strict';

const persistence = require('./persistence');

async function getPrices() {
  return persistence.getPrices();
}

async function savePrices(data) {
  return persistence.setPrices(data);
}

module.exports = {
  getPrices,
  savePrices,
  invalidateCache: persistence.setPrices,
};
