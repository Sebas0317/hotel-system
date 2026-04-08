'use strict';

const jwt = require('jsonwebtoken');

/**
 * JWT authentication middleware for admin routes.
 * Expects: Authorization: Bearer <token>
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autenticado. Inicia sesión como administrador.' });
  }

  const token = header.slice(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado. Inicia sesión nuevamente.' });
  }
}

module.exports = { requireAuth };
