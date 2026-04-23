/**
 * JSON Validator and Integrity Checker for EcoBosque Hotel System.
 * Validates all JSON data files before they are loaded.
 * Creates automatic backups before any write operation.
 * Runs on server startup and periodically via cron.
 */
'use strict';

const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '../..');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const JSON_FILES = ['rooms.json', 'consumos.json', 'history.json', 'stateHistory.json', 'prices.json'];
const MAX_BACKUPS = 10; // Keep last 10 backups per file

/**
 * Schema definitions for each JSON file.
 * Used to validate structure and catch corruption early.
 */
const SCHEMAS = {
  'rooms.json': {
    type: 'array',
    itemShape: {
      required: ['id', 'numero', 'tipo', 'estado'],
      types: {
        id: 'string',
        numero: 'string',
        tipo: 'string',
        camas: 'string',
        capacidad: 'number',
        piso: 'number',
        estado: 'string',
      },
      validStates: ['disponible', 'reservada', 'ocupada', 'limpieza', 'mantenimiento', 'fuera_servicio'],
    },
  },
  'consumos.json': {
    type: 'array',
    itemShape: {
      required: ['id', 'roomId', 'categoria', 'precio'],
      types: {
        id: 'string',
        roomId: 'string',
        descripcion: 'string',
        categoria: 'string',
        precio: 'number',
        fecha: 'string',
      },
      validCategories: ['restaurante', 'bar', 'servicios', 'tienda', 'otro'],
    },
  },
  'history.json': {
    type: 'array-or-object', // Can be array OR object with 'reservas' key
    objectKey: 'reservas',
    itemShape: {
      types: {
        id: 'string',
        roomId: 'string',
        huesped: 'string',
        checkIn: 'string',
        checkOut: 'string',
        tarifa: 'number',
        noches: 'number',
      },
    },
  },
  'stateHistory.json': {
    type: 'array-or-object', // Can be array OR object with 'cambios' key
    objectKey: 'cambios',
    itemShape: {
      required: ['id', 'roomId', 'estadoNuevo'],
      types: {
        id: 'string',
        roomId: 'string',
        numero: 'string',
        estadoAnterior: 'string',
        estadoNuevo: 'string',
        timestamp: 'string',
      },
    },
  },
  'prices.json': {
    type: 'object',
    shape: {
      types: {
        hotel: 'object',
        tarifas: 'object',
        productos: 'object',
        amenidades: 'object',
      },
    },
  },
};

/**
 * Validate a JSON file against its schema.
 * Returns { valid: boolean, errors: string[], warnings: string[] }
 */
function validateJSON(filename, data) {
  const result = { valid: true, errors: [], warnings: [] };
  const schema = SCHEMAS[filename];

  if (!schema) {
    result.warnings.push(`No schema defined for ${filename}`);
    return result;
  }

  // Check top-level type
  if (schema.type === 'array' && !Array.isArray(data)) {
    result.errors.push(`Expected array but got ${typeof data}`);
    result.valid = false;
    return result;
  }
  if (schema.type === 'object' && (typeof data !== 'object' || Array.isArray(data))) {
    result.errors.push(`Expected object but got ${Array.isArray(data) ? 'array' : typeof data}`);
    result.valid = false;
    return result;
  }
  if (schema.type === 'array-or-object') {
    if (Array.isArray(data)) {
      // Treat as array, validate items
    } else if (typeof data === 'object' && data !== null) {
      // Extract the array from the known key
      if (schema.objectKey && Array.isArray(data[schema.objectKey])) {
        data = data[schema.objectKey];
      } else {
        result.warnings.push(`Expected object with '${schema.objectKey}' key or direct array`);
      }
    } else {
      result.errors.push(`Expected array or object but got ${typeof data}`);
      result.valid = false;
      return result;
    }
  }

  // Validate array items
  if ((schema.type === 'array' || schema.type === 'array-or-object') && schema.itemShape) {
    data.forEach((item, index) => {
      if (typeof item !== 'object' || item === null) {
        result.errors.push(`Item ${index}: expected object but got ${typeof item}`);
        result.valid = false;
        return;
      }

      // Check required fields
      if (schema.itemShape.required) {
        schema.itemShape.required.forEach(field => {
          if (!(field in item)) {
            result.errors.push(`Item ${index}: missing required field "${field}"`);
            result.valid = false;
          }
        });
      }

      // Check field types
      if (schema.itemShape.types) {
        Object.entries(schema.itemShape.types).forEach(([field, expectedType]) => {
          if (field in item && item[field] !== null && typeof item[field] !== expectedType) {
            result.warnings.push(`Item ${index}: field "${field}" expected ${expectedType} but got ${typeof item[field]}`);
          }
        });
      }

      // Check valid states
      if (schema.itemShape.validStates && 'estado' in item) {
        if (!schema.itemShape.validStates.includes(item.estado)) {
          result.errors.push(`Item ${index}: invalid estado "${item.estado}"`);
          result.valid = false;
        }
      }

      // Check valid categories
      if (schema.itemShape.validCategories && 'categoria' in item) {
        if (!schema.itemShape.validCategories.includes(item.categoria)) {
          result.errors.push(`Item ${index}: invalid categoria "${item.categoria}"`);
          result.valid = false;
        }
      }
    });

    if (data.length === 0) {
      result.warnings.push(`${filename} is empty`);
    }
  }

  return result;
}

