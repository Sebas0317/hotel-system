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

## AI Code Review Tools

Five tools are installed and configured for the AI agent to detect/fix bugs:

### 1. ai-review-pipeline (primary) ✅

**Status**: Working — built-in free model (SiliconFlow/Qwen3-8B), no API key needed.  
**Config**: `.ai-pipeline.json` in project root (20 project-specific custom rules).

```sh
npx ai-review-pipeline --staged --lang en                  # review staged (pre-commit)
npx ai-review-pipeline --file path/file --full --lang en   # review full file
npx ai-review-pipeline --branch main --lang en             # review vs main
npx ai-review-pipeline --fix --max-rounds 3 --lang en      # auto-fix mode
```

When `--fix` is used: review → auto-fix → re-review → repeat until `maxRounds` or pass.

### 2. ocr — Alibaba Open Code Review ⚠️

**Status**: Configured for SiliconFlow, needs API key.  
**Config**: provider=siliconflow, model=Qwen/Qwen3-8B, url=https://api.siliconflow.cn/v1/chat/completions

```sh
# Set your API key (get free tier at https://siliconflow.cn)
ocr config set custom_providers.siliconflow.api_key "sk-..."

# Review staged changes
ocr review --audience agent --format json

# Review full file
ocr review --commit HEAD --file path/to/file

# Preview which files would be reviewed (no LLM call)
ocr review --preview
```

Pre-commit hook at `.git/hooks/pre-commit` already runs `ocr review` on staged files.

### 3. semgrep — SAST Bug Hunting ✅

**Status**: Working — `pip install semgrep`. 2000+ community rules. No API key needed.  
**Config**: None needed (`--config=auto` auto-detects language).

```sh
# Full project scan
semgrep --config=auto --exclude="oi_env|node_modules|.opencode|dist|ai|scripts" --skip-unknown-extensions

# Scan specific files
semgrep --config=auto path/to/file.js
```

Found 37 security bugs in first scan.

### 4. knip — Dead Code Detection ✅

**Status**: Working — `knip` installed globally. Detects unused files, exports, and dependencies.  
**Config**: `knip.json` in project root.

```sh
# Run dead code detection
knip

# Include all files (no .gitignore filter)
knip --no-gitignore
```

### 4. api-contract-sentinel (skill) 🧠

**Status**: Installed as opencode skill at `.opencode/skills/api-contract-sentinel/`.  
**Auto-invoke**: `allow_implicit_invocation: true` — agent auto-triggers it when API contract drift is detected.

Use via skill tool in agent context:
```
skill: api-contract-sentinel
```
Compares implementation (controllers, routes, handlers) against authoritative contract (OpenAPI, PRD, etc.)
to detect endpoint drift, schema mismatches, status-code errors, and auth/header gaps.

## Bug-Fixing Workflow for AI Agent

1. **Run** `npx ai-review-pipeline --file <target> --full --lang en` to diagnose bugs
2. **Fix** bugs in code
3. **Re-run** `npx ai-review-pipeline --file <target> --full --lang en` to verify fixes pass
4. **Stage** with `git add` and run `npx ai-review-pipeline --staged --lang en` for final gate
5. **If API contract involved**, load `skill: api-contract-sentinel` to audit contract compliance

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
