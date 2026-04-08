# EcoBosque Hotel System — Agent Guide

## Architecture

- **backend/** — Node.js/Express REST API (CommonJS). Modular structure under `src/`.
  - `server.js` — entry point, wires middleware + routes
  - `src/routes/` — Express routers with validation middleware
  - `src/controllers/` — business logic (roomController, consumoController)
  - `src/data/jsonStore.js` — file-based data layer with file locking
  - `src/middleware/` — validation, error handling, request logging
  - `src/utils/` — ID generator (collision-safe), PIN generator (crypto-based)
- **frontend/** — React + Vite (ESM). Component-based architecture.
  - `src/App.jsx` — root, manages role + screen routing
  - `src/components/` — extracted screen components (PantallaLogin, PantallaAdmin, etc.)
  - `src/services/api.js` — centralized API client with error handling
  - `src/constants/index.js` — PRODUCTOS, ESTADO_CFG, METODOS_PAGO, etc.
  - `src/utils/helpers.js` — COP, FECHA, calcularTotal, filtrarRooms, agruparPorPiso
  - `src/hooks/useRooms.js` — useRooms, useRoomStats custom hooks
- **ai/** — Project context, skills, memory. Do not modify backend/frontend unless asked.
- **oi_env/** — Python environment. Not part of runtime.

## Dev Commands

```sh
# Backend (port 3001)
cd backend && npm run dev        # nodemon — auto-reload

# Frontend (port 5173 default)
cd frontend && npm run dev       # vite (proxies /rooms and /consumos to :3001)
cd frontend && npm run lint      # eslint
cd frontend && npm run build     # production build
```

Both servers must run simultaneously.

## Data Model

- `backend/rooms.json` — rooms: `id` (string, collision-safe), `numero`, `tipo`, `camas`, `capacidad`, `piso`, `estado` (ocupada/reservada/disponible), `huesped`, `pin` (4-digit crypto string), `checkIn` (ISO), optional `checkOut`, optional `pago`.
- `backend/consumos.json` — consumos: `id` (string), `roomId`, `descripcion`, `categoria` (restaurante/bar/servicios), `precio`, `fecha` (ISO).

## Key Conventions

- Backend uses **CommonJS**. Do not add ESM syntax.
- Frontend uses **ESM**.
- Frontend ESLint ignores `dist`, allows unused vars matching `^[A-Z_]`.
- Currency is COP (Colombian Pesos). Prices are integers.
- IDs are strings: `${timestamp}-${random}` to prevent collisions.
- PINs use `crypto.randomFillSync`, not `Math.random()`.
- `frontend/src/components/` has unused legacy files (`AccesoHabitacion.jsx`, `CheckIn.jsx`, `Habitacion.jsx`, `Inicio.jsx`) — ignore them.
- `prompt/prompt.txt` is an AI analysis prompt, not runtime instructions.
