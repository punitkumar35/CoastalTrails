# Coastal Trails — Gokarna Connect

Curated coastal homestays across Gokarna, Karnataka — a React web experience and a React admin console sharing one Express + MySQL backend.

> 📘 **Comprehensive Context & AI Assistant Guide:** See [AI_PROJECT_CONTEXT.md](AI_PROJECT_CONTEXT.md) for full architecture, ports, cPanel hosting, database configs, and guardrails.
> 🔗 **Quick URLs & Ports:** See [URLS.md](URLS.md) for clickable local & production services.

**The Coastal Trails Standard:** 10% fair host model (₹10 convenience fee), 20% online hold with 80% payable at the property, and every cottage mapped with cliff trails, ferry timings, and auto dispatcher helplines.

## What's new in Prototype 3 (`prototype-3` branch)

This branch extends Prototype 2 with the public Gokarna guide, the full customer profile dashboard, and account security.

### 1. Gokarna guide website (SEO landing pages)

- 12 crawlable static pages in `website/client/public/gokarna/`: hub `/gokarna/`, `/gokarna/5-beach-trek/`, `/gokarna/beaches/`, `/gokarna/tours/`, `/gokarna/camping/`, `/gokarna/things-to-do/`, `/gokarna/travel-guide/` plus best-time-to-visit, how-to-reach, 2-day and 3-day itineraries, and trip-cost.
- Editorial magazine theme on the hub (`assets/editorial.css`), brand stylesheet and a theme-aware navbar/footer identical to the traveler app — including profile photo, **My Profile**, My Bookings and Sign Out synced with the app session.
- Per-page titles, meta descriptions, canonicals, Open Graph, JSON-LD (Organization, TouristDestination, TouristTrip, Article, FAQPage, BreadcrumbList), `sitemap.xml`, updated `robots.txt`, descriptive image filenames and alt text.

### 2. Customer profile dashboard (`/profile`)

- Premium shell: gradient welcome header (photo, role and Coastal Member badges), sidebar navigation on desktop, icon grid on mobile.
- **Overview** — stat cards (total/upcoming/completed/total spent), upcoming trip cards with images, recent booking activity.
- **My Bookings** — All/Upcoming/Completed/Cancelled tabs, cancel booking (existing business rules), booking details page with payment history and refund notes.
- **Payment History** — captured/refunded totals, desktop table + mobile cards, status badges, booking links.
- **Wishlist** — server-backed saved stays with hearts on Explore cards and stay pages synced to the account.
- **Personal Information** — profile photo upload, name and date of birth editable; mobile number and email locked as account identity.
- **Security** — change password with strength meter, show/hide, live rules and sign-out of all other sessions.
- **Settings**, **Help & Support** (email + per-booking host WhatsApp with booking ID, FAQs) and **Wallet** (honest "coming soon" state).

### 3. Authentication & account security

- Forgot Password (`/forgot-password`) and Reset Password (`/reset-password?token=…`) with a branded HTML email, 15-minute single-use tokens (only SHA-256 hashes stored in `password_resets`), per-IP/email rate limiting, generic responses (no account enumeration) and full session revocation after a reset.
- `?auth=signin` deep link opens the sign-in modal; “Forgot password?” added to the modal.
- Admin console: logo/favicon paths fixed for the `/admin/` base path and a mobile navigation row added.

### 4. Database migrations (applied automatically on boot)

- `users.profile_image`, `users.date_of_birth`
- `wishlist` — unique per user + stay, cascade foreign keys
- `password_resets` — `user_id`, `token_hash`, `created_at`, `expires_at`

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

Password reset emails use the existing SMTP settings (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`); the reset link points at `SITE_URL` (falls back to the request host), so set `SITE_URL=https://coastaltrails.in` in production.

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

- **Auth** — register/login with bcrypt hashes, database-backed sessions, Bearer tokens, logout, role-aware guards (`requireAuth`, `requireAdmin`), profile (`GET/PUT /api/auth/profile`), password change (`PUT /api/auth/password`), password recovery (`POST /api/auth/forgot-password`, `POST /api/auth/reset-password`) and avatar upload (`POST /api/upload/avatar`)
- **Wishlist** — saved stays per authenticated customer (`GET/POST/DELETE /api/wishlist[/:homestayId]`, duplicates ignored)
- **Payments** — plus `GET /api/payments` for the signed-in traveler's own payment records
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
