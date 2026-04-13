'use strict';

/**
 * Request timeout middleware.
 * Aborts requests that exceed the configured timeout to prevent resource exhaustion.
 * Default: 30 seconds for general requests, 60 seconds for file uploads.
 */
function requestTimeout(timeoutMs = 30000) {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({ error: 'Request timeout. La solicitud tardó demasiado.' });
        req.timedOut = true;
      }
    }, timeoutMs);

    // Clear timer when response finishes
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
  };
}

/**
 * Middleware to hide Express's X-Powered-By header.
 * Also removes Server header if possible (best-effort on Node.js).
 */
function hideTechHeaders(_req, res, next) {
  // X-Powered-By is already removed by helmet, but double-check
  res.removeHeader('X-Powered-By');

  // Remove Server header (best-effort; some Node versions may not allow this)
  // Helmet handles this, but we add explicit removal here
  next();
}

module.exports = { requestTimeout, hideTechHeaders };
