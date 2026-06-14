'use strict';

/**
 * Sanitize string inputs to prevent XSS.
 * Strips dangerous content but PRESERVES Unicode/accents — does NOT HTML-escape.
 * HTML escaping se hace SOLO en el frontend al renderizar.
 */
function sanitizeString(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["']?[^"'\s>]+["']?/gi, '')
    .replace(/javascript\s*:/gi, '')
    .trim();
}

/**
 * Middleware that sanitizes all string fields in req.body.
 */
function sanitizeBody(req, _res, next) {
  if (!req.body || typeof req.body !== 'object') return next();

  for (const key of Object.keys(req.body)) {
    if (typeof req.body[key] === 'string') {
      req.body[key] = sanitizeString(req.body[key]);
    }
  }

  next();
}

module.exports = { sanitizeBody, sanitizeString };
