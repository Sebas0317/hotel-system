/**
 * NodeCache configuration for EcoBosque Hotel System.
 * Replaces custom Map-based cache with:
 * - TTL per key
 * - Automatic cleanup
 * - Stats tracking
 * - Events
 */
'use strict';

const NodeCache = require('node-cache');

// Cache configuration
const cacheConfig = {
  stdTTL: 60 * 5, // Default: 5 minutes
  checkperiod: 60 * 2, // Check for expired keys every 2 minutes
  useClones: false, // Performance: don't clone values
  deleteOnExpire: true, // Auto-delete expired keys
  maxKeys: 1000, // Limit cache size
};

const cache = new NodeCache(cacheConfig);

// Cache stats logging (for monitoring)
setInterval(() => {
  const stats = cache.getStats();
  if (stats.keys > 0) {
    // Only log if cache is being used
    console.log(`[Cache] Keys: ${stats.keys}, Hits: ${stats.hits}, Misses: ${stats.misses}, HitRate: ${stats.hitRate.toFixed(2)}`);
  }
}, 60 * 1000 * 5); // Every 5 minutes

/**
 * Cache middleware factory.
 * Caches GET request responses.
 *
 * Usage:
 *   router.get('/rooms', cacheMiddleware('rooms', 300), getRoomsHandler);
 */
function cacheMiddleware(keyPrefix, ttl = cacheConfig.stdTTL) {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `${keyPrefix}:${req.originalUrl || req.url}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      // Return cached response
      return res.json(cached);
    }

    // Intercept res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Only cache successful responses
      if (res.statusCode === 200) {
        cache.set(cacheKey, body, ttl);
        res.setHeader('X-Cache', 'MISS');
      } else {
        res.setHeader('X-Cache', 'SKIP');
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * Invalidate cache by key pattern.
 * Call this after data mutations.
 *
 * Usage:
 *   invalidateCache('rooms'); // Invalidates all room-related cache
 */
function invalidateCache(pattern) {
  const keys = cache.keys();
  const matchingKeys = keys.filter(key => key.includes(pattern));
  cache.del(matchingKeys);
  return matchingKeys.length;
}

/**
 * Get cache statistics.
 */
function getCacheStats() {
  const stats = cache.getStats();
  return {
    ...stats,
    hitRate: stats.keys > 0 ? (stats.hits / (stats.hits + stats.misses) * 100).toFixed(2) + '%' : '0%',
    keys: cache.keys(),
  };
}

/**
 * Clear all cache.
 */
function clearCache() {
  cache.flushAll();
}

module.exports = {
  cache,
  cacheMiddleware,
  invalidateCache,
  getCacheStats,
  clearCache,
};
