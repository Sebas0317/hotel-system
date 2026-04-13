'use strict';

const rateLimit = require('express-rate-limit');

// IPv6-safe key generator using the library's helper
const { ipKeyGenerator } = rateLimit;

/**
 * Global API rate limiter.
 * 100 requests per minute per IP for general endpoints.
 */
const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta nuevamente en un minuto.' },
  keyGenerator: ipKeyGenerator,
});

/**
 * Strict rate limiter for authentication endpoints.
 * 10 requests per minute per IP.
 */
const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesion. Intenta en un minuto.' },
  keyGenerator: ipKeyGenerator,
});

/**
 * Moderate rate limiter for read-heavy endpoints (rooms, stats, consumos).
 * 60 requests per minute per IP.
 */
const readRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta nuevamente en un minuto.' },
  keyGenerator: ipKeyGenerator,
});

/**
 * Stricter rate limiter for write endpoints (checkin, checkout, consumos).
 * 30 requests per minute per IP.
 */
const writeRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta nuevamente en un minuto.' },
  keyGenerator: ipKeyGenerator,
});

/**
 * Very strict rate limiter for PIN validation.
 * 5 requests per minute per IP.
 */
const pinRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de PIN. Espera un minuto.' },
  keyGenerator: ipKeyGenerator,
});

module.exports = {
  globalRateLimiter,
  authRateLimiter,
  readRateLimiter,
  writeRateLimiter,
  pinRateLimiter,
};
