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
├── mobile/           # React Native (Expo) app
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

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- Stripe account (test mode)

### Setup

```bash
# Install dependencies
npm install

# Set up environment
cp backend/.env.example backend/.env
# Edit backend/.env with your Stripe keys and DB credentials

# Initialize database
psql -U postgres -d fundraising -f backend/src/db/schema.sql

# Start development
npm run dev:backend    # API server on :4000
npm run dev:web        # Admin dashboard on :5173
```

### Docker

```bash
docker compose up -d
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
