# Coastal Trails (Gokarna Connect) — Comprehensive Project Context & AI Guide

> **Notice for AI Assistants (Cursor, Antigravity, Claude, Copilot, ChatGPT, etc.):**
> Read this document completely before modifying or generating code. This file documents the entire project architecture, services, local and production ports, database configurations, third-party integrations, and critical implementation rules.

---

## 1. Project Overview & Business Logic

- **Project Name:** Coastal Trails (also referenced as Gokarna-Connect)
- **Domain:** `https://coastaltrails.in`
- **Concept:** A curated coastal living and community-based homestay booking platform for Gokarna, Karnataka.
- **Fair Host Ethos:**
  - 10% fair aggregation fee (₹10 convenience fee).
  - **Payment Model:** 20% advance hold fee paid online via Razorpay to confirm the reservation; remaining 80% balance paid directly at the property upon check-in.
  - Curated local trails, sea ferries, cultural temple etiquette, and coastal journal ("The Gokarna Journal").

---

## 2. Repository Structure

```
y:/Gokarna/Gokarna-Connect/
├── Coastal-admin/           # React 19 + TypeScript + Vite admin dashboard (PMS)
├── website/
│   ├── client/              # React 19 + TypeScript + Vite traveler web application
│   └── server/              # Express REST API + MySQL database layer
│       ├── assets/          # Static assets (logos, whatsapp header images)
│       ├── db/              # Database connection, schemas, migrations, seeders
│       ├── routes/          # API route controllers (homestays, bookings, payments, auth, admin)
│       ├── services/        # Service modules (mail.js, etc.)
│       ├── utils/           # Utility helpers (whatsapp.js, email.js)
│       └── scripts/         # cPanel deployment, diagnostics, and verification scripts
├── docs/                    # Architecture documents, DKIM DNS records, specifications
├── shortcuts/               # Double-clickable Windows .url shortcuts to local & live services
├── coastal_trails_backup_*.sql # Local MySQL database dump
├── README.md                # Standard project documentation
├── URLS.md                  # Quick URL directory
└── AI_PROJECT_CONTEXT.md    # THIS DOCUMENT (Universal AI Reference)
```

---

## 3. Local Development Services & Ports

| Service | Local URL | Port | Working Directory | Command to Start | Notes |
|---|---|---|---|---|---|
| **Express Backend API** | `http://localhost:5000` | `5000` | `website/server` | `npm run dev` | Proxies DB queries, auth, Razorpay, WhatsApp, email |
| **Traveler Web App (Dev)** | `http://localhost:3000` | `3000` | `website/client` | `npm run dev` | Vite HMR server; proxies `/api` and `/uploads` to `:5000` |
| **Traveler App (Preview)** | `http://localhost:4173` | `4173` | `website/client` | `npm run preview` | Runs the compiled `dist/` production build |
| **Admin Console (PMS)** | `http://localhost:3002` | `3002` | `Coastal-admin` | `npm run dev` | Homestay management, room pricing, booking oversight |
| **Local MySQL Database** | `localhost:3306` | `3306` | — | XAMPP / MariaDB | Database: `coastal_trails` |

---

## 4. Production Hosting & cPanel Environment

- **Server IP:** `66.116.209.42`
- **Domain:** `https://coastaltrails.in`
- **cPanel URL:** `http://66.116.209.42/cpanel`
- **cPanel User:** `coastaee`
- **Node.js Production Daemon:**
  - Runs detached via `/home2/coastaee/nodejs/bin/node` on internal port **`3458`** (supervised by `supervisor.php`).
  - App Directory on Server: `/home2/coastaee/app`
  - Logs: `/home2/coastaee/app/app.log`
