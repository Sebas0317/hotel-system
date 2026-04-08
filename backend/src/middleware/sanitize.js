'use strict';

/**
 * Sanitize string inputs to prevent XSS.
 * Strips HTML tags and encodes dangerous characters.
 */
function sanitizeString(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
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
