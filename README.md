# EcoBosque Hotel System

A full-stack hotel management system built with Node.js/Express (backend) and React + Vite (frontend). Features room management, reservations, check-in/check-out, consumption tracking, and a public landing page.

![EcoBosque Hotel](https://img.shields.io/badge/EcoBosque-HotelSystem-green)
![Node.js](https://img.shields.io/badge/Node.js-20.x-green)
![React](https://img.shields.io/badge/React-19.x-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## Features

### Backend (REST API)
- **Room Management** - CRUD operations for hotel rooms
- **Check-in/Check-out** - Guest registration with auto-generated PIN
- **Reservations** - Book rooms with guest details
- **Consumption Tracking** - Track restaurant, bar, and service charges per room
- **Price Configuration** - Admin-controlled room rates and product prices
- **Authentication** - JWT-based admin login with rate limiting

### Frontend (React + Vite)
- **Admin Dashboard** - Room overview, statistics, price management
- **Reception Panel** - Check-in, check-out, consumption, room details
- **Public Landing Page** - Hotel website with room showcase
- **Role-based Access** - Admin and Reception user flows

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express.js |
| Frontend | React 19, Vite, React Router |
| Styling | Tailwind CSS |
| Data Storage | JSON files |
| Auth | JWT, bcryptjs |

## Project Structure

```
hotel-system/
├── backend/                 # Express REST API
│   ├── src/
│   │   ├── controllers/    # Business logic
│   │   ├── data/           # JSON file storage
│   │   ├── middleware/     # Auth, validation, error handling
│   │   ├── routes/         # API endpoints
│   │   └── utils/          # Helpers (ID, PIN, checkout)
│   ├── rooms.json          # Room data
│   ├── consumos.json       # Consumption records
│   └── prices.json         # Room rates & products
│
├── frontend/               # React + Vite app
│   ├── src/
│   │   ├── components/     # Admin & Reception screens
│   │   ├── landing/        # Public hotel website
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API client
│   │   └── utils/          # Helpers
│   └── public/             # Static assets
│
└── ai/                     # AI context & skills for agents
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Sebas0317/hotel-system.git
cd hotel-system
```

2. **Install backend dependencies**
```bash
cd backend
npm install
```

3. **Install frontend dependencies**
```bash
cd ../frontend
npm install
```

### Running the Application

Start both servers in separate terminals:

**Backend** (port 3001):
```bash
cd backend
npm run dev
```

**Frontend** (port 5173):
```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

### Default Credentials

- **Admin Password**: `ecobosque2024` (set in `.env`)

## API Endpoints

### Rooms
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/rooms` | List all rooms |
| GET | `/rooms/stats` | Room statistics |
| GET | `/rooms/reservaciones` | All reservations |
| POST | `/rooms/checkin` | Check in guest |
| POST | `/rooms/validar` | Validate room PIN |
| POST | `/rooms/:id/reservar` | Create reservation |
| PATCH | `/rooms/:id/status` | Update room status |
| POST | `/rooms/:id/checkout` | Check out guest |
| POST | `/rooms/:id/cancel` | Cancel reservation |

### Consumptions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/consumos` | Register consumption |
| GET | `/consumos/:roomId` | Get room consumptions |

### Prices (Admin Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/prices` | Get rates & products |
| PUT | `/prices` | Update prices |

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Admin login |

## Data Models

### Room
```json
{
  "id": "1001",
  "numero": "101",
  "tipo": "estándar",
  "camas": "1 cama doble",
  "capacidad": 2,
  "piso": 1,
  "estado": "disponible",
  "huesped": null,
  "pin": null,
  "checkIn": null
}
```

### Room States
- `disponible` - Available
- `reservada` - Reserved
- `ocupada` - Occupied
- `limpieza` - Under cleaning
- `mantenimiento` - Under maintenance

## Environment Variables

Create a `.env` file in `backend/`:

```env
ADMIN_PASSWORD=ecobosque2024
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=8h
```

## License

MIT License
