---
name: frontend-dev
description: Frontend development workflow for React/Vite EcoBosque project
license: MIT
compatibility: opencode
metadata:
  audience: developers
  stack: react, vite, tailwind
---

## Project Structure

- `/frontend` - React + Vite frontend (ESM)
- `/frontend/src/components/` - UI components (PantallaAdmin, UserView, etc.)
- `/frontend/src/services/api.js` - API client with error handling
- `/frontend/src/ecoweb/` - Landing page template (integrated)
- `/frontend/src/constants/` - Hotel configuration (ESTADO_CFG, PRODUCTOS, etc.)

## Key Commands

```bash
cd frontend && npm run dev      # Start dev server (port 5173)
cd frontend && npm run lint    # Run ESLint
cd frontend && npm run build  # Production build
```

## Development Patterns

### Adding New Components
1. Create in `/frontend/src/components/`
2. Import React hooks and services from `../services/api`
3. Use constants from `../constants` for config
4. Export as default

### API Integration
- All API calls go through `/services/api.js`
- Uses `apiFetch()` with built-in auth headers
- Timeout: 10s default
- Error handling via `ApiError` class

### Styling
- Tailwind CSS (v3) in `/frontend/src/index.css`
- Custom components in `/frontend/src/App.css`
- EcoWeb styles in `/frontend/src/ecoweb/style/`

### Room Data Flow
- Backend: `/backend/rooms.json` - All room data
- Frontend API: `fetchRooms()` gets all rooms
- RoomDetail component fetches by ID/numero

## Common Tasks

### Add New Room Type
1. Add to backend/rooms.json with unique `id` (e.g., "sb-106")
2. Update constants/index.js TIPO_ICON if needed
3. Group auto-updates via `agruparPorPiso()`

### Fix Routing in EcoWeb
- EcoWeb uses absolute paths (`/landing/room/:id`)
- Parent router at `/` handles basename
- Check App.jsx route definition

### Modify Admin View
- Main component: `components/PantallaAdmin.jsx`
- Room grouping: `utils/helpers.js` → `agruparPorPiso()`
- Filters: useFilterSync hook
- Room sync: useRoomSync hook