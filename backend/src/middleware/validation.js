/**
 * Zod validation schemas for all API endpoints.
 * Provides type-safe validation with detailed error messages.
 * Replaces ad-hoc if (!req.body.foo) checks.
 * 
 * Also includes legacy helper functions for backward compatibility.
 */
'use strict';

const { z } = require('zod');

// ── Legacy helper functions (for backward compatibility) ──────────

/**
 * Middleware: require certain fields in request body
 * @param  {...string} fields - Field names to require
 */
function requireFields(...fields) {
  return (req, res, next) => {
    const missing = fields.filter(f => !req.body[f]);
    if (missing.length > 0) {
      return res.status(400).json({ 
        error: `Missing required fields: ${missing.join(', ')}` 
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
        error: `Invalid value for ${field}. Must be one of: ${values.join(', ')}` 
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
    if (val && (typeof val !== 'number' || val <= 0)) {
      return res.status(400).json({ 
        error: `${field} must be a positive number` 
      });
    }
    next();
  };
}

// ── Zod schemas ───────────────────────────────────────────────────

// ── Common schemas ────────────────────────────────────────────────

/** Guest information schema */
const guestSchema = z.object({
  nombre: z.string()
    .min(2, 'Nombre debe tener al menos 2 caracteres')
    .max(100, 'Nombre demasiado largo')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s-]+$/, 'Nombre contiene caracteres inválidos'),
  
  documento: z.string()
    .min(5, 'Documento debe tener al menos 5 caracteres')
    .max(20, 'Documento demasiado largo'),
  
  telefono: z.string()
    .max(20, 'Teléfono demasiado largo')
    .regex(/^[\d\s\-\+\(\)]*$/, 'Teléfono contiene caracteres inválidos')
    .optional()
    .or(z.literal('')),
  
  email: z.string()
    .email('Email inválido')
    .max(100, 'Email demasiado largo')
    .optional()
    .or(z.literal('')),
});

/** Date validation schema */
const dateSchema = z.string().datetime({
  message: 'Fecha debe ser formato ISO 8601',
}).or(z.string().date());

/** Payment schema */
const paymentSchema = z.object({
  metodo: z.enum(['efectivo', 'tarjeta', 'transferencia', 'otro'], {
    message: 'Método de pago inválido',
  }),
  monto: z.number()
    .positive('Monto debe ser positivo')
    .max(100000000, 'Monto excede límite máximo'),
  fecha: dateSchema,
});

// ── Endpoint-specific schemas ─────────────────────────────────────

/** POST /auth/login */
const loginSchema = z.object({
  body: z.object({
    password: z.string()
      .min(1, 'Contraseña requerida')
      .max(128, 'Contraseña demasiado larga'),
  }),
});

/** POST /rooms/checkin */
const checkinSchema = z.object({
  body: guestSchema.extend({
    roomId: z.string().min(1, 'Room ID requerido'),
    checkIn: dateSchema,
    checkOut: dateSchema.optional(),
    pago: paymentSchema.optional(),
  }),
});

/** POST /rooms/:id/reservar */
const reservarSchema = z.object({
  body: guestSchema.extend({
    checkIn: dateSchema,
    checkOut: dateSchema,
    pago: paymentSchema.optional(),
  }),
});

/** POST /rooms/:id/checkout */
const checkoutSchema = z.object({
  body: z.object({
    motivo: z.string().max(500).optional(),
  }),
});

/** POST /consumos */
const consumoSchema = z.object({
  body: z.object({
    roomId: z.string().min(1, 'Room ID requerido'),
    descripcion: z.string()
      .min(1, 'Descripción requerida')
      .max(500, 'Descripción demasiado larga'),
    categoria: z.enum(['restaurante', 'bar', 'servicios', 'tienda', 'otro'], {
      message: 'Categoría inválida',
    }),
    precio: z.number()
      .positive('Precio debe ser positivo')
      .max(10000000, 'Precio excede límite máximo'),
  }),
});

/** PUT /prices */
const pricesSchema = z.object({
  body: z.object({
    tarifas: z.record(z.string(), z.object({
      precio: z.number().positive().max(10000000),
      descripcion: z.string().max(500).optional(),
    })).optional(),
    productos: z.object({
      restaurante: z.array(z.object({
        nombre: z.string().max(100),
        precio: z.number().positive().max(1000000),
      })).optional(),
      bar: z.array(z.object({
        nombre: z.string().max(100),
        precio: z.number().positive().max(1000000),
      })).optional(),
      servicios: z.array(z.object({
        nombre: z.string().max(100),
        precio: z.number().positive().max(1000000),
      })).optional(),
    }).optional(),
  }),
});

/** PATCH /rooms/:id/status */
const roomStatusSchema = z.object({
  body: z.object({
    estado: z.enum([
      'disponible',
      'reservada',
      'ocupada',
      'limpieza',
      'mantenimiento',
      'fuera_servicio',
    ], {
      message: 'Estado de habitación inválido',
    }),
  }),
});

// ── Validation middleware factory ─────────────────────────────────

/**
 * Creates Express middleware from Zod schema.
 * Validates req.body, req.query, or req.params.
 *
 * Usage:
 *   router.post('/login', validate(loginSchema), loginHandler);
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source];
      const validated = schema.parse({ [source]: dataToValidate });
      
      // Replace request data with validated/cleaned version
      req[source] = validated[source];
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        return res.status(400).json({
          error: 'Datos de entrada inválidos',
          details: errors,
        });
      }
      
      next(error);
    }
  };
}

// ── Export all schemas and middleware ─────────────────────────────

module.exports = {
  // Legacy helper functions (for backward compatibility)
  requireFields,
  validateEnum,
  validatePositiveNumber,

  // Zod schemas
  loginSchema,
  checkinSchema,
  reservarSchema,
  checkoutSchema,
  consumoSchema,
  pricesSchema,
  roomStatusSchema,
  guestSchema,
  paymentSchema,

  // Middleware factory
  validate,

  // Raw Zod for custom validation
  z,
};
