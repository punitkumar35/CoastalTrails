# Coastal Trails — Gokarna Connect

Curated coastal homestays across Gokarna, Karnataka — a Flutter mobile app, a React web experience, and a React admin console sharing one Express + MySQL backend.

**The Coastal Trails Standard:** 10% fair host model (₹10 convenience fee), 20% online hold with 80% payable at the property, and every cottage mapped with cliff trails, ferry timings, and auto dispatcher helplines.

## Repository layout

```
lib/                      Flutter app (Android/iOS/web)
website/client/           React + Vite + TypeScript + Tailwind web app (travelers)
website/client/DESIGN.md  Design system contract ("Deep Water Cartography")
website/server/           Express API + MySQL database
website/server/db/        MySQL schema (schema.sql), demo data (seed.js)
website/server/middleware Session auth: requireAuth / requireAdmin
Coastal-admin/            React + Vite admin console (dashboard, bookings, rooms)
docs/                     Project audit & architecture documents
```

## Getting started

### 1. Database (MySQL 8)

```bash
mysql -u root -p
CREATE DATABASE coastal_trails CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Copy `website/server/.env.example` to `website/server/.env` and fill in your MySQL credentials. The API creates the database when missing and applies the schema + migrations automatically on boot.

### 2. API + web (main development loop)

```bash
cd website/server
npm install
npm run seed      # loads 12 demo stays, routes, enclaves and guest reviews
npm run dev       # API on http://localhost:5000

cd ../client
npm install
npm run dev       # web app on http://localhost:3000 (proxies /api and /uploads → :5000)
```

### 3. Admin console

```bash
cd Coastal-admin
npm install
npm run dev       # admin app on http://localhost:3002
```

Admin sign-in uses a real account with the `admin` role through `POST /api/auth/login` (the seeded `admin-1` user; set its `password_hash` before first use).

### 4. Flutter app

```bash
flutter pub get
flutter run       # connects to http://localhost:5000 (10.0.2.2 from the Android emulator)
```

## What the API covers

- **Auth** — register/login with bcrypt hashes, database-backed sessions, Bearer tokens, logout, role-aware guards (`requireAuth`, `requireAdmin`)
- **Bookings** — per-night availability with room counts, 24h holds, persistent room assignment, user-scoped listing (`/api/bookings`), admin-only status changes, traveler cancellation
- **Payments** — separated payment state (`pending/paid/failed/partially_paid/refunded`) with a simulated gateway: initiate → server-side confirm → booking moves from `pending_payment` to `awaiting_host`
- **Rooms** — per-room status overrides (maintenance / blocked / private use) that immediately reduce traveler availability, blocked dates shown in red and unbookable
- **Reviews** — one review per user per stay, owner-only edit/delete, photo uploads (≤5 MB), review media page, and a completed-stay requirement tied to `reviews.booking_id`
- **Admin** — dashboard stats, bookings, hosts, room-status Gantt, room state/housekeeping, stay settings, walk-in desk bookings, enclaves

## Useful scripts

| Where | Command | What it does |
|---|---|---|
| `website/server` | `npm run seed` | Resets demo data (stays, routes, enclaves) |
| `website/server` | `npm start` | Runs the API (port 5000, or `PORT` env) |
| `website/client` | `npm run dev` | Traveler web app with hot reload (port 3000) |
| `website/client` | `npm run build` | Type-check + production build |
| `Coastal-admin` | `npm run dev` | Admin console (port 3002) |
| `Coastal-admin` | `npm run build` | Type-check + production build |

## Notes for contributors

- Design decisions trace to `website/client/DESIGN.md` — extend the token system there first, never hardcode colors/sizes in components.
- Availability is computed live from active bookings and admin room blocks (`website/server/db/availability.js`); never write static "reserved" rows for bookings.
- The author of a booking or review is always the authenticated session user — the browser never decides identity.
- The full architecture audit and fix plan lives in `docs/coastal-trails-audit.html`.
