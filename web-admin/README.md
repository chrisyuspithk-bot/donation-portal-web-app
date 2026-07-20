# Web Admin Dashboard

React.js admin dashboard for managing donors, donations, live chat, and push notification campaigns. Built with Vite, Tailwind CSS, and Recharts.

## Stack

| Component | Technology |
|-----------|-----------|
| Framework | React 18 + Vite |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| State | Zustand (persisted auth) |
| HTTP | Axios with JWT interceptor |
| Real-time | Socket.io client |
| Notifications | react-hot-toast |

## Getting Started

```bash
npm install
npm run dev            # starts on http://localhost:5173
```

The dev server proxies `/api` and `/socket.io` to the backend at `localhost:4000`. Configure in `vite.config.ts`.

## Pages

| Page | Route | Description |
|------|-------|-------------|
| **Login** | `/login` | Admin authentication |
| **Dashboard** | `/` | KPI cards, revenue/avg gift charts, live donation feed |
| **Donations** | `/donations` | Data grid with status filter, bulk receipt resend, pagination |
| **Live Chat** | `/chat` | Session sidebar, real-time messaging, unread counts |
| **Notifications** | `/notifications` | Push campaign composer with donor segment targeting |

### Dashboard

- **KPI Cards**: Total donors, total revenue, average gift, churn rate
- **Revenue Trend**: Line chart over selected period (7d / 30d / 90d)
- **Average Gift Trend**: Bar chart
- **Live Donations**: Real-time feed via Socket.io `donation:live` event

### Donations

- Status badges (pending / completed / failed / refunded)
- Checkbox selection for bulk actions
- Resend receipts to selected donations
- Pagination with configurable page size

### Live Chat

- Left sidebar lists all active donor sessions with unread counts
- Click a donor to join their chat room
- Real-time message delivery via Socket.io
- Messages marked as read on room join

### Notifications

- Compose push notification title + body
- Optional donor segment targeting:
  - **Min total donated** — only donors who gave > $X
  - **Last donation days** — only donors who gave within last N days
- Send to all users if no segment specified

## Project Structure

```
src/
├── main.tsx                   # Entry point — React root, router, toast provider
├── App.tsx                    # Routes, auth guard
├── styles/
│   └── index.css              # Tailwind directives
├── components/
│   └── layout/
│       └── Layout.tsx         # Sidebar nav + protected layout
├── pages/
│   ├── LoginPage.tsx          # Admin login form
│   ├── DashboardPage.tsx      # Analytics + live donation feed
│   ├── DonationsPage.tsx      # Donation data grid + bulk actions
│   ├── ChatPage.tsx           # Live chat with session management
│   └── NotificationsPage.tsx  # Push notification composer
├── services/
│   ├── api.ts                 # Axios client with JWT interceptor
│   └── socket.ts              # Socket.io client with auth
└── stores/
    └── authStore.ts           # Zustand auth (token + user, persisted to localStorage)
```

## API Proxy

The Vite dev server proxies API requests to the backend:

```ts
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
      '/socket.io': { target: 'http://localhost:4000', ws: true },
    },
  },
});
```

## Scripts

```bash
npm run dev       # Vite dev server on :5173
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
npm test          # Vitest
```

## Deployment

```bash
npm run build     # outputs static files to dist/
```

Deploy to:
- **Vercel**: `vercel --prod`
- **Netlify**: drag `dist/` folder or connect repo
- **Nginx**: Dockerfile included (multi-stage build → nginx serving static files)

Set `VITE_API_BASE_URL` environment variable to the production API URL.
