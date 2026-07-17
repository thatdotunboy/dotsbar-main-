# 🍺 DotsBar — The Virtual Sports Bar

> Watch live matches, chat with global fans, and tip creators with virtual drinks — the premium sports bar experience, anywhere.

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![Node.js](https://img.shields.io/badge/Node.js-Express-green)](https://expressjs.com)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20(PostgreSQL)-3ECF8E)](https://supabase.com)
[![LiveKit](https://img.shields.io/badge/WebRTC-LiveKit-blue)](https://livekit.io)
[![Stripe](https://img.shields.io/badge/Payments-Stripe-6772E5)](https://stripe.com)

---

## ✨ Features

| Feature | Status |
|---|---|
| 🔐 JWT Authentication (register/login) | ✅ |
| 📺 WebRTC Live Streaming via LiveKit | ✅ |
| 💬 Real-time Chat via Socket.io | ✅ |
| 🍺 Virtual Drink Tipping (tokens) | ✅ |
| 🏆 Live Tip Leaderboard | ✅ |
| 💳 Token Purchases via Stripe Checkout | ✅ |
| 🔒 Supabase Row-Level Security | ✅ |
| 📱 Responsive Dark-mode UI | ✅ |

---

## 🗂 Project Structure

```
dotsbar/
├── backend/                     # Node.js / Express API
│   ├── server.js                # Clean entry point
│   └── src/
│       ├── config/
│       │   ├── supabase.js      # Supabase client
│       │   ├── stripe.js        # Stripe SDK
│       │   └── schema.sql       ⭐ Run this in Supabase first!
│       ├── controllers/         # Business logic (MVC)
│       ├── routes/              # Route definitions
│       ├── middleware/
│       │   └── auth.js          # JWT verification
│       └── sockets/
│           └── socketHandler.js # Socket.io real-time logic
│
└── client/                      # Next.js 15 App
    └── src/app/
        ├── page.tsx             # Landing page
        ├── login/page.tsx       # Login
        ├── register/page.tsx    # Registration
        ├── rooms/page.tsx       # Room lobby
        ├── room/[id]/page.tsx   # Live stream room
        └── profile/page.tsx     # User dashboard + token shop
```

---

## 🚀 Setup Guide

### 1. Database (Supabase)

1. Go to [supabase.com](https://supabase.com) → create a free project
2. Open **SQL Editor** → **New Query**
3. Paste the entire contents of `backend/src/config/schema.sql` and click **Run**
4. Go to **Project Settings → API** and copy:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Stripe (Payments)

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com) → Test Mode
2. **API Keys** → copy your **Secret key** → `STRIPE_SECRET_KEY`
3. For webhooks locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
4. Copy the webhook signing secret → `STRIPE_WEBHOOK_SECRET`

### 3. LiveKit (WebRTC Streaming)

1. Go to [cloud.livekit.io](https://cloud.livekit.io) → create a free project
2. Copy **API Key** → `LIVEKIT_API_KEY`
3. Copy **API Secret** → `LIVEKIT_API_SECRET`
4. Copy **WebSocket URL** (e.g. `wss://yourproject.livekit.cloud`) → `NEXT_PUBLIC_LIVEKIT_URL`

---

## ⚙️ Environment Variables

### Backend — `backend/.env`
```env
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=some-long-random-string
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

### Frontend — `client/.env.local`
```env
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## 🏃 Running Locally

```bash
# Terminal 1 — Backend
cd backend
npm install
node server.js

# Terminal 2 — Frontend
cd client
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) for the frontend.
Backend API runs on [http://localhost:3000](http://localhost:3000).

---

## 🔑 User Roles

| Role | Can do |
|---|---|
| **Viewer** | Browse rooms, chat, tip drinks, buy tokens |
| **Creator** | Everything above + host watch parties + receive tips |

---

## 🔒 Security

- Passwords hashed with `bcrypt`
- JWTs expire after 7 days
- Stripe webhook signature verified server-side
- LiveKit tokens are short-lived and scoped per room
- Supabase Row Level Security (RLS) enabled on all tables
- Helmet.js middleware for HTTP security headers
- Rate limiting on all `/api` routes
