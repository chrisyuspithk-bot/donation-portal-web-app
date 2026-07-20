# Backend API

Node.js + Express.js REST API with TypeScript — payment processing, real-time events, push notifications, and analytics.

## Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 20, TypeScript |
| Framework | Express.js |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Database | PostgreSQL (pg) |
| Cache/Pub-Sub | Redis (ioredis) |
| Payments | Stripe (Payment Intents + Webhooks) |
| Real-time | Socket.io |
| Push | Firebase Cloud Messaging (firebase-admin) |
| Jobs | BullMQ (receipts), node-cron (analytics) |
| Validation | Zod |
| Logging | Winston |

## Getting Started

```bash
cp .env.example .env   # fill in your keys
npm install
npm run dev            # starts on :4000 with hot reload
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 4000) |
| `DB_HOST` | Yes | PostgreSQL host |
| `DB_PORT` | No | PostgreSQL port (default: 5432) |
| `DB_NAME` | Yes | Database name |
| `DB_USER` | Yes | Database user |
| `DB_PASSWORD` | Yes | Database password |
| `REDIS_HOST` | Yes | Redis host |
| `REDIS_PORT` | No | Redis port (default: 6379) |
| `JWT_SECRET` | Yes | Secret for signing JWTs |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key (sk\_\*) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret (whsec\_\*) |
| `FIREBASE_PROJECT_ID` | No | Firebase project for push notifications |
| `FIREBASE_CLIENT_EMAIL` | No | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | No | Firebase service account private key |

## Database

```bash
psql -U postgres -d fundraising -f src/db/schema.sql
```

## API Endpoints

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/register` | No | Create account |
| `POST` | `/api/auth/login` | No | JWT login |
| `POST` | `/api/auth/register-token` | Yes | Register FCM device token |

### Donations
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/donations/create-intent` | Yes | Create Stripe PaymentIntent |
| `GET` | `/api/donations/confirm/:intentId` | Yes | Poll payment confirmation |
| `GET` | `/api/donations/history/:donorId` | Yes | Paginated donation history |

### Receipts
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/receipts/:donationId` | Yes | Get receipt metadata |
| `GET` | `/api/receipts/:donationId/download` | Yes | Download PDF receipt |

### Admin
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/admin/analytics` | Yes | Donor behavior analytics |
| `GET` | `/api/admin/donations` | Yes | All donations (filterable) |
| `POST` | `/api/admin/receipts/resend` | Yes | Bulk resend receipts |
| `GET` | `/api/admin/chat/sessions` | Yes | Active chat sessions |
| `POST` | `/api/admin/notifications/broadcast` | Yes | Send push campaign |
| `DELETE` | `/api/admin/donors/:donorId/erase` | Yes | GDPR/CCPA data erasure |

### Webhooks
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/webhooks/stripe` | Stripe sig | Stripe event receiver |

## WebSocket Events

Connect with JWT token in `auth.token`:

```js
const socket = io('http://localhost:4000', { auth: { token: 'jwt...' } });
```

| Event | Direction | Room | Description |
|-------|-----------|------|-------------|
| `donation:live` | Server → Admin | `admin:dashboard` | New donation received |
| `chat:join_room` | Client → Server | — | Join a donor's chat room |
| `chat:send_message` | Bidirectional | `chat:{donorId}` | Chat message relay |
| `chat:typing` | Bidirectional | `chat:{donorId}` | Typing indicator |
| `chat:mark_read` | Client → Server | — | Mark messages as read |
| `notification:receipt_ready` | Server → Mobile | `user:{userId}` | Receipt generated |

## Stripe Webhook Flow

1. Client calls `POST /donations/create-intent` → gets `client_secret`
2. Client presents Stripe Payment Sheet → user pays
3. Stripe sends `payment_intent.succeeded` webhook to `POST /webhooks/stripe`
4. Backend verifies signature, marks donation `completed`, updates donor stats
5. BullMQ job generates PDF receipt → emits `notification:receipt_ready` via Socket.io
6. Admin dashboard receives `donation:live` event

### Idempotency

The webhook handler guards against duplicate events by checking `WHERE status = 'pending'` before updating. Re-delivered webhooks are safely ignored.

## Project Structure

```
src/
├── index.ts              # Entry point — DB/Redis connect, HTTP server, Socket.io init
├── app.ts                # Express app setup, middleware, routes
├── config/
│   ├── index.ts          # Environment config
│   ├── database.ts       # PostgreSQL pool
│   ├── redis.ts          # Redis client + subscriber
│   └── logger.ts         # Winston logger
├── middleware/
│   ├── auth.ts           # JWT verification, auth payload types
│   └── errorHandler.ts   # Global error handler
├── routes/
│   ├── auth.ts           # /api/auth/*
│   ├── donations.ts      # /api/donations/*
│   ├── receipts.ts       # /api/receipts/*
│   ├── admin.ts          # /api/admin/*
│   └── webhooks.ts       # /webhooks/*
├── controllers/
│   ├── authController.ts
│   ├── donationsController.ts
│   ├── receiptsController.ts
│   ├── adminController.ts
│   └── webhooksController.ts
├── services/
│   ├── stripeService.ts      # Stripe PaymentIntent + webhook handling
│   ├── receiptService.ts     # PDF generation via PDFKit
│   └── notificationService.ts # FCM push sending
├── jobs/
│   ├── receiptQueue.ts   # BullMQ worker for async receipt generation
│   └── analytics.ts      # node-cron hourly aggregation
├── websocket/
│   └── index.ts          # Socket.io server setup, auth, event routing
└── db/
    └── schema.sql        # PostgreSQL table definitions
```

## Scripts

```bash
npm run dev       # Start with tsx watch (hot reload)
npm run build     # Compile TypeScript
npm start         # Run compiled JS
npm test          # Run Jest tests
```
