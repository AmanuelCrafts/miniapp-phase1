# 💎 BIRRLY

**Simple. Addictive. Premium. Gamified.**

BIRRLY is a gamified rewards platform built as a **Telegram Mini App** — Duolingo-inspired streaks and daily goals, wrapped in a minimal, premium product design. This repository is the foundation phase: secure Telegram authentication, sessions, VIP plan configuration, and the full mobile-first UI shell.

> ⚠️ **Product honesty note:** BIRRLY's current build implements **no payments, balances, income, or withdrawals**. VIP plans are display/configuration data. No fake financial values are ever fabricated in the UI. Any real-money deployment requires legal, financial/regulatory, and payment-compliance review, plus transparent terms, privacy policy, and user disclosures.

---

## ✨ Stack

| Layer      | Technology                                    |
| ---------- | --------------------------------------------- |
| Framework  | Next.js (App Router) + React + TypeScript     |
| Styling    | Tailwind CSS (custom dark-violet design system) |
| Database   | MongoDB + Mongoose (cached connection)        |
| Validation | Zod                                           |
| Telegram   | Official WebApp SDK (`telegram-web-app.js`)   |
| Auth       | Telegram HMAC initData verification + HTTP-only cookie sessions |

```
Telegram  →  Next.js (Route Handlers / Server Services)  →  Mongoose  →  MongoDB
```

## 📋 Prerequisites

- **Node.js ≥ 20**
- **MongoDB** — local instance or a hosted cluster (e.g. MongoDB Atlas)
- A **Telegram bot** (see setup below)

## 🤖 Telegram bot setup

1. Message [@BotFather](https://t.me/BotFather) → `/newbot` → follow the prompts.
2. Copy the **bot token** — it goes into `TELEGRAM_BOT_TOKEN` (server-side only).
3. BotFather → `/newapp` (or *Bot Settings → Menu Button*) and point it at your deployed app URL to launch the Mini App.
4. **Never** expose the bot token via `NEXT_PUBLIC_*` variables. The token only exists on the server, where initData is verified.

## 🚀 Installation

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
#    then fill in the values (see table below)

# 3. Start MongoDB (local example)
mongod --dbpath /path/to/data

# 4. Seed the 8 VIP plans (idempotent — safe to run repeatedly)
npm run seed:vip

# 5. Develop
npm run dev            # http://localhost:3000
```

## 🔐 Environment variables

| Variable                | Required | Description                                                        |
| ----------------------- | -------- | ------------------------------------------------------------------ |
| `MONGODB_URI`           | ✅       | MongoDB connection string (e.g. `mongodb://localhost:27017/birrly`) |
| `TELEGRAM_BOT_TOKEN`    | ✅       | Bot token from @BotFather — **server-side only**                    |
| `SESSION_SECRET`        | ✅       | Random 32+ char secret used to pepper session-token hashes          |
| `TELEGRAM_AUTH_MAX_AGE` | –        | Max age (seconds) of initData `auth_date` (default `86400`)         |
| `SESSION_MAX_AGE`       | –        | Session lifetime in seconds (default `604800` = 7 days)             |
| `AUTH_RATE_LIMIT`       | –        | Auth attempts per IP per minute (default `10`)                      |

Generate a strong secret: `openssl rand -hex 32`

## 🧪 Scripts

| Script               | Purpose                                  |
| -------------------- | ---------------------------------------- |
| `npm run dev`        | Start the dev server                     |
| `npm run build`      | Production build                         |
| `npm run start`      | Run the production build                 |
| `npm run lint`       | ESLint (Next.js core-web-vitals + TS)    |
| `npm run typecheck`  | `tsc --noEmit`                           |
| `npm run seed:vip`   | Idempotent VIP 1–8 seed                  |

## 🧭 App map

| Route          | Screen                                                        |
| -------------- | ------------------------------------------------------------- |
| `/`            | **Home** — current VIP, balance (coming soon), streak, daily tasks, plans teaser |
| `/earn`        | **Earn** — future task engine (coming soon, no fake rewards)  |
| `/wallet`      | **Wallet** — future ledger wallet (coming soon)               |
| `/plans`       | **Plans** — all 8 VIP plans with current-plan badge           |
| `/profile`     | **Profile** — Telegram identity, status, logout               |

### API

| Endpoint                 | Auth | Description                              |
| ------------------------ | ---- | ---------------------------------------- |
| `POST /api/auth/telegram` | –    | Verify initData → session cookie (rate-limited) |
| `GET  /api/auth/me`       | ✅   | Current sanitized user                    |
| `POST /api/auth/logout`   | ✅   | Invalidate session + clear cookie         |
| `GET  /api/vip/plans`     | –    | Active VIP plans sorted by level          |
| `GET  /api/vip/current`   | ✅   | `{ hasVip, vip }` for the session user    |
| `GET  /api/health`        | –    | Real MongoDB connectivity ping            |

## 🔒 Security notes

- **Telegram verification** — official HMAC-SHA256 algorithm server-side: sorted data-check-string, `WebAppData`-derived secret, timing-safe comparison, `auth_date` freshness window.
- **Sessions** — 32-byte random tokens; only the SHA-256 hash (peppered with `SESSION_SECRET`) is stored in MongoDB. The raw token lives exclusively in an **HTTP-only** `SameSite=Lax` cookie (Secure in production). Expired sessions are rejected on use and cleaned by a TTL index.
- **Never trusted from the client** — identity, balance, VIP, rewards, task completion, streaks, withdrawal amounts, permissions. All server-side.
- **Rate limiting** — `POST /api/auth/telegram` is limited per IP (default 10/min). The limiter is isolated behind a small interface and is **not** production-grade for horizontally scaled deployments — swap it for Redis or another shared store.
- **Error handling** — stack traces, Mongo errors, and secrets never reach the client; UI errors stay friendly.
- **New users get no VIP** — `currentVipPlan` starts `null`, and there is no endpoint that lets the client assign itself a VIP level.

## 🏗️ Production considerations

- Deploy behind HTTPS (secure cookies require it) and set a strong `SESSION_SECRET`.
- Replace the in-memory rate limiter with Redis for multi-instance deployments.
- Use a managed MongoDB (replica set) and ensure indexes exist (run `npm run seed:vip` once per environment; Mongoose also applies model indexes).
- Future financial phases must be **ledger-based** (every movement = an auditable `Transaction` document) with server-side calculations, idempotency keys, and fraud checks before any real money flows.

## 🗺️ Roadmap (later phases)

Daily tasks & streak engine → achievements → wallet ledger → deposits/payment integration → rewards/income → withdrawals → referrals & leaderboard → admin tooling → hardening & scale.
