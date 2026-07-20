# Shared Types

Common TypeScript types and interfaces shared across the monorepo — backend, web admin, and mobile app.

## Usage

```typescript
import { User, Donor, Donation, DonationStatus, WsEvent } from '@fundraising/shared';
```

## Types

### Database Entities

| Type | Description |
|------|-------------|
| `User` | Auth user with email, name, Stripe customer ID, FCM token |
| `Donor` | Donor profile with total donated, rank, lifetime value |
| `Donation` | Individual donation with amount, currency, Stripe PI ID, status |
| `DonationStatus` | `'pending' \| 'completed' \| 'failed' \| 'refunded'` |
| `Receipt` | Donation receipt with PDF URL and email tracking |
| `ChatMessage` | Chat message with sender/receiver, read status |
| `NotificationLog` | Push/email notification delivery record |
| `DonorAnalytics` | Pre-computed daily analytics aggregation |

### API Contracts

| Type | Description |
|------|-------------|
| `AuthRegisterRequest` | Registration payload (email, name, password) |
| `AuthLoginRequest` | Login payload (email, password) |
| `AuthResponse` | JWT token + user profile |
| `CreatePaymentIntentRequest` | Stripe intent creation (amount, currency, donor) |
| `CreatePaymentIntentResponse` | `client_secret` + `payment_intent_id` |
| `DonationHistoryResponse` | Paginated donation list |
| `AnalyticsResponse` | Daily metrics + summary stats |
| `BroadcastNotificationRequest` | Push campaign with optional segment targeting |

### WebSocket Events

| Type | Payload |
|------|---------|
| `WsDonationEvent` | `donor_name`, `amount`, `currency`, `status`, `created_at` |
| `WsChatEvent` | `sender_id`, `receiver_id`, `message`, `created_at` |
| `WsTypingEvent` | `sender_id`, `receiver_id`, `is_typing` |
| `WsReceiptReadyEvent` | `donation_id`, `receipt_url` |

### Utilities

| Type | Description |
|------|-------------|
| `DonorSegment` | Push notification targeting (min donated, days since last) |

## Build

```bash
npm run build       # tsc → dist/
npm run dev         # tsc --watch
```

This package is consumed by all other workspaces via `@fundraising/shared` in their `package.json` dependencies.
