# GEMINI.md - EcoBosque Hotel System

This document provides essential context and instructions for AI agents working on the EcoBosque Hotel System.

## Project Overview

**EcoBosque Hotel System** is a full-stack management application for "El Bosque Hotel Boutique" in Doradal, Colombia. It manages rooms, reservations, check-in/out, guest consumptions, and includes a public landing page.

### Architecture

| Layer | Technology | Role |
|-------|------------|------|
| **Backend** | Node.js 20, Express 5 | REST API (CommonJS) on Port 3001 |
| **Frontend** | React 19, Vite 8 | Admin & Reception SPA on Port 5173 |
| **Landing Page** | React 18+ (EcoWeb) | Embedded public site within the frontend |
| **Data Store** | JSON Files | Persistence with file locking and caching |
| **Auth** | JWT + bcryptjs | Admin-only secure access |
| **Styling** | Tailwind CSS 3 | Utility-first responsive design |

## Directory Structure

- `backend/`: Express API source, middleware, and JSON data files.
- `frontend/`: Main React application (Admin/Reception).
- `frontend/src/ecoweb/`: Public landing page (integrated into the main frontend).
- `docs/`: Project documentation, implementation reports, and upgrade guides.
- `ai/`: Specialized agent configurations, skills, and project context.
- `lighthouse-reports/`: Performance and accessibility audit results.

## Building and Running

### Prerequisites
- Node.js 18+
- npm

### Development Setup

Both servers must run simultaneously for the application to function correctly.

1. **Backend** (Port 3001):
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Frontend** (Port 5173):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Other Commands
- **Root Audit**: `npm run audit` (Runs lighthouse and security checks)
- **Frontend Build**: `cd frontend && npm run build`
- **Backend Test**: `cd backend && npm test`

## Development Conventions

### Backend (CommonJS)
- **Modular Routes**: Defined in `src/routes/` with corresponding logic in `src/controllers/`.
- **Data Layer**: Use `src/data/jsonStore.js` for all I/O. **Never use `fs` directly.**
- **Concurrency**: The data layer uses file locking and async/await to prevent race conditions.
- **Caching**: TTL-based in-memory caching is implemented for performance.
- **Security**: 
  - PINs are 4-digit strings generated via `crypto.randomFillSync`.
  - IDs are collision-safe: `${timestamp}-${random}`.
  - Strict rate limiting on auth and guest-facing endpoints.
- **Validation**: Use Zod schemas for request body validation.

### Frontend (ESM)
- **Modern React**: Uses React 19 features and Vite 8.
- **State Management**: Zustand for lightweight UI state; React Query for server state.
- **Performance**: 
  - Heavy components are wrapped in `React.memo`.
  - Routes and the EcoWeb landing page are lazy-loaded with `Suspense`.
- **Styling**: Tailwind CSS is the primary styling tool.
- **API Client**: All calls must go through `src/services/api.js`.

## AI Agent Integration

This project uses specialized AI agents defined in `ai/agents/`. When performing tasks, you should align with these roles:

- **Frontend Specialist**: React architecture, UI components, and performance.
- **Backend Specialist**: API design, business logic, and data integrity.
- **Security Specialist**: JWT, input validation, and OWASP compliance.
- **Testing/QA Specialist**: Lighthouse audits and automated testing.
- **UI/UX Specialist**: Design systems and accessibility.

### Key Context Files
- `QWEN.md`: Comprehensive technical overview and optimization logs.
- `AGENTS.md`: Detailed guide for AI agent roles and collaboration.
- `ai/context.txt`: High-level system goals.

## Rules for Agents
1. **Offline-First**: Prioritize simplicity and avoid unnecessary external dependencies.
2. **Language**: Use Spanish for UI labels and Colombian Peso (COP) for currency.
3. **Safety**: Never expose `JWT_SECRET` or `ADMIN_PASSWORD`.
4. **Consistency**: Maintain the established file-based data patterns; do not attempt to migrate to a database unless explicitly instructed.
