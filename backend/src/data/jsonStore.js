'use strict';

/**
 * Bridge module — re-exports persistence.js with saveXxx aliases
 * so controllers using require('../data/jsonStore') keep working.
 */
const mod = require('./persistence');

module.exports = {
  getRooms: mod.getRooms,
  getConsumos: mod.getConsumos,
  getHistory: mod.getHistory,
  getStateHistory: mod.getStateHistory,
  saveRooms: mod.setRooms,
  saveConsumos: mod.setConsumos,
  saveHistory: mod.setHistory,
  saveStateHistory: mod.setStateHistory,
};
