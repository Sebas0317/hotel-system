'use strict';

/**
 * Additional security headers middleware
 * Complements Helmet with application-specific headers
 */
function securityHeaders(_req, res, next) {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // DNS Prefetch Control
  res.setHeader('X-DNS-Prefetch-Control', 'off');

  // Prevent iframing (clickjacking protection)
  res.setHeader('X-Frame-Options', 'DENY');

  // IE XSS Filter
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Cache-Control for API responses (prevent caching of sensitive data)
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Remove Server header (best-effort)
  res.removeHeader('X-Powered-By');

  next();
}

module.exports = { securityHeaders };
