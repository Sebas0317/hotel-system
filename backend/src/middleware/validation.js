'use strict';

/**
 * Validation middleware for request bodies
 * Provides reusable validators for common request patterns
 */

/**
 * Validates that required fields exist in the request body
 * @param {string[]} fields - Array of required field names
 * @returns {Function} Express middleware
 */
function requireFields(...fields) {
  return (req, res, next) => {
    const missing = fields.filter(field => {
      const value = req.body[field];
      return value === undefined || value === null || String(value).trim() === '';
    });

    if (missing.length > 0) {
      return res.status(400).json({
        error: `Campos requeridos: ${missing.join(', ')}`
      });
    }

    next();
  };
}

/**
 * Validates that a field matches one of the allowed values
 * @param {string} field - Field name in request body
 * @param {string[]} allowedValues - Array of allowed values
 * @param {string} [errorMessage] - Custom error message
 * @returns {Function} Express middleware
 */
function validateEnum(field, allowedValues, errorMessage) {
  return (req, res, next) => {
    const value = req.body[field];
    if (value && !allowedValues.includes(value)) {
      return res.status(400).json({
        error: errorMessage || `${field} debe ser uno de: ${allowedValues.join(', ')}`
      });
    }
    next();
  };
}

/**
 * Validates that a numeric field is a valid positive number
 * @param {string} field - Field name in request body
 * @returns {Function} Express middleware
 */
function validatePositiveNumber(field) {
  return (req, res, next) => {
    const value = req.body[field];
    if (value !== undefined && value !== null) {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) {
        return res.status(400).json({
          error: `${field} debe ser un número positivo válido`
        });
      }
      // Normalize to number
      req.body[field] = num;
    }
    next();
  };
}

module.exports = {
  requireFields,
  validateEnum,
  validatePositiveNumber,
};
