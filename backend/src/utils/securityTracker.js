'use strict';

const path = require('path');
const { readJsonFile, writeJsonFile } = require('../data/jsonStoreHelper');
const { logger } = require('./logger');

const ATTEMPTS_FILE = path.join(__dirname, '../../security-attempts.json');
const EVENTS_FILE = path.join(__dirname, '../../security-events.json');
const MAX_EVENTS = 1000;

// In-memory fallback for serverless environments (Vercel read-only filesystem)
const memoryAttempts = [];
const memoryEvents = [];
let memoryLoaded = false;

const DEFAULTS = {
  login: { maxAttempts: 5, lockoutMs: 15 * 60 * 1000, windowMs: 10 * 60 * 1000 },
  '2fa': { maxAttempts: 5, lockoutMs: 15 * 60 * 1000, windowMs: 10 * 60 * 1000 },
  code_verify: { maxAttempts: 5, lockoutMs: 15 * 60 * 1000, windowMs: 10 * 60 * 1000 },
  recovery: { maxAttempts: 3, lockoutMs: 30 * 60 * 1000, windowMs: 15 * 60 * 1000 },
};

function now() { return Date.now(); }

async function getAttempts() {
  const fromFile = await readJsonFile(ATTEMPTS_FILE, []);
  if (fromFile.length > 0) {
    memoryAttempts.length = 0;
    memoryAttempts.push(...fromFile);
    memoryLoaded = true;
    return fromFile;
  }
  if (!memoryLoaded && memoryAttempts.length === 0) {
    memoryLoaded = true;
  }
  return memoryAttempts;
}

async function saveAttempts(data) {
  memoryAttempts.length = 0;
  memoryAttempts.push(...data);
  await writeJsonFile(ATTEMPTS_FILE, data);
}

async function getEvents() {
  const fromFile = await readJsonFile(EVENTS_FILE, []);
  if (fromFile.length > 0) {
    memoryEvents.length = 0;
    memoryEvents.push(...fromFile);
    return fromFile;
  }
  return memoryEvents;
}

async function saveEvents(data) {
  memoryEvents.length = 0;
  memoryEvents.push(...data);
  await writeJsonFile(EVENTS_FILE, data);
}

function createKey(userId, ip, action) {
  return `${action}:${userId || '?'}:${ip || '?'}`;
}

async function recordAttempt({ userId, ip, action, success }) {
  const actionCfg = DEFAULTS[action] || DEFAULTS.login;
  const attempts = await getAttempts();
  const key = createKey(userId, ip, action);
  const existing = attempts.find(a => a.key === key);

  if (success) {
    if (existing) {
      existing.count = 0;
      existing.lockUntil = 0;
      existing.updatedAt = new Date().toISOString();
      existing.windowStart = 0;
    }
    await saveAttempts(attempts);
    return { blocked: false, remaining: actionCfg.maxAttempts };
  }

  if (!existing) {
    attempts.push({
      key,
      userId: userId || null,
      ip: ip || null,
      action,
      count: 1,
      lockUntil: 0,
      windowStart: now(),
      updatedAt: new Date().toISOString(),
    });
  } else {
    existing.count += 1;
    existing.updatedAt = new Date().toISOString();

    if (now() - existing.windowStart > actionCfg.windowMs) {
      existing.count = 1;
      existing.windowStart = now();
    }

    if (existing.count >= actionCfg.maxAttempts) {
      existing.lockUntil = now() + actionCfg.lockoutMs;
    }
  }

  await saveAttempts(attempts);

  const entry = attempts.find(a => a.key === key);
  const blocked = entry.lockUntil > now();
  const remaining = Math.max(0, actionCfg.maxAttempts - entry.count);

  return { blocked, lockUntil: entry.lockUntil || 0, remaining };
}

async function isBlocked({ userId, ip, action }) {
  const actionCfg = DEFAULTS[action] || DEFAULTS.login;
  const attempts = await getAttempts();
  const key = createKey(userId, ip, action);
  const entry = attempts.find(a => a.key === key);

  if (!entry) return { blocked: false, remaining: actionCfg.maxAttempts, lockUntil: 0 };

  if (entry.lockUntil > now()) {
    return { blocked: true, remaining: 0, lockUntil: entry.lockUntil };
  }

  if (now() - entry.windowStart > actionCfg.windowMs) {
    entry.count = 0;
    entry.windowStart = now();
    await saveAttempts(attempts);
    return { blocked: false, remaining: actionCfg.maxAttempts, lockUntil: 0 };
  }

  const remaining = Math.max(0, actionCfg.maxAttempts - entry.count);
  return { blocked: false, remaining, lockUntil: entry.lockUntil };
}

async function resetAttempts({ userId, ip, action }) {
  const attempts = await getAttempts();
  const key = createKey(userId, ip, action);
  const idx = attempts.findIndex(a => a.key === key);
  if (idx !== -1) {
    attempts[idx].count = 0;
    attempts[idx].lockUntil = 0;
    attempts[idx].updatedAt = new Date().toISOString();
    attempts[idx].windowStart = 0;
    await saveAttempts(attempts);
  }
}

async function logSecurityEvent({ type, userId, ip, action, detail, metadata }) {
  const events = await getEvents();
  events.push({
    id: `${Date.now()}-${require('crypto').randomBytes(3).toString('hex')}`,
    type,
    userId: userId || null,
    ip: ip || null,
    action: action || null,
    detail: detail || '',
    metadata: metadata || {},
    timestamp: new Date().toISOString(),
  });

  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }

  await saveEvents(events);

  const logLevels = { block: 'warn', rate_limit: 'warn', failed_login: 'warn', account_locked: 'warn', suspicious: 'warn', success: 'info', info: 'info' };
  const level = logLevels[type] || 'info';
  logger[level]({ security: true, type, userId, ip, action, detail }, `Security: ${detail || type}`);
}

async function getSecurityEvents({ limit = 100, type, userId } = {}) {
  let events = await getEvents();
  if (type) events = events.filter(e => e.type === type);
  if (userId) events = events.filter(e => e.userId === userId);
  return events.slice(-Math.min(limit, MAX_EVENTS)).reverse();
}

async function cleanupOldEntries() {
  const attempts = await getAttempts();
  const cutoff = now() - 7 * 24 * 60 * 60 * 1000;
  const active = attempts.filter(a => {
    if (a.lockUntil > now()) return true;
    const updated = new Date(a.updatedAt).getTime();
    return updated > cutoff;
  });
  if (active.length < attempts.length) {
    await saveAttempts(active);
  }
}

setInterval(cleanupOldEntries, 60 * 60 * 1000);

module.exports = {
  recordAttempt,
  isBlocked,
  resetAttempts,
  logSecurityEvent,
  getSecurityEvents,
  DEFAULTS,
};
