'use strict';

/**
 * Validation middleware for request bodies
 * Provides reusable validators for common request patterns
 * Security-enhanced with length limits and type checking
 */

// Maximum allowed lengths for string inputs
const MAX_STRING_LENGTH = 500; // General string limit
const MAX_NAME_LENGTH = 100;   // Names, emails
const MAX_PHONE_LENGTH = 20;   // Phone numbers
const MAX_MESSAGE_LENGTH = 1000; // Descriptions, observations

/**
 * Validates string length and content
 * @param {string} value - The string to validate
 * @param {number} maxLength - Maximum allowed length
 * @returns {boolean} - True if valid
 */
function isValidString(value, maxLength = MAX_STRING_LENGTH) {
  if (typeof value !== 'string') return false;
  if (value.length === 0 || value.length > maxLength) return false;
  // Reject strings with only whitespace
  if (value.trim().length === 0) return false;
  return true;
}

/**
 * Validates that required fields exist in the request body
 * Also validates string lengths
 * @param {string[]} fields - Array of required field names
 * @returns {Function} Express middleware
 */
function requireFields(...fields) {
  return (req, res, next) => {
    const missing = fields.filter(field => {
      const value = req.body[field];
      if (value === undefined || value === null) return true;
      // For string fields, check empty/whitespace
      if (typeof value === 'string' && value.trim() === '') return true;
      return false;
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
      if (isNaN(num) || num < 0 || num > 1000000000) { // Cap at 1 billion COP
        return res.status(400).json({
          error: `${field} debe ser un numero positivo valido`
        });
      }
      // Normalize to number
      req.body[field] = num;
    }
    next();
  };
}

/**
 * Validates email format
 * @param {string} field - Field name in request body
 * @returns {Function} Express middleware
 */
function validateEmail(field) {
  return (req, res, next) => {
    const value = req.body[field];
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value !== 'string' || value.length > MAX_NAME_LENGTH) {
        return res.status(400).json({
          error: `${field} debe ser un email valido con maximo ${MAX_NAME_LENGTH} caracteres`
        });
      }
      // Basic email regex - allow frontend to do stricter validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return res.status(400).json({
          error: `${field} no tiene formato de email valido`
        });
      }
    }
    next();
  };
}

/**
 * Validates phone number format (Colombian format)
 * @param {string} field - Field name in request body
 * @returns {Function} Express middleware
 */
function validatePhone(field) {
  return (req, res, next) => {
    const value = req.body[field];
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value !== 'string' || value.length > MAX_PHONE_LENGTH) {
        return res.status(400).json({
          error: `${field} debe ser un telefono valido con maximo ${MAX_PHONE_LENGTH} caracteres`
        });
      }
      // Allow digits, spaces, hyphens, parentheses, plus sign
      const phoneRegex = /^[\d\s\-()+]+$/;
      if (!phoneRegex.test(value)) {
        return res.status(400).json({
          error: `${field} no tiene formato de telefono valido`
        });
      }
    }
    next();
  };
}

/**
 * Validates string length for a specific field
 * @param {string} field - Field name
 * @param {number} maxLength - Maximum length
 * @returns {Function} Express middleware
 */
function validateMaxLength(field, maxLength) {
  return (req, res, next) => {
    const value = req.body[field];
    if (value !== undefined && value !== null && typeof value === 'string') {
      if (value.length > maxLength) {
        return res.status(400).json({
          error: `${field} excede el largo maximo de ${maxLength} caracteres`
        });
      }
    }
    next();
  };
}

/**
 * Validates that a field does not contain HTML or script tags
 * @param {string} field - Field name
 * @returns {Function} Express middleware
 */
function validateNoScript(field) {
  return (req, res, next) => {
    const value = req.body[field];
    if (value !== undefined && value !== null && typeof value === 'string') {
      const scriptRegex = /<script|<\/script|javascript:|on\w+\s*=/gi;
      if (scriptRegex.test(value)) {
        return res.status(400).json({
          error: `${field} contiene contenido no permitido`
        });
      }
    }
    next();
  };
}

module.exports = {
  requireFields,
  validateEnum,
  validatePositiveNumber,
  validateEmail,
  validatePhone,
  validateMaxLength,
  validateNoScript,
  isValidString,
  MAX_STRING_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PHONE_LENGTH,
  MAX_MESSAGE_LENGTH,
};
