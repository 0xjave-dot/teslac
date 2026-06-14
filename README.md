# Tesla Stock Investment

A live demo trading platform built with React, TypeScript, Firebase, and Finnhub.

## Project Overview

Tesla Stock Investment is a full-featured demo trading application that allows users to practice buying and selling stocks and crypto using real market prices — with zero financial risk. It features real-time Firestore price updates, an admin approval workflow for deposits/withdrawals, a live portfolio tracker, and a price polling Express server.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router v6, Recharts, Lucide Icons
- **Backend**: Firebase Auth, Cloud Firestore, Firebase Storage
- **Price Polling**: Node.js + Express + node-cron + Finnhub API
- **Real-time**: Firestore `onSnapshot` listeners throughout

## Prerequisites

- Node.js 18+
- A Firebase project (free tier is fine)
- Finnhub free tier API key from [finnhub.io](https://finnhub.io)

---

## Setup: Firebase

1. Go to [Firebase Console](https://console.firebase.google.com) → Create or open a project
2. **Authentication** → Sign-in method → Enable **Email/Password** and **Google**
3. **Firestore** → Create database → Start in **production mode**
4. **Storage** → Get started (for avatar uploads)
5. **Project Settings** → Service accounts → Generate new private key → save as `service-account.json` in project root (**never commit this file!**)
6. Deploy Firestore rules: `firebase deploy --only firestore:rules`

---

## Setup: Environment Variables

```bash
cp .env.example .env
```

Fill in your `.env` file:

```env
# Firebase Client Config (Firebase Console → Project Settings → Your Apps)
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Finnhub API Key
FINNHUB_API_KEY=your_finnhub_key

# Firebase project ID (for Admin SDK)
FIREBASE_PROJECT_ID=your-project-id
```

> **Note:** The Firebase config is already pre-populated in `firebase.ts` for the included project. Update it with your own project details.

---

## Install & Run Frontend

```bash
npm install
npm run dev
```

Runs on http://localhost:5173

---

## Run Price Polling Server

In a separate terminal:

```bash
npm run server
```

Runs on port 3001. Requires `service-account.json` in project root. Updates Firestore asset prices every 10 seconds.

---

## Seed Assets

Run once after Firebase setup to create the 9 asset documents in Firestore:

```bash
npm run seed:assets
```

---

## Seed Admin User

1. Go to Firebase Console → Authentication → Add user manually:
   - **Email:** `admin@teslastockinvestment.com`
   - **Password:** `Admin@1234`
2. Copy the UID from the user list
3. Run:
   ```bash
   npm run seed:admin <uid>
   ```

---

## Admin Credentials

- **Email:** `admin@teslastockinvestment.com`
- **Password:** `Admin@1234`

The admin panel is accessible at `/admin` after login.

---

## Fonts

Place the following font files in the project root if you want them served from `/`:
- `tt-norms-pro-regular.woff2`
- `tt-norms-pro-semibold.woff2`

Licensed from [TypeType](https://typetype.org/fonts/tt-norms-pro/). The app falls back to `system-ui` if the fonts are not present.

---

## Project Structure

```
tesla-invest/
├── AdminDashboard.tsx
├── AdminLayout.tsx
├── AdminSidebar.tsx
├── AdminTransactions.tsx
├── AdminUserDetail.tsx
├── AdminUsers.tsx
├── App.tsx
├── AssetTypeBadge.tsx
├── AuthContext.tsx
├── cryptoDeposits.ts
├── Dashboard.tsx
├── DashboardLayout.tsx
├── EmptyState.tsx
├── firebase.ts
├── firestore.ts
├── index.css
├── index.html
├── index.ts
├── Landing.tsx
├── Login.tsx
├── Logo.tsx
├── main.tsx
├── MarketDetail.tsx
├── Markets.tsx
├── NotificationContext.tsx
├── NotificationPanel.tsx
├── NotificationToast.tsx
├── package.json
├── Portfolio.tsx
├── postcss.config.js
├── PriceChange.tsx
├── Profile.tsx
├── README.md
├── Register.tsx
├── seedAdmin.ts
├── seedAssets.ts
├── server.ts
├── Sidebar.tsx
├── Spinner.tsx
├── StatusBadge.tsx
├── tailwind.config.ts
├── Toast.tsx
├── Topbar.tsx
├── tsconfig.json
├── tsconfig.server.json
├── useAssets.ts
├── useBalance.ts
├── useHoldings.ts
├── usePendingCount.ts
├── useScrollReveal.ts
├── useTransactions.ts
├── vite.config.ts
├── Wallet.tsx
└── firestore.rules
```

---

## Feature Notes

- All balance mutations use Firestore `runTransaction` for atomicity
- Real-time UI via `onSnapshot` throughout — no polling on the client
- Price server polls every 10 seconds via `node-cron`
- Finnhub failures are handled gracefully — cached prices are served
- Orders are atomic: balance deducted and holdings updated in one transaction
- Admin approval of deposits atomically updates both the transaction and the user's balance
- Withdrawal requests lock funds immediately; approval/rejection restores or finalizes them