- **Web Server & Reverse Proxy:**
  - Apache front-end handles static files and redirects API calls.
  - Root Directory: `/home2/coastaee/public_html`
  - Traveler Web Client: Files in `/home2/coastaee/public_html` (Vite `dist`)
  - Admin Console: Files in `/home2/coastaee/public_html/admin`
  - API Proxy: Handled via `public_html/api/index.php` and `.htaccess`, forwarding `/api/*` to `http://127.0.0.1:3456/api/*`.
  - Cache Headers: `.htaccess` enforces 1-year immutable caching (`public, max-age=31536000, immutable`) for hashed assets and `no-cache` for HTML.
- **Cloudflare Edge CDN (Active):**
  - Nameservers: `arturo.ns.cloudflare.com` and `galilea.ns.cloudflare.com`
  - Anycast Proxy IPs: `104.21.7.60` and `172.67.187.131`
  - SSL/TLS Mode: **Full**
  - Edge Cache Status: `CF-Cache-Status: HIT` on hashed static assets across Indian nodes (Mumbai, Chennai, Bangalore, Delhi).
- **Production MySQL Database:**
  - Host: `localhost` (port 3306 on the cPanel host)
  - Database Name: `coastaee_gokarna`
  - Database User: `coastaee_dbuser`
  - Database Password: `Goodnight01@#DB!`

---

## 5. Environment Variables & Third-Party Integrations

Configured in `website/server/.env` (and replicated on production at `/home2/coastaee/app/.env`):

### A. Core & Server
```env
PORT=5000
SITE_URL=https://coastaltrails.in
```

### B. Database (MySQL)
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=coastal_trails
```
*(On cPanel: `DB_NAME=coastaee_gokarna`, `DB_USER=coastaee_dbuser`, `DB_PASSWORD=Goodnight01@#DB!`)*

