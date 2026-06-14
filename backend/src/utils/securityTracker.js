'use strict';

const { logger } = require('./logger');
const persistence = require('../data/persistence');

const MAX_EVENTS = 1000;

// In-memory store — primary for speed, persistence module as backup
const memoryAttempts = [];
const memoryEvents = [];
const _bootstrappedAttempts = false;
const _bootstrappedEvents = false;

const DEFAULTS = {
  login: {
    maxAttempts: 5,
    lockoutMs: 15 * 60 * 1000,
    windowMs: 10 * 60 * 1000,
  },
  '2fa': {
    maxAttempts: 5,
    lockoutMs: 15 * 60 * 1000,
    windowMs: 10 * 60 * 1000,
  },
  code_verify: {
    maxAttempts: 5,
    lockoutMs: 15 * 60 * 1000,
    windowMs: 10 * 60 * 1000,
  },
  recovery: {
    maxAttempts: 3,
    lockoutMs: 30 * 60 * 1000,
    windowMs: 15 * 60 * 1000,
  },
};

function now() {
  return Date.now();
}

async function getAttempts() {
  // Always reload from persistence to share state across processes/instances (C18)
  const data = await persistence.getSecurityAttempts();
  memoryAttempts.length = 0;
  memoryAttempts.push(...data);
  return memoryAttempts;
}

async function saveAttempts(data) {
  if (data !== memoryAttempts) {
    memoryAttempts.length = 0;
    memoryAttempts.push(...data);
  }
  await persistence.setSecurityAttempts(data);
}

async function getEvents() {
  // Always reload from persistence to share state across processes/instances (C18)
  const data = await persistence.getSecurityEvents();
  memoryEvents.length = 0;
  memoryEvents.push(...data);
  return memoryEvents;
}

async function saveEvents(data) {
  if (data !== memoryEvents) {
    memoryEvents.length = 0;
    memoryEvents.push(...data);
  }
  await persistence.setSecurityEvents(data);
}

function createKey(userId, ip, action) {
  return `${action}:${userId || '?'}:${ip || '?'}`;
}

async function recordAttempt({ userId, ip, action, success }) {
  const actionCfg = DEFAULTS[action] || DEFAULTS.login;
  const attempts = await getAttempts();
  const key = createKey(userId, ip, action);
  const existing = attempts.find((a) => a.key === key);

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

  const entry = attempts.find((a) => a.key === key);
  const blocked = entry.lockUntil > now();
  const remaining = Math.max(0, actionCfg.maxAttempts - entry.count);

  return { blocked, lockUntil: entry.lockUntil || 0, remaining };
}

async function isBlocked({ userId, ip, action }) {
  const actionCfg = DEFAULTS[action] || DEFAULTS.login;
  const attempts = await getAttempts();
  const key = createKey(userId, ip, action);
  const entry = attempts.find((a) => a.key === key);

  if (!entry)
    return { blocked: false, remaining: actionCfg.maxAttempts, lockUntil: 0 };

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
  const idx = attempts.findIndex((a) => a.key === key);
  if (idx !== -1) {
    attempts[idx].count = 0;
    attempts[idx].lockUntil = 0;
    attempts[idx].updatedAt = new Date().toISOString();
    attempts[idx].windowStart = 0;
    await saveAttempts(attempts);
  }
}

async function logSecurityEvent({
  type,
  userId,
  ip,
  action,
  detail,
  metadata,
}) {
  const events = await getEvents();
  events.push({
    id: `${Date.now()}-${require('node:crypto').randomBytes(3).toString('hex')}`,
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

  const logLevels = {
    block: 'warn',
    rate_limit: 'warn',
    failed_login: 'warn',
    account_locked: 'warn',
    suspicious: 'warn',
    success: 'info',
    info: 'info',
  };
  const level = logLevels[type] || 'info';
  logger[level](
    { security: true, type, userId, ip, action, detail },
    `Security: ${detail || type}`
  );
}

async function getSecurityEvents({ limit = 100, type, userId } = {}) {
  let events = await getEvents();
  if (type) events = events.filter((e) => e.type === type);
  if (userId) events = events.filter((e) => e.userId === userId);
  return events.slice(-Math.min(limit, MAX_EVENTS)).reverse();
}

async function cleanupOldEntries() {
  const attempts = await getAttempts();
  const cutoff = now() - 7 * 24 * 60 * 60 * 1000;
  const active = attempts.filter((a) => {
    if (a.lockUntil > now()) return true;
    const updated = new Date(a.updatedAt).getTime();
    return updated > cutoff;
  });
  if (active.length < attempts.length) {
    // Merge rather than replace: keep entries added by concurrent recordAttempt
    const currentAttempts = await getAttempts();
    const merged = active.concat(
      currentAttempts.filter((c) => !active.find((a) => a.key === c.key))
    );
    await saveAttempts(merged);
  }
}

const cleanupTimer = setInterval(cleanupOldEntries, 60 * 60 * 1000);
if (cleanupTimer.unref) cleanupTimer.unref();

module.exports = {
  recordAttempt,
  isBlocked,
  resetAttempts,
  logSecurityEvent,
  getSecurityEvents,
  DEFAULTS,
  cleanupTimer,
};
