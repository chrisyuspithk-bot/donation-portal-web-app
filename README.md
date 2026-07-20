# Fundraising SaaS Platform

Cross-platform fundraising platform with **React Native** (iOS/Android), **React.js** admin dashboard, and **Node.js** backend.

## Architecture

```
fundraising-saas/
├── backend/          # Node.js + Express.js API
│   └── src/
│       ├── config/       # DB, Redis, Stripe, Logger configs
│       ├── controllers/  # Auth, Donations, Receipts, Admin, Webhooks
│       ├── middleware/    # JWT auth, error handling
│       ├── services/     # Stripe, Receipt, Notification services
│       ├── routes/       # REST API route definitions
│       ├── jobs/         # BullMQ receipt queue, cron analytics
│       ├── websocket/    # Socket.io real-time events
│       └── db/           # PostgreSQL schema
├── web-admin/        # React.js dashboard (Vite + Tailwind)
│   └── src/
│       ├── components/   # Layout, reusable UI
│       ├── pages/        # Dashboard, Donations, Chat, Notifications
│       ├── services/     # API client, Socket.io client
│       └── stores/       # Zustand state management
├── mobile-new/       # React Native (Expo) app (current)
│   └── src/
│       ├── screens/      # Login, Register, Donate, History, Chat, Profile
│       ├── navigation/   # Auth + Main tab navigators
│       ├── services/     # API client, Socket.io client
│       └── stores/       # Zustand + SecureStore auth
└── shared/           # Shared TypeScript types
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Mobile** | React Native (Expo), TypeScript, Stripe React Native SDK |
| **Web Admin** | React.js, Vite, Tailwind CSS, Recharts, Zustand |
| **Backend** | Node.js, Express.js, TypeScript |
| **Database** | PostgreSQL (primary), Redis (caching/pub-sub) |
| **Payments** | Stripe Payment Intents API + Webhooks |
| **Real-time** | Socket.io |
| **Push** | Firebase Cloud Messaging (FCM) |
| **Jobs** | BullMQ (Redis-backed) for receipt generation, node-cron for analytics |

## Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- Stripe account ([test mode](https://dashboard.stripe.com/test/dashboard) for development)

---

## Stripe Setup (required for donations)

Donations will return a 500 error until Stripe is configured. Here's how to set it up:

### 1. Get your Stripe keys

Create a [Stripe account](https://dashboard.stripe.com/register) and get your **test keys** from the [dashboard](https://dashboard.stripe.com/test/apikeys):

| Key | Where it goes |
|-----|---------------|
| **Publishable key** (`pk_test_...`) | Mobile app — set `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| **Secret key** (`sk_test_...`) | Backend — set `STRIPE_SECRET_KEY` in `.env` |
| **Webhook secret** (`whsec_...`) | Backend — set `STRIPE_WEBHOOK_SECRET` in `.env` |

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
# Edit .env — fill in STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET
```

### 3. Configure the mobile app

```bash
cd mobile-new
cp .env.example .env
# Edit .env — fill in EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

### 4. (Production only) Set up webhook endpoint

For local dev, webhooks aren't needed — the app polls for payment confirmation.
For production, register `https://your-domain.com/webhooks/stripe` in the Stripe dashboard and copy the signing secret.

---

## Development (local)

Run each service directly on your machine with hot reload.

```bash
# 1. Clone and install
git clone https://github.com/chrisyuspithk-bot/donation-portal-web-app.git
cd donation-portal-web-app
npm install

# 2. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env — set DB credentials + Stripe test keys

# 3. Create the database (local PostgreSQL)
createdb fundraising
psql -d fundraising -f backend/src/db/schema.sql

# 4. Start everything in dev mode
npm run dev:backend     # API server → http://localhost:4000 (nodemon hot reload)
npm run dev:web         # Admin dashboard → http://localhost:5173 (Vite HMR)
npm run dev:mobile      # React Native → Expo dev server (scan QR code)
```

## Production (Docker)

Single command with containers for all services. No local PostgreSQL or Redis needed.

```bash
# Set Stripe keys (required)
export STRIPE_SECRET_KEY=sk_live_...
export STRIPE_WEBHOOK_SECRET=whsec_...

# Build and start all services
docker compose up -d --build
```

| Service | URL |
|---------|-----|
| Backend API | http://localhost:4000 |
| Web Admin | http://localhost:5173 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

### Useful Docker commands

```bash
docker compose ps              # Check running containers
docker compose logs backend    # View backend logs
docker compose restart backend # Restart after code changes
docker compose down            # Stop everything
docker compose up -d --build backend  # Rebuild backend only
```

## Build

Build any workspace package without running it:

```bash
# Build everything
npm run build -w shared
npm run build -w backend
npm run build -w web-admin

# Or build all at once (if scripts are defined)
npm run build -ws
```

### Build output

| Package | Output | Description |
|---------|--------|-------------|
| `shared` | `shared/dist/` | Compiled TypeScript types |
| `backend` | `backend/dist/` | JavaScript ready for `node dist/index.js` |
| `web-admin` | `web-admin/dist/` | Static files → deploy to any CDN |
| `mobile` | — | Built via Expo (`npx expo build:android` / `eas build`) |

To verify a build:

```bash
npm run build -w backend    # compile TypeScript
node backend/dist/index.js  # start from compiled output
```

## API Endpoints

### Auth
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — JWT login
- `POST /api/auth/register-token` — Register FCM device token

### Donations
- `POST /api/donations/create-intent` — Create Stripe PaymentIntent
- `GET /api/donations/confirm/:intentId` — Poll payment status
- `GET /api/donations/history/:donorId` — Paginated history

### Receipts
- `GET /api/receipts/:donationId` — Get receipt metadata
- `GET /api/receipts/:donationId/download` — Download PDF receipt

### Admin
- `GET /api/admin/analytics?days=30` — Donor behavior analytics
- `GET /api/admin/donations` — All donations with filtering
- `POST /api/admin/receipts/resend` — Bulk resend receipts
- `GET /api/admin/chat/sessions` — Active chat sessions
- `POST /api/admin/notifications/broadcast` — Send push campaign
- `DELETE /api/admin/donors/:donorId/erase` — GDPR/CCPA data erasure

### Webhooks
- `POST /webhooks/stripe` — Stripe event receiver

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `donation:live` | Server → Admin | Real-time donation notification |
| `chat:send_message` | Bidirectional | Chat message relay |
| `chat:typing` | Bidirectional | Typing indicator |
| `notification:receipt_ready` | Server → Mobile | Receipt generation complete |

## Stripe Webhook Flow

1. App calls `create-intent` → gets `client_secret`
2. App presents Stripe Payment Sheet
3. Stripe sends `payment_intent.succeeded` webhook
4. Backend verifies signature, marks donation complete, updates donor stats
5. BullMQ job generates PDF receipt, emits `donation:live` to admin, emits `notification:receipt_ready` to donor

## Security

- **PCI DSS**: Never handles raw card data — uses Stripe Elements/SDK exclusively
- **GDPR/CCPA**: `DELETE /api/admin/donors/:id/erase` anonymizes all personal data
- **JWT tokens**: Stored in Keychain (iOS) / Keystore (Android) via `expo-secure-store`
- **Webhook verification**: All Stripe webhooks verified via signature check

## Deployment

- **Backend**: AWS ECS Fargate / Google Cloud Run
- **Database**: AWS RDS PostgreSQL with read replicas
- **Web Admin**: Vercel / Netlify (static site)
- **Mobile**: TestFlight (iOS), Internal Testing Track (Android)
