/**
 * Validation middleware helpers.
 * Uses simple field checks — no Zod dependency.
 */
'use strict';

/**
 * Middleware: require certain fields in request body
 * @param  {...string} fields - Field names to require
 */
function requireFields(...fields) {
  return (req, res, next) => {
    const missing = fields.filter(
      (f) =>
        req.body[f] === undefined || req.body[f] === null || req.body[f] === ''
    );
    if (missing.length > 0) {
      return res.status(400).json({
        error: `Campos requeridos faltantes: ${missing.join(', ')}`,
      });
    }
    next();
  };
}

/**
 * Middleware: validate enum value
 * @param {string} field - Field name
 * @param {string[]} values - Allowed values
 */
function validateEnum(field, values) {
  return (req, res, next) => {
    const val = req.body[field];
    if (val && !values.includes(val)) {
      return res.status(400).json({
        error: `Valor invalido para ${field}. Debe ser uno de: ${values.join(', ')}`,
      });
    }
    next();
  };
}

/**
 * Middleware: validate positive number
 * @param {string} field - Field name
 */
function validatePositiveNumber(field) {
  return (req, res, next) => {
    const val = req.body[field];
    if (
      val === undefined ||
      val === null ||
      typeof val !== 'number' ||
      val <= 0
    ) {
      return res.status(400).json({
        error: `${field} debe ser un numero positivo`,
      });
    }
    next();
  };
}

module.exports = {
  requireFields,
  validateEnum,
  validatePositiveNumber,
};
