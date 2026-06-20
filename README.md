# EcoBosque Hotel Management System

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5.x-white)](https://expressjs.com)
[![React](https://img.shields.io/badge/React-19.x-blue)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.x-purple)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38bdf8)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

A production-grade full-stack hotel management system built for **El Bosque Hotel Boutique** in Doradal, Colombia. Designed from the ground up to solve the real operational challenges that small-to-medium hotels face every day.

---

## The Problems We Solve

### 1. Paper-Based Chaos
Most small hotels still run on paper ledgers, WhatsApp messages, and sticky notes. Check-ins are slow, reservations get double-booked, and guest information is lost. **We digitize the entire workflow** — from reservation to check-out — with a real-time interface that any staff member can use.

### 2. Disconnected Operations
The front desk doesn't talk to the restaurant, the restaurant doesn't talk to accounting. Charges from the bar, room service, and restaurant are tracked separately — or not at all. **Our consumption tracking system** unifies every guest charge under one room ledger, visible instantly at check-out time.

### 3. Security Vulnerabilities
Hotels generate simple PINs (like room numbers), store passwords in plaintext, and leave admin panels exposed. **We built security from day one:**
- Cryptographically random 4-digit PINs via `crypto.randomFillSync`
- JWT-based authentication with httpOnly cookies
- bcrypt password hashing
- Two-factor authentication support
- Rate limiting at 5 tiers (global, auth, read, write, PIN)
- reCAPTCHA integration
- CSRF protection and security headers (Helmet)
- Input sanitization against XSS
- Audit logging of every security event

### 4. No Real-Time Visibility
A hotel manager shouldn't have to walk the halls to know which rooms are occupied, which need cleaning, and who's checking out today. **Our real-time dashboard** shows every room's status at a glance, with WebSocket-powered live updates as events happen.

### 5. Revenue Leakage
Without structured pricing and consumption tracking, hotels lose money on unrecorded charges, forgotten mini-bar items, and incorrect billing. **Our system** enforces pricing rules, tallies all consumptions automatically, and generates accurate check-out invoices with IVA (Colombian tax) included.

### 6. Fragile Data
A crashed browser or corrupted file can mean lost guest data. **We built a resilient data layer** with atomic writes, file locking for concurrent access, automated backups with retention policies, and optional Redis persistence for production deployments.

### 7. No Useful Reports
Spreadsheet reports are tedious to create and easy to fake. **Our accounting module** generates real-time revenue summaries and exports professional Excel reports with a single click.

---

## Features

### Front Desk & Operations
- **Room Grid** — Visual overview of all rooms with color-coded status (available, reserved, occupied, cleaning, maintenance)
- **Check-In Wizard** — Step-by-step guest registration with room selection, guest info, and PIN generation
- **Check-Out Engine** — Automatic total calculation (room nights + consumptions + IVA), payment registration, invoice printing
- **Consumption Logging** — Add restaurant, bar, and service charges to any occupied room in seconds
- **Reservation Calendar** — View and manage upcoming bookings with date filtering
- **Status Management** — Change room states (cleaning, maintenance, available) with audit trail

### Administration
- **Dashboard** — Occupancy stats, revenue overview, room distribution charts
- **Price Management** — Configure room rates by type and product prices by category
- **User Management** — Role-based access (admin, owner, operator) with full CRUD
- **Security Dashboard** — Login logs, security events, active sessions, IP tracking
- **Audit History** — Paginated log of all system actions with user attribution
- **Accounting Reports** — Revenue summaries and Excel export
- **2FA Configuration** — Per-user two-factor authentication enforcement

### Guest-Facing
- **PIN-Gated Access** — Guests view their balance and consumption history with their room PIN
- **Self Check-Out** — Request check-out from the room terminal
- **Printable Invoice** — Professional PDF invoice via jsPDF

### Public Website
- **Hotel Landing Page** — Room showcase, hero slider, booking form, amenities display
- **Responsive Design** — Fully mobile-optimized with Tailwind CSS

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js 20+, Express 5 |
| **Frontend** | React 19, Vite 8, React Router 7 |
| **Styling** | Tailwind CSS 3, Framer Motion |
| **Data** | JSON files (dev), Upstash Redis (prod) |
| **Auth** | JWT, bcryptjs, httpOnly cookies |
| **Real-Time** | WebSocket (`ws`) |
| **Validation** | Zod, express-validator |
| **Logging** | Pino (structured JSON) |
| **Testing** | Vitest, Supertest, Playwright |
| **Security** | Helmet, CORS, CSRF, rate limiting, reCAPTCHA, 2FA |
| **CI/Tools** | Biome, Lighthouse CI, ai-review-pipeline, semgrep, knip |

---

## Project Structure

```
hotel-system/
├── backend/                  # Express REST API (port 3001)
│   ├── src/
│   │   ├── controllers/     # Business logic
│   │   ├── data/            # Persistence layer (JSON/Redis)
│   │   ├── middleware/       # Auth, validation, security, error handling
│   │   ├── routes/          # API route definitions
│   │   └── utils/           # ID generator, PIN generator, logger, backup, etc.
│   ├── server.js            # Entry point
│   ├── rooms.json           # Room data
│   ├── consumos.json        # Consumption records
│   └── prices.json          # Room rates & product prices
│
├── frontend/                # React + Vite SPA (port 5173)
│   ├── src/
│   │   ├── components/      # UI screens & shared components
│   │   ├── ecoweb/          # Public hotel landing page (TS)
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API client
│   │   ├── constants/       # Product lists, room config, helpers
│   │   └── utils/           # Currency formatting, PDF generation, etc.
│   └── vite.config.js       # Dev proxy to backend
│
├── ai/                      # AI agent context & skills
├── scripts/                 # Seed scripts
└── docs/                    # Design docs, best practices
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/Sebas0317/hotel-system.git
cd hotel-system

cd backend
npm install

cd ../frontend
npm install
```

### Running

Start **both** servers in separate terminals:

```bash
# Terminal 1 — Backend (port 3001)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Default Credentials

Configure `backend/.env`:

```env
ADMIN_PASSWORD=ecobosque2024
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=8h
```

---

## API Overview

| Route | Module | Description |
|-------|--------|-------------|
| `GET /rooms` | Rooms | List all rooms with status |
| `POST /rooms/checkin` | Rooms | Register guest check-in |
| `POST /rooms/:id/checkout` | Rooms | Process check-out & invoice |
| `POST /consumos` | Consumos | Log a consumption charge |
| `GET /consumos/:roomId` | Consumos | Get room consumption history |
| `POST /auth/login` | Auth | Admin login (JWT) |
| `PUT /prices` | Prices | Update room rates & products |
| `GET /accounting/summary` | Accounting | Revenue summary |
| `GET /accounting/export` | Accounting | Download Excel report |

Full Swagger docs at `/api-docs` when the server is running.

---

## Data Model

### Room States
`disponible` → `reservada` → `ocupada` → `limpieza` / `mantenimiento` → `disponible`

### Key Entities
- **Room** — ID, number, type, capacity, floor, status, guest info, PIN, check-in/out timestamps
- **Consumption** — ID, room ID, description, category (restaurant/bar/services), price (COP), timestamp
- **Reservation** — ID, room ID, guest details, check-in/out dates, status
- **User** — ID, username, role, hashed password, 2FA status, login logs

---

## Security Features

- JWT tokens in httpOnly cookies (not localStorage)
- bcrypt password hashing
- Rate limiting: 100 req/min global, 10 req/min auth, 5 req/min PIN attempts
- Google reCAPTCHA v2 on login
- TOTP-based two-factor authentication
- Helmet security headers (CSP, HSTS, X-Frame-Options, etc.)
- CSRF token validation
- Input sanitization (XSS prevention)
- Sensitive file access blocking
- Request timeouts
- Full security audit log

---

## License

MIT
