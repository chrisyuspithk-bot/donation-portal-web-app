# Mobile App

React Native (Expo) cross-platform app — iOS and Android. Donation flow with Stripe, real-time chat, receipt viewing, and push notifications.

## Stack

| Component | Technology |
|-----------|-----------|
| Framework | React Native 0.74 (Expo SDK 51) |
| Language | TypeScript |
| Navigation | React Navigation (Native Stack + Bottom Tabs) |
| State | Zustand |
| Auth | JWT stored in `expo-secure-store` (Keychain/Keystore) |
| Payments | `@stripe/stripe-react-native` |
| Real-time | Socket.io client |
| Push | Firebase Cloud Messaging (`expo-notifications`) |

## Getting Started

```bash
npm install
npx expo start        # scan QR with Expo Go, or press 'i' for iOS / 'a' for Android
```

### Prerequisites
- Node.js 20+
- Expo Go app (iOS/Android) or simulator/emulator
- Running backend API (see `../backend/README.md`)

## Screens

| Screen | Tab | Description |
|--------|-----|-------------|
| **Login** | — | Email/password authentication |
| **Register** | — | Create new donor account |
| **Donate** | 💝 | Preset amounts + custom, Stripe PaymentSheet |
| **History** | 📋 | Past donations with receipt download links |
| **Chat** | 💬 | Real-time support chat with typing indicators |
| **Profile** | 👤 | Account settings, GDPR deletion request, sign out |

## Donation Flow

1. User selects amount → `POST /donations/create-intent` returns `client_secret`
2. `@stripe/stripe-react-native` presents PaymentSheet
3. User completes payment → app polls `GET /donations/confirm/:intentId` for up to 10 seconds
4. When status = `completed`, "Thank You" alert with receipt link
5. Socket.io event `notification:receipt_ready` pushes receipt URL in background

## Push Notifications

Uses Firebase Cloud Messaging. On app launch:
1. Request notification permissions
2. Get FCM device token via `expo-notifications`
3. Send token to `POST /api/auth/register-token`

The backend sends push via `firebase-admin` SDK — single `token` field works for both APNs (iOS) and FCM (Android).

## Security

- **JWT tokens**: stored in Keychain (iOS) / Keystore (Android) via `expo-secure-store` — *never* AsyncStorage
- **PCI DSS**: never handles raw card numbers — Stripe SDK handles all payment UI
- **GDPR**: Profile screen includes "Request Data Deletion" option → calls `DELETE /api/admin/donors/:id/erase`
- **Deep links**: `applinks:` (iOS) and `intent://` (Android) configured for return from web-based 3D Secure

## Project Structure

```
src/
├── App.tsx              # Root: auth gate → AuthNavigator or MainNavigator
├── navigation/
│   ├── AuthNavigator.tsx    # Login / Register stack
│   └── MainNavigator.tsx    # Tab navigator (Donate, History, Chat, Profile)
├── screens/
│   ├── LoginScreen.tsx      # Email/password login
│   ├── RegisterScreen.tsx   # New account creation
│   ├── DonateScreen.tsx     # Amount selection + Stripe PaymentSheet
│   ├── HistoryScreen.tsx    # Paginated donation list with receipts
│   ├── ChatScreen.tsx       # Real-time chat with typing indicators
│   └── ProfileScreen.tsx    # Account management + GDPR deletion
├── services/
│   ├── api.ts               # Axios client with JWT interceptor
│   └── socket.ts            # Socket.io client with auth
└── stores/
    └── authStore.ts         # Zustand + SecureStore auth persistence
```

## Scripts

```bash
npm start          # Expo dev server
npm run android    # Open on Android
npm run ios        # Open on iOS
npm test           # Jest
```

## Deployment

- **iOS**: Distribute via TestFlight → App Store
- **Android**: Internal Testing Track → Google Play Console
- Update `API_BASE` in `src/services/api.ts` and `SOCKET_URL` in `src/services/socket.ts` for production

## Universal Links

Configured in `app.json`:

```json
{
  "ios": { "associatedDomains": ["applinks:fundraising.app"] },
  "android": { "intentFilters": [{ "action": "VIEW", "data": [{"scheme": "https", "host": "fundraising.app"}] }] }
}
```
