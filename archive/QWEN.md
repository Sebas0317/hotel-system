# EcoBosque Hotel System — QWEN Context

## Project Overview

**EcoBosque Hotel System** is a full-stack hotel management application for "El Bosque Hotel Boutique" located in Doradal, Colombia. It provides room management, reservations, check-in/check-out, consumption tracking (restaurant, bar, services), price configuration, and a public-facing landing page.

### Architecture

| Layer | Technology | Notes |
|-------|------------|-------|
| **Backend** | Node.js 20, Express 5 (CommonJS) | REST API on port 3001 |
| **Frontend** | React 19, Vite 8, React Router 7 | SPA on port 5173, proxies API calls |
| **Styling** | Tailwind CSS 3 | Utility-first CSS |
| **Data Storage** | JSON files with file locking | `rooms.json`, `consumos.json`, `history.json`, `stateHistory.json`, `prices.json` |
| **Auth** | JWT + bcryptjs | Admin-only authentication |
| **State Management** | Zustand (frontend) | Lightweight state |
| **Data Fetching** | @tanstack/react-query | Server state management |

### Project Structure

```
hotel-system/
├── backend/                    # Express REST API (CommonJS)
│   ├── server.js              # Entry point, wires middleware + routes
│   ├── src/
│   │   ├── routes/            # Express routers (rooms, consumos, prices, auth, history, stateHistory)
│   │   ├── controllers/       # Business logic
│   │   ├── data/jsonStore.js  # File-based data layer with file locking
│   │   ├── middleware/        # Auth, validation, error handling, sanitization
│   │   ├── utils/             # ID generator, PIN generator (crypto-based), logger, checkout helpers
│   │   └── scripts/           # Utility scripts (e.g., seeders)
│   ├── rooms.json             # Room data
│   ├── consumos.json          # Consumption records
│   ├── history.json           # Check-in/out history
│   ├── stateHistory.json      # Room state change history
│   └── prices.json            # Room rates & product prices
│
├── frontend/                   # React + Vite (ESM)
│   ├── src/
│   │   ├── App.jsx            # Root component, role-based route guarding
│   │   ├── main.jsx           # Vite entry point
│   │   ├── components/        # Screen components (PantallaAdmin, PantallaCheckin, etc.)
│   │   ├── ecoweb/            # Public hotel landing page (separate app)
│   │   ├── hooks/             # Custom hooks (useRooms, useRoomStats)
│   │   ├── services/api.js    # Centralized API client with error handling
│   │   ├── constants/index.js # PRODUCTOS, ESTADO_CFG, METODOS_PAGO, HOTEL_CFG, etc.
│   │   ├── utils/helpers.js   # COP formatting, date helpers, calcularTotal, filtrarRooms
│   │   └── assets/            # Images, icons, etc.
│   ├── vite.config.js         # Vite config with proxy, code splitting, compression
│   └── public/                # Static assets
│
├── ai/                         # AI context & skills for agents
├── EcoWeb/                     # Legacy/alternative landing page
└── oi_env/                     # Python virtual environment (not part of runtime)
```

## Building and Running

### Prerequisites
- Node.js 18+
- npm

### Development (both servers must run simultaneously)

```bash
# Backend (port 3001) — auto-reload with nodemon
cd backend && npm run dev

# Frontend (port 5173) — Vite dev server with API proxy
cd frontend && npm run dev
```

### Frontend-only commands
```bash
cd frontend && npm run lint      # ESLint
cd frontend && npm run build     # Production build (outputs to dist/)
cd frontend && npm run preview   # Preview production build
```

### Backend-only commands
```bash
cd backend && npm start          # Production start (node server.js)
```

### Environment Variables
Create `backend/.env`:
```env
ADMIN_PASSWORD=ecobosque2024
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=8h
PORT=3001                        # Optional, defaults to 3001
```

## API Endpoints

### Public (no auth required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/health` | Detailed health (uptime, timestamp) |
| POST | `/auth/login` | Admin login (returns JWT) |
| GET | `/rooms` | List all rooms |
| GET | `/rooms/stats` | Room statistics |
| GET | `/rooms/reservaciones` | All reservations |
| POST | `/rooms/checkin` | Check in guest |
| POST | `/rooms/validar` | Validate room PIN |
| POST | `/rooms/:id/reservar` | Create reservation |
| PATCH | `/rooms/:id/status` | Update room status |
| POST | `/rooms/:id/checkout` | Check out guest |
| POST | `/rooms/:id/solicitar-checkout` | Guest-initiated checkout |
| POST | `/rooms/:id/cancel` | Cancel reservation |
| POST | `/rooms/:id/update-guest` | Update guest data |
| POST | `/consumos` | Register consumption |
| GET | `/consumos/:roomId` | Get room consumos |
| GET | `/history` | Get check-in/out history |
| GET | `/state-history` | Get room state change history |

### Protected (admin JWT required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/prices` | Get rates & products |
| PUT | `/prices` | Update prices |

## Data Models

### Room
```json
{
  "id": "string (collision-safe: timestamp-random)",
  "numero": "string",
  "tipo": "string",
  "camas": "string",
  "capacidad": "number",
  "piso": "number",
  "estado": "disponible|reservada|ocupada|limpieza|mantenimiento|fuera_servicio",
  "huesped": "string|null",
  "pin": "string (4-digit crypto)|null",
  "checkIn": "ISO date|null",
  "checkOut": "ISO date|null",
  "pago": "object|null"
}
```