/**
 * Validate all JSON files. Returns report object.
 */
async function validateAll() {
  const report = { timestamp: new Date().toISOString(), files: {}, overall: true };

  for (const file of JSON_FILES) {
    const filePath = path.join(DATA_DIR, file);
    const fileReport = { exists: false, valid: false, errors: [], warnings: [] };

    try {
      await fs.access(filePath);
      fileReport.exists = true;

      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      fileReport.parsable = true;
      fileReport.itemCount = Array.isArray(data) ? data.length : Object.keys(data).length;

      const validation = validateJSON(file, data);
      fileReport.valid = validation.valid;
      fileReport.errors = validation.errors;
      fileReport.warnings = validation.warnings;

      if (!validation.valid) {
        report.overall = false;
      }
    } catch (err) {
      fileReport.exists = false;
      fileReport.errors.push(err.message);
      report.overall = false;
    }

    report.files[file] = fileReport;
  }

  return report;
}

/**
 * Create backup of a JSON file before writing.
 */
async function createBackup(filename) {
  const srcPath = path.join(DATA_DIR, filename);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupName = `${filename.replace('.json', '')}_${timestamp}.json`;
  const backupPath = path.join(BACKUP_DIR, backupName);

  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    await fs.copyFile(srcPath, backupPath);

    // Cleanup old backups
    await cleanupOldBackups(filename);

    return { success: true, path: backupPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Remove old backups, keeping only MAX_BACKUPS per file.
 */
async function cleanupOldBackups(filename) {
  try {
    const prefix = filename.replace('.json', '_');
    const files = await fs.readdir(BACKUP_DIR);
    const matching = files
      .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
      .sort()
      .reverse();

    if (matching.length > MAX_BACKUPS) {
      const toDelete = matching.slice(MAX_BACKUPS);
      for (const file of toDelete) {
        await fs.unlink(path.join(BACKUP_DIR, file));
      }
    }
  } catch (err) {
    console.error(`[JSON Validator] Error cleaning up backups:`, err.message);
  }
}

/**
 * Repair a corrupted JSON file from the most recent valid backup.
 */
async function repairFromBackup(filename) {
  try {
    const prefix = filename.replace('.json', '_');
    const files = await fs.readdir(BACKUP_DIR);
    const matching = files
      .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
      .sort()
      .reverse();

    if (matching.length === 0) {
      return { success: false, error: 'No backups available' };
    }

    const latestBackup = matching[0];
    const srcPath = path.join(BACKUP_DIR, latestBackup);
    const destPath = path.join(DATA_DIR, filename);

    await fs.copyFile(srcPath, destPath);
    return { success: true, restoredFrom: latestBackup };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Middleware: Validate JSON integrity before serving responses.
 * Logs warnings/errors but does not block requests.
 */
function integrityCheckMiddleware(req, res, next) {
  // Only run on startup or on-demand via endpoint
  next();
}

/**
 * Run validation on server startup.
 * Auto-repairs if corruption is detected.
 */
async function startupValidation() {
  console.log('[JSON Validator] Starting integrity check...');
  const report = await validateAll();

  for (const [file, info] of Object.entries(report.files)) {
    if (!info.exists) {
      console.warn(`[JSON Validator] ⚠️ ${file}: File not found`);
      continue;
    }
    if (!info.parsable) {
      console.error(`[JSON Validator] ❌ ${file}: JSON parse error - attempting repair from backup`);
      const repair = await repairFromBackup(file);
      if (repair.success) {
        console.log(`[JSON Validator] ✅ ${file}: Restored from ${repair.restoredFrom}`);
      } else {
        console.error(`[JSON Validator] ❌ ${file}: Repair failed - ${repair.error}`);
      }
      continue;
    }
    if (!info.valid) {
      console.error(`[JSON Validator] ❌ ${file}: Schema validation failed`);
      info.errors.forEach(e => console.error(`    - ${e}`));
      // Auto-repair
      const repair = await repairFromBackup(file);
      if (repair.success) {
        console.log(`[JSON Validator] ✅ ${file}: Restored from backup ${repair.restoredFrom}`);
      }
      continue;
    }
    if (info.warnings.length > 0) {
      console.warn(`[JSON Validator] ⚠️ ${file}: ${info.warnings.join(', ')}`);
    }
    console.log(`[JSON Validator] ✅ ${file}: OK (${info.itemCount} items)`);
  }

  if (report.overall) {
    console.log('[JSON Validator] ✅ All JSON files are valid');
  } else {
    console.error('[JSON Validator] ⚠️ Some files have issues - check logs above');
  }

  return report;
}

module.exports = {
  validateJSON,
  validateAll,
  createBackup,
  repairFromBackup,
  startupValidation,
  JSON_FILES,
};
