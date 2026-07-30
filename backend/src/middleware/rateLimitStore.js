'use strict';

const { Redis } = require('@upstash/redis');

const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;

let redis = null;
let redisAvailable = false;

if (KV_REST_API_URL && KV_REST_API_TOKEN) {
  try {
    const timeoutFetch = (url, init) =>
      fetch(url, { ...init, signal: AbortSignal.timeout(5000) });
    redis = new Redis({ url: KV_REST_API_URL, token: KV_REST_API_TOKEN, fetch: timeoutFetch });
    redisAvailable = true;
  } catch {
    redisAvailable = false;
  }
}

/**
 * Upstash Redis store for express-rate-limit (v8+).
 * Falls back to memory store when Redis is unavailable.
 */
class UpstashStore {
  constructor(prefix = 'rl:') {
    this.prefix = prefix;
    this.windowMs = 60000;
    this.memoryFallback = new Map();
    // Periodic cleanup of expired memory entries (C25)
    this._cleanupTimer = setInterval(() => this.cleanupExpired(), 300000);
    if (this._cleanupTimer.unref) this._cleanupTimer.unref();
  }

  async init(options) {
    if (options?.windowMs) this.windowMs = options.windowMs;
  }

  async increment(key) {
    const fullKey = this.prefix + key;
    const now = Date.now();
    const resetTime = new Date(now + this.windowMs);

    if (!redisAvailable) {
      // Fallback to memory
      const entry = this.memoryFallback.get(fullKey);
      if (!entry || now > entry.resetTime) {
        const newEntry = { totalHits: 1, resetTime };
        this.memoryFallback.set(fullKey, newEntry);
        return { totalHits: 1, resetTime };
      }
      entry.totalHits += 1;
      return {
        totalHits: entry.totalHits,
        resetTime: new Date(entry.resetTime),
      };
    }

    try {
      const member = `${now}-${Math.random().toString(36).slice(2, 8)}`;
      const multi = redis.multi();
      multi.zadd(fullKey, { score: now, member });
      multi.zremrangebyscore(fullKey, 0, now - this.windowMs);
      multi.zcard(fullKey);
      multi.expire(fullKey, Math.ceil(this.windowMs / 1000) + 5);
      const results = await multi.exec();
      const totalHits = results[2] || 0;
      return { totalHits, resetTime };
    } catch {
      // Fall back to memory on Redis error (not recursive — direct memory access)
      const entry = this.memoryFallback.get(fullKey);
      if (!entry || now > entry.resetTime) {
        const newEntry = { totalHits: 1, resetTime };
        this.memoryFallback.set(fullKey, newEntry);
        return { totalHits: 1, resetTime };
      }
      entry.totalHits += 1;
      return {
        totalHits: entry.totalHits,
        resetTime: new Date(entry.resetTime),
      };
    }
  }

  async decrement(key) {
    const fullKey = this.prefix + key;
    if (!redisAvailable) {
      const entry = this.memoryFallback.get(fullKey);
      if (entry && entry.totalHits > 0) entry.totalHits -= 1;
      return;
    }
    try {
      const _member = `${Date.now()}`;
      await redis.zremrangebyrank(fullKey, -1, -1);
    } catch {
      /* */
    }
  }

  async resetKey(key) {
    const fullKey = this.prefix + key;
    if (redisAvailable) {
      try {
        await redis.del(fullKey);
      } catch {
        /* */
      }
    }
    this.memoryFallback.delete(fullKey);
  }

  /** Clean up expired entries from memory fallback (C25) */
  cleanupExpired() {
    const now = Date.now();
    for (const [key, entry] of this.memoryFallback) {
      if (now > entry.resetTime) {
        this.memoryFallback.delete(key);
      }
    }
  }
}

module.exports = { UpstashStore };

module.exports = { UpstashStore };