### Consumption
```json
{
  "id": "string (timestamp-random)",
  "roomId": "string",
  "descripcion": "string",
  "categoria": "restaurante|bar|servicios",
  "precio": "number (COP integer)",
  "fecha": "ISO date"
}
```

### Room States
- `disponible` — Available (green)
- `reservada` — Reserved (blue)
- `ocupada` — Occupied (orange)
- `limpieza` — Under cleaning (purple)
- `mantenimiento` — Under maintenance (red)
- `fuera_servicio` — Out of service (gray)

### Room Types
- Suite Bosque, Suite Sunset, Suite Edén
- Habitación Pareja
- Habitación Doble Estándar
- Habitación Cuádruple Estándar
- Cabana Familiar en Bote

## Development Conventions

### Backend
- **CommonJS only** — do not use ESM syntax (`import`/`export`)
- File-based data layer (`jsonStore.js`) uses **async I/O** (`fs.promises`) with file locking to prevent race conditions
- In-memory caching with TTL invalidation for frequently accessed data (rooms, consumos, prices)
- Controllers contain business logic; routes define middleware chains
- PINs generated via `crypto.randomFillSync`, NOT `Math.random()`
- IDs are collision-safe: `${timestamp}-${random}`
- Error handling middleware (`errorHandler`, `notFoundHandler`) centralizes error responses
- Rate limiting via `express-rate-limit` (global + auth-specific)
- Security headers via `helmet`, response compression via `compression`
- Periodic cleanup of expired rate-limiting Map entries prevents memory leaks

### Frontend
- **ESM only** — standard React/Vite patterns
- ESLint config: ignores `dist/`, allows unused vars matching `^[A-Z_]`
- Currency is **COP** (Colombian Pesos) — prices are integers (no decimals)
- React Router for navigation — routes are role-guarded (admin/user)
- Admin sessions persisted via JWT in `localStorage`
- `React.memo` applied to heavy components (RoomDetail, RoomActions, PriceEditor, ConfirmModal, HotelTitle)
- `React.lazy` + `Suspense` for code-splitting all route components
- React Query for data fetching with automatic caching and deduplication
- `usePrices` hook uses React Query instead of raw useState/useEffect
- `ecoweb/` is a separate embedded app for the public landing page
- Unused files removed: `AdminRoomDetail.jsx`, `useFilterSync.js`

### Git
- `node_modules/`, `dist/`, `.env`, `.env.local`, `*.log` are gitignored
- `.aider*` files are gitignored (AI assistant cache)

## Optimizations Applied

### Backend
| Optimization | Tool/Library | Impact |
|---|---|---|
| Async file I/O | `fs.promises` + `async/await` | Non-blocking event loop, handles concurrent requests |
| In-memory cache | TTL-based cache in jsonStore.js/priceStore.js | Reduces disk reads for frequently accessed data |
| Rate limiting | [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) | Prevents API abuse, auth endpoint protection |
| Security headers | [helmet](https://github.com/helmetjs/helmet) | CSP, X-Frame-Options, HSTS, etc. |
| Response compression | [compression](https://github.com/expressjs/compression) | Gzip responses, reduced bandwidth |
| CORS restriction | Configured origins | Limits cross-origin access |
| Memory leak fix | setInterval cleanup on Maps | Prevents unbounded growth of rate-limit entries |
| Protected history endpoints | `requireAuth` middleware | Prevents PII data exposure |
| Removed unused Prisma | `npm uninstall` | Smaller node_modules, faster installs |

### Frontend
| Optimization | Tool/Library | Impact |
|---|---|---|
| React.memo | Built-in | Prevents unnecessary re-renders on heavy components |
| Code splitting | `React.lazy` + `Suspense` | Smaller initial bundle, lazy-loaded routes |
| React Query for prices | `@tanstack/react-query` | Deduplicated API calls, automatic caching |
| Bundle analysis | [rollup-plugin-visualizer](https://github.com/btd/rollup-plugin-visualizer) | Visual bundle size analysis (`dist/report.html`) |
| Production minification | `terser` with drop_console | Smaller production bundles, no console.log |
| Dependency cleanup | Moved dev-only packages to devDependencies | Clearer dependency graph |
| Deduplicated constants | AMENIDADES consolidated to constants/index.js | Single source of truth |
| Build target | `es2015` in vite.config.js | Broader browser compatibility |

## Key Files to Know

| File | Purpose |
|------|---------|
| `backend/server.js` | Express app entry point |
| `backend/src/data/jsonStore.js` | File-based data layer (read/write with locking) |
| `backend/src/middleware/errorHandler.js` | Global error handling + request logging |
| `backend/src/middleware/auth.js` | JWT auth middleware (`requireAuth`) |
| `frontend/src/App.jsx` | Root component with route definitions |
| `frontend/src/services/api.js` | All API calls go through this module |
| `frontend/src/constants/index.js` | Product catalog, state configs, payment methods, hotel config |
| `frontend/src/utils/helpers.js` | COP formatter, date helpers, total calculator, room filters |
| `frontend/vite.config.js` | Vite config with API proxy to :3001 |
