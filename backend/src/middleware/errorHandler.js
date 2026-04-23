'use strict';

const { logger } = require('../utils/logger');

/**
 * Centralized error handling middleware
 * Security-focused: strips stack traces, sanitizes error messages,
 * prevents information leakage about internal systems.
 */
function errorHandler(err, req, res, _next) {
  // Log full error internally for debugging
  logger.error('Unhandled error', {
    message: err.message,
    path: req.originalUrl,
    method: req.method,
    // Stack traces are NEVER sent to clients, only logged server-side
    stack: err.stack,
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Sanitize error message for client response
  let message;
  if (statusCode === 500) {
    // NEVER expose internal error details to clients
    message = 'Error interno del servidor';
  } else if (statusCode === 404) {
    message = 'Recurso no encontrado';
  } else if (statusCode === 403) {
    message = 'Acceso denegado';
  } else if (err.message && typeof err.message === 'string') {
    // Allow known application errors through, but strip any path info
    message = err.message
      .replace(/C:\\[\w\\.-]+/gi, '[path redacted]') // Windows paths
      .replace(/\/[\w/.-]+/g, '[path redacted]')     // Unix paths
      .trim();
  } else {
    message = 'Error desconocido';
  }

  // CORS error handling
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origen no permitido por CORS' });
  }

  res.status(statusCode).json({ error: message });
}

/**
 * 404 handler for undefined routes
 * Generic response - no route information exposed
 */
function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Recurso no encontrado' });
}

/**
 * Request logger middleware (development only)
 * Does NOT log request bodies or sensitive headers
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  // Log only safe metadata
  const safeMeta = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  };

  const originalEnd = res.end;

  res.end = function(...args) {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'debug';
    logger[logLevel](`${req.method} ${req.originalUrl}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
    originalEnd.apply(res, args);
  };

  next();
}

module.exports = {
  errorHandler,
  notFoundHandler,
  requestLogger,
};
