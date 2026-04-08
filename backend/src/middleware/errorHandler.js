'use strict';

/**
 * Centralized error handling middleware
 * Catches unhandled errors and returns consistent error responses
 */
function errorHandler(err, _req, res, _next) {
  console.error('[ErrorHandler]', err);

  // Don't leak internal error details to the client
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500
    ? 'Error interno del servidor'
    : err.message || 'Error desconocido';

  res.status(statusCode).json({ error: message });
}

/**
 * 404 handler for undefined routes
 */
function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'Ruta no encontrada' });
}

/**
 * Request logger middleware (development only)
 */
function requestLogger(req, _res, next) {
  const start = Date.now();
  const originalEnd = _res.end;

  _res.end = function(...args) {
    const duration = Date.now() - start;
    console.log(`[Request] ${req.method} ${req.originalUrl} - ${_res.statusCode} (${duration}ms)`);
    originalEnd.apply(_res, args);
  };

  next();
}

module.exports = {
  errorHandler,
  notFoundHandler,
  requestLogger,
};
