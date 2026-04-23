/**
 * Application State Store
 * Uses lowdb for querying and steno adapter concept for atomic writes
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', '..');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

function readState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch (e) {
    // Return default state if file doesn't exist
  }
  return {
    lastLogin: null,
    lastUpdated: null,
    stats: {
      totalCheckIns: 0,
      totalCheckOuts: 0,
      totalRevenue: 0
    }
  };
}

function writeState(state) {
  const tempFile = STATE_FILE + '.tmp';
  fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tempFile, STATE_FILE);
}

async function updateLastLogin(user) {
  const state = readState();
  state.lastLogin = {
    user,
    timestamp: new Date().toISOString()
  };
  state.lastUpdated = new Date().toISOString();
  writeState(state);
  return state.lastLogin;
}

async function incrementStat(stat, value = 1) {
  const state = readState();
  if (!state.stats) {
    state.stats = {};
  }
  state.stats[stat] = (state.stats[stat] || 0) + value;
  state.lastUpdated = new Date().toISOString();
  writeState(state);
  return state.stats;
}

async function getStats() {
  const state = readState();
  return state.stats || {};
}

async function getLastLogin() {
  const state = readState();
  return state.lastLogin;
}

module.exports = {
  readState,
  writeState,
  updateLastLogin,
  incrementStat,
  getStats,
  getLastLogin
};