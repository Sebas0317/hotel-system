---
name: room-management
description: Room management workflows in EcoBosque system
license: MIT
compatibility: opencode
metadata:
  audience: developers
  domain: hotel
---

## Room Categories

| Type | Prefix | Floor | Price (COP) |
|------|---------|-------|-------------|
| Suite Bosque | sb- | 1 | 350,000 |
| Suite Sunset | ss- | 2 | 420,000 |
| Suite Edén | se- | 3 | 480,000 |
| Habitación Pareja | hp- | 4 | 180,000 |
| Habitación Doble Estándar | hd- | 5 | 160,000 |
| Habitación Cuádruple Estándar | hc- | 6 | 220,000 |
| Cabaña Familiar en Bote | cb- | 0 | 550,000 |

## Room States

- `disponible` - Available for booking
- `reservada` - Reserved (future check-in)
- `ocupada` - Currently occupied
- `limpieza` - Being cleaned
- `mantenimiento` - Under maintenance

## Add New Rooms

Add to `/backend/rooms.json`:
```json
{
  "id": "sb-106",
  "numero": "106",
  "tipo": "Suite Bosque",
  "camas": "1 cama king",
  "capacidad": 2,
  "piso": 1,
  "estado": "disponible",
  "amenidades": ["jacuzzi_privado", "wifi", "ac", "balcon", "vista_bosque", "arquitectura_sostenible"],
  "descripcion": "Suite con jacuzzi privado...",
  "tarifa": 350000
}
```

## Checkout Request Flow

1. User clicks "Guest Checkout" in `/user/checkout`
2. Calls `POST /rooms/:id/solicitar-checkout` (no auth)
3. Backend saves `solicitudCheckout` object with date/time
4. Admin sees 🔔 bell on room card
5. Room detail shows checkout request message

## Admin Room Filtering

- Grouped by `tipo` (not floor) - handled by `agruparPorPiso()`
- Filter by: estado, tipo, room number, guest name
- URL params sync via `useFilterSync` hook
- Auto-refresh via `useRoomSync` hook (5s interval)

## User Room Status View

- URL: `/user` (requires user role)
- Shows only occupied rooms for that user
- Displays: room details, check-in/out, consumptions, total
- "Guest Checkout" button triggers checkout request