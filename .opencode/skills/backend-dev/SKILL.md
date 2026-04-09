---
name: backend-dev
description: Backend development workflow for Node.js/Express EcoBosque API
license: MIT
compatibility: opencode
metadata:
  audience: developers
  stack: node, express, commonjs
---

## Project Structure

- `/backend` - Express REST API (CommonJS)
- `/backend/server.js` - Entry point
- `/backend/src/routes/` - Express routers with validation
- `/backend/src/controllers/` - Business logic
- `/backend/src/data/jsonStore.js` - File-based data layer with locking
- `/backend/rooms.json` - Room data storage

## Key Commands

```bash
cd backend && npm run dev   # Start with nodemon (port 3001)
cd backend && node server.js # Start production
```

## Data Model

### Room Schema
```json
{
  "id": "sb-101",
  "numero": "101",
  "tipo": "Suite Bosque",
  "camas": "1 cama king",
  "capacidad": 2,
  "piso": 1,
  "estado": "disponible|ocupada|reservada|limpieza|mantenimiento",
  "huesped": null,
  "checkIn": null,
  "checkOut": null,
  "noches": null,
  "mascotas": false,
  "amenidades": ["wifi", "ac", ...],
  "descripcion": "...",
  "tarifa": 350000
}
```

### Consumo Schema
```json
{
  "id": "timestamp-random",
  "roomId": "sb-101",
  "descripcion": "Desayuno americano",
  "categoria": "restaurante|bar|servicios",
  "precio": 28000,
  "fecha": "2026-04-05T08:30:00.000Z"
}
```

## Adding New Endpoints

1. Create controller in `/backend/src/controllers/`
2. Add route in `/backend/src/routes/`
3. Register in server.js

### Example Route Pattern
```javascript
router.post('/:id/action', requireAuth, requireFields('param'), controller.action);
```

## Important Controllers

- `roomController.js` - CRUD for rooms, check-in/out, reservations
- `consumoController.js` - Consumption management
- `pricesController.js` - Hotel pricing (protected)

## Middleware

- `auth.js` - JWT validation for protected routes
- `validation.js` - Field validation, enum checks
- `sanitize.js` - Input sanitization
- `errorHandler.js` - Global error handling