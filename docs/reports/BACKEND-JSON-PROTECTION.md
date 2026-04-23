# 🔒 JSON Data Protection System - EcoBosque Hotel

## Overview
Sistema automático de validación y protección de datos JSON que detecta corrupción, crea backups automáticos y repara archivos dañados sin intervención manual.

## 🛡️ Protección en 4 Capas

### Capa 1: Validación de Esquemas (Schema Validation)
Cada archivo JSON tiene un esquema definido que valida:
- **Tipo de dato** (array/object)
- **Campos requeridos** (id, numero, estado, etc.)
- **Tipos de campos** (string, number, etc.)
- **Valores válidos** (estados permitidos, categorías válidas)

**Archivos protegidos:**
| Archivo | Campos Requeridos | Validaciones |
|---------|------------------|--------------|
| `rooms.json` | id, numero, tipo, estado | Estado válido, tipos correctos |
| `consumos.json` | id, roomId, categoria, precio | Categoría válida, precio numérico |
| `history.json` | id, roomId | Formato de fechas |
| `stateHistory.json` | id, roomId, estadoNuevo | Estado válido, timestamp |
| `prices.json` | hotel, tarifas, productos | Estructura de objeto |

### Capa 2: Backup Automático antes de cada Escritura
```javascript
// Antes de escribir ANY dato:
1. Validar contra esquema
2. Si válido → crear backup timestamped
3. Escribir archivo nuevo
4. Verificar escritura exitosa
5. Mantener últimos 10 backups por archivo
```

**Estructura de Backups:**
```
backend/backups/
├── rooms_2026-04-13T22-30-00.json
├── rooms_2026-04-13T22-35-00.json
├── consumos_2026-04-13T22-30-00.json
└── ... (últimos 10 por archivo)
```

### Capa 3: Auto-Reparación en Lectura
Cuando se detecta corrupción al leer un archivo:
1. **Detectar** error de parseo o validación
2. **Buscar** el backup más reciente válido
3. **Restaurar** automáticamente desde el backup
4. **Loggear** el incidente para auditoría

### Capa 4: Validación en Startup
Al iniciar el servidor:
1. Escanear todos los archivos JSON
2. Validar cada uno contra su esquema
3. Si hay corrupción → auto-reparar desde backup
4. Reportar estado completo en logs

## 📊 Logs de Ejemplo

### Startup Exitoso
```
[JSON Validator] Starting integrity check...
[JSON Validator] ✅ rooms.json: OK (35 items)
[JSON Validator] ✅ consumos.json: OK (142 items)
[JSON Validator] ✅ history.json: OK (89 items)
[JSON Validator] ✅ stateHistory.json: OK (234 items)
[JSON Validator] ✅ prices.json: OK
[JSON Validator] ✅ All JSON files are valid
```

### Corrupción Detectada y Reparada
```
[JSON Validator] ❌ rooms.json: Schema validation failed
    - Item 12: missing required field "estado"
[JSON Validator] Attempting repair from backup...
[JSON Validator] ✅ rooms.json: Restored from rooms_2026-04-13T22-30-00.json
```

## 🔧 Uso Manual

### Ejecutar Validación On-Demand
```bash
# Desde terminal
curl -X POST http://localhost:3001/health/json-integrity
```

**Respuesta:**
```json
{
  "timestamp": "2026-04-13T22:35:00.000Z",
  "report": {
    "files": {
      "rooms.json": {
        "exists": true,
        "valid": true,
        "itemCount": 35,
        "errors": [],
        "warnings": []
      }
    },
    "overall": true
  },
  "repairs": {}
}
```

## 🚨 Escenarios de Protección

### Escenario 1: Archivo JSON Corrupto por Escritura Fallida
```
Problema: El servidor se cae durante escritura → JSON incompleto
Solución: 
  1. Al reiniciar, valida el archivo
  2. Detecta JSON inválido
  3. Restaura desde último backup válido
  4. Loggea el incidente
```

### Escenario 2: Datos con Campos Faltantes por Bug de Código
```
Problema: Un bug guarda datos sin campo "estado"
Solución:
  1. Antes de escribir, valida contra esquema
  2. Detecta campo faltante
  3. Rechaza escritura con error descriptivo
  4. Loggea el error para debugging
```

### Escenario 3: Manipulación Externa de Archivos
```
Problema: Alguien edita manualmente rooms.json y rompe estructura
Solución:
  1. Al leer el archivo, valida estructura
  2. Detecta inconsistencia
  3. Intenta reparar desde backup
  4. Si no hay backup válido, retorna datos cacheados anteriores
```

## 📁 Archivos Creados

| Archivo | Propósito |
|---------|-----------|
| `backend/src/utils/jsonValidator.js` | Validador de esquemas + backups |
| `backend/src/data/jsonStore.js` | Integrado con validación |
| `backend/src/routes/health.js` | Endpoint de verificación |
| `backend/backups/` | Directorio de backups automáticos |

## ⚙️ Configuración

```javascript
// En jsonValidator.js
const MAX_BACKUPS = 10;        // Backups por archivo
const CACHE_TTL = 5000;        // TTL de cache en ms
const BACKUP_DIR = 'backups';  // Directorio de backups
```

## 🎯 Beneficios

| Beneficio | Descripción |
|-----------|-------------|
| **Cero Downtime** | Reparación automática sin intervención |
| **Auditoría** | Logs detallados de cada incidente |
| **Prevención** | Validación ANTES de escribir |
| **Resiliencia** | Hasta 10 backups por archivo |
| **Transparencia** | Endpoint para verificar estado |

## 🔄 Flujo de Escritura Seguro

```
Solicitud de Escritura
        ↓
┌───────────────────┐
│ 1. Validar Datos  │ ← Schema validation
└────────┬──────────┘
         ↓
    ¿Válido?
    ↙       ↘
  SÍ         NO
  ↓          ↓
┌──────────┐  ┌──────────────┐
│ 2.Backup │  │ Auto-Repair  │
└────┬─────┘  │ from Backup  │
     ↓        └──────┬───────┘
┌───────────┐        ↓
│ 3.Escribir│   ¿Reparado?
└─────┬─────┘    ↙       ↘
      ↓          SÍ       NO
┌──────────┐     ↓        ↓
│ 4.Verificar│ Restaurar Error
└─────┬─────┘
      ↓
┌──────────┐
│ 5.OK ✅  │
└──────────┘
```

---

**Sistema implementado:** Abril 13, 2026
**Estado:** ✅ Activo y funcionando