### C. Email (SMTP — Gmail)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=bookings@coastaltrails.in
SMTP_PASS=edkuszqaikkdyxab
SMTP_PASSWORD=edkuszqaikkdyxab
MAIL_ADMIN=punithnaik01@gmail.com
MAIL_REPLY_TO=support@coastaltrails.in
```

### D. WhatsApp Cloud API (Meta Graph API)
```env
WHATSAPP_PHONE_NUMBER_ID=1311727232025760
WHATSAPP_BUSINESS_ACCOUNT_ID=2253205252186390
WHATSAPP_API_VERSION=v22.0
WHATSAPP_ACCESS_TOKEN=EAAwA3gMfWxIBSucpITp2XZCz8ZAC8vgX9NDmwoftprM4GIkenFOSxn1v6HS8OV84rmZCLwPH6GMCfOt2V2d9iVI2JF5YI82GWc62XsoJo4E4ZB6lKlfasS1C5mUKuz9zXuz6TlQZASQ5Rn5pCqADzhqekz0ESDEcZCxQOGcHxtumm9H96RHbCCsxbZBkrNLrwZDZD
WHATSAPP_TEMPLATE_LANG=en
WHATSAPP_SIGNUP_TEMPLATE=ct_welcome
WHATSAPP_BOOKING_TEMPLATE=ct_booking_confirmed
```
> **CRITICAL RULE:** WhatsApp integration must ONLY send `ct_welcome` (upon traveler registration/signin) and `ct_booking_confirmed` (upon successful booking confirmation). Do NOT send unsolicited messages or any other template.

### E. Razorpay Payment Gateway (Live Mode)
```env
RAZORPAY_KEY_ID=rzp_live_TenhZxUlBxIbss
RAZORPAY_KEY_SECRET=oK2b0vv8PikwsmRZipUokZWa
RAZORPAY_WEBHOOK_SECRET=21c9f1b64efe2c355d9ed08c701ee7f16c5ffa00c5e121c1757d787912093e22
```

---

## 6. Key Application Routes & Navigation

### Client App (`website/client/src/App.tsx`)
- `/` or `/homestays` -> `ExplorePage.tsx`: Homestay cards, beach filters (`kudle`, `om`, `halfMoon`, `paradise`, `mainBeach`), check-in/check-out search, pricing calculation.
- `/stay/:id` -> `StayDetailPage.tsx`: Deep dive into a homestay with photo gallery, room selections, amenities, host details, and map coordinates.
- `/book/:id` -> `BookingPage.tsx`: Booking checkout form, 20% advance calculation, Razorpay integration, instant hold reservation.
- `/trails` -> `RouteNavigatorPage.tsx`: **"The Gokarna Journal" (Trails · Temples · Tides)** editorial magazine format covering:
  - Culture & History (*Atmalinga, Cow's Ear history, Maha Ganapati, Kotiteertha, Shivaratri, Karavali cuisine*)
  - Beaches (*5-Beach Cliff Trek guide, Half Moon, Paradise, Nirvana, Belekan*)
  - Hidden Gems (*Mirjan Fort, Yana Karst spires, Vibhooti Falls, Kudle Sea Caves*)
  - Activities (*Aghanashini Mangrove Kayaking, Dolphin watching*)
  - Beach Index & Temple Town Etiquette
- `/route` -> Redirects automatically to `/trails`.
- `/bookings` -> `ReservationStatusPage.tsx`: Protected route tracking traveler bookings.
- `/reservation/:refCode` -> Shows confirmed booking voucher and payment summary.

### Admin App (`Coastal-admin/src/App.tsx`)
- `/` -> Admin dashboard stats (active bookings, stays, revenue).
- `/stays` -> Stays listing with edit and delete functionality.
  - *Note:* Deleting a stay cascades to related bookings and rooms via foreign key ON DELETE CASCADE.
- `/stays/new` and `/stays/:id` -> Add / edit homestay details, rooms, rates, amenities, and host info.
- `/bookings` -> All traveler reservations and statuses.

---

## 7. Critical AI Coding Guardrails & Preservation Rules

1. **Trails & Culture Page Integrity:**
   - The `/trails` route MUST render `RouteNavigatorPage.tsx` with "The Gokarna Journal" magazine content.
   - Do NOT replace it with transit comparison / "Trails & Ferry" tables or remove the cultural articles.
2. **Database Integrity & Foreign Keys:**
   - Both local and production databases use MySQL with InnoDB engine.
   - Foreign keys: `bookings.stay_id` references `homestays.id ON DELETE CASCADE`.
   - Never run raw deletes that leave orphan foreign key records or trigger integrity constraint errors.
3. **Session & Auth State:**
   - Traveler authentication uses `localStorage` key `gokarna_traveler_user`.
   - Client uses `GET /api/auth/me` to validate session token integrity.
   - When a 401 response is returned by the server, an `auth:expired` custom event is dispatched to open the login modal cleanly rather than crashing.
4. **Git Branching:**
   - Primary active branch: `CoatsalTrails-Prototype-2` (tracked on remote `origin`).
   - Alias branch: `CoastalTrails-Prototype-2`.
   - Never commit `.env` or raw `.sql` database dumps to Git.
5. **Backups Location on Disk:**
   - 2026-09-26 Folder: `Y:\Gokarna\Gokarna-Connect-Backup-2026-09-26`
   - 2026-09-26 Zip: `Y:\Gokarna\Gokarna-Connect-Backup-2026-09-26.zip`
   - 2026-09-25 Folder: `Y:\Gokarna\Gokarna-Connect-Backup-2026-09-25`
   - 2026-09-25 Zip: `Y:\Gokarna\Gokarna-Connect-Backup-2026-09-25.zip`

---

## 8. Current Work Roadmap (Local Development)

- **Rate Limiting:** Protect `/api/` from abuse and `/api/auth/login` from brute force attacks using in-memory token/leaky bucket rate limiting with real IP detection via `cf-connecting-ip`.
- **OAuth (Google Login):** Add Google One Tap / Google OAuth 2.0 to traveler sign-in for seamless one-click authentication without password friction.

