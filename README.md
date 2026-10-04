# Telegram Rewards Mini App — Phase 1
Private project. All rights reserved.

│   │   │   ├── auth-flow.test.ts             # End-to-end auth: signup, /me, logout, protected routes
│   │   │   ├── security.test.ts              # Validation, rate limiting, CORS, errors, secret containment
│   │   │   ├── telegram-verification.test.ts # initData HMAC, expiry, tampering, Ed25519
│   │   │   ├── user-model.test.ts            # Schema constraints, indexes, DTO mapping
│   │   │   ├── boot.test.ts                  # Spawns the real entry point (dev + compiled)
│   │   │   ├── config.test.ts                # Environment validation and production secret guards
│   │   │   ├── setup.ts                      # Test env + in-memory MongoDB
│   │   │   └── helpers/                      # initData signer and app factory
Private project. All rights reserved.
# Telegram Rewards Mini App — Phase 1

**Secure Telegram authentication + user system** for a mobile-first, gamified rewards platform running as a Telegram Mini App.

This repository contains **Phase 1 only**: Telegram authentication, user creation, sessions, profile data and secure frontend/backend communication. Financial and gamification features are intentionally **not** implemented yet.

---

## Table of contents

1. [Project overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Tech stack](#3-tech-stack)
4. [Requirements](#4-requirements)
5. [Repository structure](#5-repository-structure)
6. [Environment variables](#6-environment-variables)
7. [MongoDB setup](#7-mongodb-setup)
8. [Telegram bot setup](#8-telegram-bot-setup)
9. [Installing dependencies](#9-installing-dependencies)
10. [Running the app](#10-running-the-app)
11. [Production build](#11-production-build)
12. [Authentication flow](#12-authentication-flow)
13. [Security architecture](#13-security-architecture)
14. [API endpoints](#14-api-endpoints)
15. [Session design decision](#15-session-design-decision)
16. [Telegram UI](#16-telegram-ui)
17. [Testing](#17-testing)
18. [Database indexes](#18-database-indexes)
19. [Troubleshooting](#19-troubleshooting)
20. [Phase 2 (not implemented)](#20-phase-2-not-implemented)

---

## 1. Project overview

The app is a Telegram Mini App. A user opens it from a Telegram chat, the Mini App authenticates them using Telegram's signed `initData`, and the backend provisions a user account plus a secure session.

Phase 1 delivers a complete, production-shaped authentication system:

- Server-side verification of Telegram `initData` with **timing-safe HMAC comparison**.
- Optional **Ed25519** verification of Telegram's newer `signature` field.
- Automatic user provisioning keyed on a **unique** `telegramId`.
- Database-backed sessions delivered via **HTTP-only cookies**.
- Zod validation, rate limiting, restricted CORS and centralized error handling.
- A polished Telegram-native frontend that blocks rendering until auth resolves.

> **Not in this phase:** VIP plans, deposits, balance, daily income, rewards, wallet, transactions, withdrawals, tasks, streaks, referrals, ads, achievements, admin panel.

---

## 2. Architecture

```
┌──────────────────────┐
│  Telegram client     │  signs initData with the bot token
└──────────┬───────────┘
           │ initData (untrusted until verified)
           ▼
┌──────────────────────────────────────────────┐
│  Next.js (client/)                           │
│  - Telegram WebApp SDK init                  │
│  - AuthProvider state machine                │
│  - HTTP-only cookie, no token in JS storage  │
└──────────┬───────────────────────────────────┘
           │ POST /api/auth/telegram  { initData }
           │ credentials: 'include'
           ▼
┌──────────────────────────────────────────────┐
│  Express API (server/src)                    │
│  routes → controllers → services → models    │
│  - Zod validation                            │
│  - Rate limiting                             │
│  - CORS allowlist                            │
│  - initData HMAC + Ed25519 verification      │
│  - Session create / resolve / destroy        │
└──────────┬───────────────────────────────────┘
           │ Mongoose
           ▼
┌──────────────────────┐
│  MongoDB             │
│  users / sessions    │
└──────────────────────┘
```

Layering is strict: **routes → controllers → services → models**. Business and security logic never lives in a route file.

---

## 3. Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Backend | Node.js, Express 5, TypeScript (ESM) |
| Database | MongoDB, Mongoose 9 |
| Telegram | Telegram Mini Apps, WebApp SDK |
| Validation | Zod 4 (request validation + response parsing) |
| Auth | Server-side `initData` verification, HTTP-only session cookies |
| Security | helmet, cors allowlist, express-rate-limit, timing-safe crypto |
| Tests | Vitest + supertest + mongodb-memory-server |

**Explicitly not used:** Vite, Fastify, PostgreSQL, Prisma, Firebase. The backend is a standalone Express service, not Next.js API routes.

---

## 4. Requirements

- **Node.js 20.11+** (tested on Node 24)
- **npm 10+**
- **MongoDB 6+** running locally, or a MongoDB Atlas connection string
- A **Telegram bot token** from [@BotFather](https://t.me/botfather)
- A **public HTTPS URL** for the Mini App in production (Telegram requires HTTPS outside of `web.telegram.org`)
- The **Telegram app** on a phone, or Telegram Desktop, to actually exercise Mini App authentication

---

## 5. Repository structure

```
project/
├── client/
│   ├── app/
│   │   ├── globals.css            # Tailwind + Telegram theme bridge
│   │   ├── layout.tsx             # Loads the Telegram WebApp SDK
│   │   └── page.tsx               # Entry screen, gated by AuthProvider
│   ├── components/
│   │   ├── auth/                  # Gate + loading / error / outside-Telegram
│   │   ├── home/                  # Profile card, avatar, logout
│   │   └── ui/                    # Button, Card, Spinner
│   ├── hooks/
│   │   ├── useAuth.tsx            # AuthProvider + state machine
│   │   ├── useHaptics.ts
│   │   └── useTelegram.ts
│   ├── lib/
│   │   ├── api.ts                 # Typed API client (credentials: include)
│   │   ├── config.ts              # NEXT_PUBLIC_API_URL validation
│   │   ├── telegram.ts            # WebApp SDK wrapper, never fakes data
│   │   └── cn.ts
│   ├── services/
│   │   └── auth.service.ts
│   ├── types/
│   │   ├── api.ts                 # Zod response schemas
│   │   └── telegram.d.ts          # Hand written SDK typings
│   ├── public/
│   ├── .env.example
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts        # MongoDB connection, memoised
│   │   │   └── env.ts             # Zod-validated environment
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   └── health.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts # requireAuth / optionalAuth
│   │   │   ├── error.middleware.ts
│   │   │   ├── rateLimit.ts
│   │   │   └── validate.ts        # Zod request validation
│   │   ├── models/
│   │   │   ├── Session.ts
│   │   │   └── User.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── index.ts
│   │   │   └── protected.routes.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── session.service.ts
│   │   │   ├── telegram.service.ts  # initData verification
│   │   │   └── user.service.ts
│   │   ├── types/
│   │   ├── utils/                 # AppError, crypto, dto, logger, schemas
│   │   ├── app.ts                 # Express app factory
│   │   └── server.ts              # Bootstrap
│   ├── tests/
│   │   ├── auth-flow.test.ts              # End-to-end auth + session lifecycle
│   │   ├── security.test.ts               # Tampering, expiry, replay, leakage
│   │   ├── telegram-verification.test.ts  # initData HMAC / Ed25519 matrix
│   │   ├── user-model.test.ts             # Model constraints and indexes
│   │   ├── boot.test.ts                   # Spawns real servers (boot regression)
│   │   ├── config.test.ts                 # Env validation, production guards
│   │   ├── setup.ts                       # Vitest setup, in-memory MongoDB
│   │   └── helpers/
│   │       ├── app.ts                     # Supertest app harness
│   │       └── initData.ts                # Signed / tampered initData builders
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   └── vitest.config.ts
│
├── .gitignore
├── .editorconfig
├── .nvmrc
├── package.json                    # npm workspaces root
└── README.md
```

---

## 6. Environment variables

### `server/.env`

Copy `server/.env.example` to `server/.env`:

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | no | `development` | `development` \| `test` \| `production` |
| `PORT` | no | `4000` | API port |
| `MONGODB_URI` | **yes** | — | MongoDB connection string |
| `TELEGRAM_BOT_TOKEN` | **yes** | — | Bot token from @BotFather. **Server only** |
| `SESSION_SECRET` | **yes** | — | ≥32 chars. Signs session cookies |
| `SESSION_TTL_DAYS` | no | `30` | Session lifetime |
| `SESSION_COOKIE_NAME` | no | `tgma_session` | Cookie name |
| `SESSION_COOKIE_SAME_SITE` | no | `none` (prod) / `lax` (dev) | `lax` \| `strict` \| `none` |
| `FRONTEND_URL` | **yes** | — | Comma separated origin allowlist |
| `AUTH_RATE_LIMIT` | no | `10` | Auth attempts per window |
| `AUTH_RATE_LIMIT_WINDOW_MS` | no | `60000` | Rate limit window |
| `TELEGRAM_AUTH_MAX_AGE_SECONDS` | no | `86400` | Max accepted `auth_date` age |
| `TELEGRAM_ED25519_PUBLIC_KEY` | no | derived from token | base64url 32-byte key |
| `TRUST_PROXY_HOPS` | no | `1` | Reverse proxy hops for correct client IPs |
| `LOG_LEVEL` | no | `info` | `debug` \| `info` \| `warn` \| `error` \| `silent` |

### `client/.env.local`

Copy `client/.env.example` to `client/.env.local`:

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | API origin, e.g. `https://api.example.com` |

**Only `NEXT_PUBLIC_*` variables reach the browser bundle, and only public configuration may use that prefix.** The bot token, session secret and database URI are never referenced in `client/`.

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 7. MongoDB setup

### Local

```bash
docker run -d --name mongo -p 27017:27017 -v mongo-data:/data/db mongo:7
```

Or install MongoDB Community and run `mongod`.

### Atlas

1. Create a free cluster.
2. **Network Access** → allow your IP (or `0.0.0.0/0` for development only).
3. **Database Access** → create a user with a strong password.
4. Copy the SRV string into `MONGODB_URI`.

### Verify

```bash
# Start the API; it fails fast if it cannot connect
npm run dev:server
curl http://localhost:4000/api/health
```

```json
{ "status": "ok", "database": "connected", "environment": "development" }
```

Indexes are created automatically outside production. In production, build them explicitly once:

```bash
npm run build --workspace server
node -e "import('./server/dist/config/database.js').then(async m => { await m.connectDatabase(); const { UserModel } = await import('./server/dist/models/User.js'); console.log(await UserModel.syncIndexes()); process.exit(0); })"
```

---

## 8. Telegram bot setup

1. Open [@BotFather](https://t.me/botfather) → `/newbot` → copy the token.
2. Put it in `server/.env` as `TELEGRAM_BOT_TOKEN`.
3. Configure the Mini App:
   ```bash
   /newapp
   ```
   - **Title:** your app name
   - **URL:** `https://your-domain.example` (the Next.js app)
   - **Icon:** 640×640 PNG
4. Point `NEXT_PUBLIC_API_URL` at your API and add that origin to `FRONTEND_URL`.
5. Open the bot in Telegram and launch the Mini App.

For local development, use an HTTPS tunnel (for example `cloudflared tunnel --url http://localhost:3000` or `ngrok http 3000`) because Telegram requires HTTPS for Mini Apps.

**Never commit the bot token.** It is not present in any `client/` file, is never prefixed with `NEXT_PUBLIC_`, and is never included in an API response (verified by tests).

---

## 9. Installing dependencies

The repo uses **npm workspaces**, so one install covers both packages:

```bash
npm install
```

---

## 10. Running the app

### Both services together

```bash
npm run dev
```

- Frontend: http://localhost:3000
- API: http://localhost:4000

### Separately

```bash
npm run dev:server     # tsx watch, restarts on change
npm run dev:client     # Next.js dev server
```

### First-time setup

```bash
# 1. Install
npm install

# 2. Configure the backend
cp server/.env.example server/.env      # Windows: copy server\.env.example server\.env
#    then edit MONGODB_URI and TELEGRAM_BOT_TOKEN

# 3. Configure the frontend
cp client/.env.example client/.env.local

# 4. Run both
npm run dev
```

### Verifying authentication

Authentication only succeeds inside a real Telegram client. Opening the app in a normal browser deliberately shows **"Open in Telegram"** rather than fabricating a user.

To test end to end, open the bot in Telegram (phone app or Telegram Desktop) with your HTTPS tunnel URL configured as the Mini App URL.

---

## 11. Production build

```bash
# Compile both workspaces
npm run build

# Type-check with zero errors
npm run typecheck

# Run tests
npm test
```

Start the compiled output:

```bash
npm start:server        # node server/dist/server.js
npm start:client        # next start
```

Production requirements:

- `NODE_ENV=production`
- Real `SESSION_SECRET` (≥32 chars) and `TELEGRAM_BOT_TOKEN`
- `SESSION_COOKIE_SAME_SITE=none` with HTTPS on both frontend and API, so the cross-site cookie is sent from the Telegram WebView
- `FRONTEND_URL` listing only your real frontend origin
- Reverse proxy configured so `TRUST_PROXY_HOPS` matches reality (needed for correct rate limiting)

The server refuses to boot in production while the placeholder secrets from `.env.example` are still in place.

---

## 12. Authentication flow

```
User opens the Mini App in Telegram
        ↓
Telegram WebApp SDK initialises (ready(), expand())
        ↓
Next.js reads window.Telegram.WebApp.initData
        ↓
POST /api/auth/telegram { initData }        (cookie sent with credentials: 'include')
        ↓
Zod validates the body
        ↓
Backend recomputes the HMAC chain and compares in constant time
        ↓
Backend checks auth_date freshness (default 24h)
        ↓
Backend verifies the optional Ed25519 signature
        ↓
User is found by verified telegramId, or created (unique index)
        ↓
Session row created; only sha256(token) is stored
        ↓
Set-Cookie: tgma_session=<token>.<hmac signature>; HttpOnly
        ↓
Client calls GET /api/auth/me with the cookie
        ↓
requireAuth resolves session → user → renders Home
```

Every failure path is explicit: invalid, tampered or expired `initData` yields **401**, a malformed body yields **400**, and a suspended account yields **403** with no session issued.

---

## 13. Security architecture

| # | Requirement | Implementation |
| --- | --- | --- |
| 1 | Server-side `initData` verification | `services/telegram.service.ts` recomputes the HMAC chain from the bot token |
| 2 | Timing-safe HMAC comparison | `crypto.timingSafeEqual` via `timingSafeEqualString`, with a constant-time path for length mismatches |
| 3 | HTTP-only cookies | `httpOnly: true`, no readable auth cookie is ever issued |
| 4 | Secure cookies in production | `secure: env.cookieSecure`, enabled whenever `NODE_ENV=production` |
| 5 | Correct SameSite | `none` in production (Telegram WebView is a third-party context), `lax` on http in dev |
| 6 | Rate limiting | `express-rate-limit` on `/api/auth/telegram`, configurable, counts failures only |
| 7 | Zod validation | Strict body schemas; the API rejects unknown properties |
| 8 | Restricted CORS | Exact-origin allowlist from `FRONTEND_URL`, credentials enabled, `*` never used |
| 9 | Centralized errors | `errorHandler` normalises every failure into `{ error: { code, message } }` |
| 10 | No secrets in source | Only `.env.example` is committed; `.gitignore` excludes `.env*` |
| 11 | No secrets in frontend env | `NEXT_PUBLIC_API_URL` is the only client variable |
| 12 | No bot token in frontend | Token referenced only in `server/src` |
| 13 | No token in responses | Responses are built from explicit DTOs; asserted by tests |
| 14 | Unique `telegramId` | Unique index, plus an E11000 race recovery path |
| 15 | Auth middleware | `requireAuth` resolves identity from the server-side session only |
| 16 | Malformed request protection | 16 KB body cap, JSON parse errors mapped to 400, typed schemas |
| 17 | Expiry / tampering rejection | `auth_date` freshness window, HMAC check, Ed25519 check |

Additional hardening:

- **Bot token is server-only.** It is used as HMAC material and never returned, logged, or placed in a client bundle.
- **Session tokens are hashed at rest.** MongoDB stores `sha256(token)`; a database dump cannot be replayed as a cookie.
- **Cookies are host-only** (no `Domain` attribute), so they are scoped to the exact API host.
- **Suspended users are blocked at both gates**: no session is created at login, and existing sessions get 403.
- **`trust proxy` is configurable** so rate limiting keys on real client IPs behind a load balancer.
- **Stack traces never reach clients** in production; unexpected errors return a generic 500.

### Threat notes

- A stolen `initData` is only usable until its `auth_date` expires (24h default). Session cookies have their own independent TTL.
- The frontend intentionally shows no way to run without Telegram data — no mock mode, no client-side identity override.

---

## 14. API endpoints

Base URL: `http://localhost:4000`

### `POST /api/auth/telegram`

Verifies `initData`, finds or creates the user, creates a session and sets the cookie.

**Request**

```json
{ "initData": "query_id=...&user=...&auth_date=...&hash=..." }
```

**Response `200`**

```json
{
  "user": {
    "id": "6650f1a2c3d4e5f6a7b8c9d0",
    "telegramId": "123456789",
    "username": "amanuel_dev",
    "firstName": "Amanuel",
    "lastName": "Tesfaye",
    "avatarUrl": "https://t.me/i/userpic/320/amanuel_dev.jpg",
    "status": "ACTIVE",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Errors** — `400` invalid body · `401` invalid/tampered/expired `initData` · `403` suspended account · `429` rate limited

### `GET /api/auth/me`

**Response `200`** — same `{ "user": ... }` shape.
**`401`** when unauthenticated · **`403`** when suspended.

### `POST /api/auth/logout`

Destroys the session record and clears the cookie.

**Response `200`**

```json
{ "success": true }
```

Idempotent: logging out without a session also returns `200`.

### `GET /api/health`

```json
{ "status": "ok", "database": "connected", "environment": "development", "uptimeSeconds": 12, "timestamp": "..." }
```

### `GET /api/protected/ping`

Reference endpoint behind `requireAuth`, used to verify middleware rejects anonymous callers.

**Response `200`** `{ "ok": true, "userId": "...", "sessionId": "..." }` · **`401`** when unauthenticated.

### Error envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": { "issues": [{ "path": "initData", "message": "initData is required" }] }
  }
}
```

| Status | Codes |
| --- | --- |
| 400 | `BAD_REQUEST`, `VALIDATION_ERROR` |
| 401 | `UNAUTHORIZED`, `INVALID_TELEGRAM_DATA`, `EXPIRED_TELEGRAM_DATA` |
| 403 | `FORBIDDEN`, `ACCOUNT_SUSPENDED`, `CORS_ORIGIN_DENIED` |
| 404 | `NOT_FOUND` |
| 409 | `CONFLICT` |
| 413 | `PAYLOAD_TOO_LARGE` |
| 429 | `RATE_LIMITED` |
| 500 | `INTERNAL_SERVER_ERROR` |

---

## 15. Session design decision

**Chosen: database-backed sessions, with the raw token only ever living in an HTTP-only cookie.**

Cookie value: `<token>.<signature>`

- `token` — 256 bits from `crypto.randomBytes`, opaque to the client.
- `signature` — `HMAC-SHA256(token, SESSION_SECRET)`, base64url, compared in constant time. A tampered cookie is rejected before any database query.

MongoDB stores `sha256(token)`, never the token itself, plus `userId`, `expiresAt`, `revokedAt`, `lastSeenAt` and a hashed IP. A TTL index removes expired documents automatically.

Why this over a stateless signed cookie:

| Consideration | DB-backed (chosen) | Stateless signed cookie |
| --- | --- | --- |
| Instant revocation on logout / ban | Yes — delete the row | Impossible without a denylist |
| No database read per request | No | Yes |
| Session audit trail | Yes | No |
| Survives `SESSION_SECRET` rotation | Sessions survive; rotation invalidates only *unsigned* cookies | Rotation logs everyone out |
| Fits future claims (VIP, roles) | Yes — read from DB | Cookie size limits (4 KB) |

For a rewards platform that will later need bans, VIP tiers and role checks, **revocability outweighs the per-request read**. If scale ever makes that read a bottleneck, an in-process cache keyed by `tokenHash` sits in front of it without changing the contract.

Cookie attributes:

| Attribute | Value |
| --- | --- |
| `httpOnly` | `true` |
| `secure` | `true` in production |
| `sameSite` | `none` in production (Telegram WebView), `lax` in dev |
| `path` | `/` |
| `domain` | not set (host-only) |
| expiry | `SESSION_TTL_DAYS`, default 30 days |

Nothing is stored in `localStorage` or `sessionStorage`.

---

## 16. Telegram UI

- Mobile-first, tuned for ~390 px screens.
- Thumb-friendly 44–48 px touch targets.
- Rounded cards with a violet/purple gradient direction.
- Smooth, subtle transitions; `prefers-reduced-motion` respected.
- Full light/dark support through Telegram's `--tg-theme-*` CSS variables, with sensible fallbacks when running outside Telegram.
- Haptic feedback on button presses and results where supported.
- No desktop-style navigation.
- Telegram colours are applied through CSS custom properties, so switching the Telegram theme repaints the app instantly without JavaScript.

---

## 17. Testing

```bash
npm test                 # once
npm run test:watch       # watch mode
```

Vitest boots an **in-memory MongoDB** (`mongodb-memory-server`), so no external database is required. Tests cover all 14 required scenarios plus extras:

| # | Scenario | Where |
| --- | --- | --- |
| 1 | Valid `initData` succeeds | `telegram-verification.test.ts`, `auth-flow.test.ts` |
| 2 | Invalid `initData` rejected | both |
| 3 | Tampered `initData` rejected (payload rewrite + single-char edit) | `telegram-verification.test.ts` |
| 4 | Expired data rejected | both |
| 5 | New user creates exactly one `User` | `auth-flow.test.ts` |
| 6 | Existing user recognised (same id returned, profile synced) | `auth-flow.test.ts` |
| 7 | Repeated auth creates no duplicates | `auth-flow.test.ts` (sequential + 8 concurrent) |
| 8 | `/me` returns the correct user | `auth-flow.test.ts` |
| 9 | Unauthenticated `/me` returns 401 | `auth-flow.test.ts` |
| 10 | Logout invalidates the session | `auth-flow.test.ts` |
| 11 | Protected endpoints reject unauthenticated requests | `auth-flow.test.ts` |
| 12 | Rate limiting returns 429 | `security.test.ts` |
| 13 | Invalid bodies rejected (400) | `security.test.ts` |
| 14 | Bot token never returned to the frontend | `security.test.ts` |

Also covered: unique-index enforcement, index definitions, absence of financial fields, DTO shape, Ed25519 signature validation, timing-safe primitives, CORS allow/deny, error envelope consistency, no stack-trace leakage, malformed JSON, oversized payloads, cookie hardening, session-token hashing at rest, suspended-account handling, and health checks.

### Boot and configuration tests

`boot.test.ts` and `config.test.ts` spawn **real child processes** rather than importing the app in-process. They exist because of a failure mode the rest of the suite cannot see.

Vitest resolves modules through Vite, which shims CommonJS interop. An import that Node's native ESM loader cannot satisfy still type-checks and still passes every unit test, while `npm run dev` and `npm start` die on the first import. That is exactly what happened with `import { models } from 'mongoose'`: Mongoose is CommonJS and assigns `models` at runtime, so Node's static named-export detection cannot see it. The suite was fully green and the server could not boot.

| Test | Guards |
| --- | --- |
| `boot.test.ts` | `src/server.ts` loads under `tsx` (the `npm run dev` path) and actually serves `/api/health` |
| `boot.test.ts` | `dist/server.js` loads under plain Node (the `npm start` path). Skipped unless the project has been built |
| `config.test.ts` | Production refuses to start on a placeholder bot token or session secret |
| `config.test.ts` | Missing/short `MONGODB_URI` and `SESSION_SECRET` are rejected |
| `config.test.ts` | A wildcard `FRONTEND_URL` is rejected |
| `config.test.ts` | Validation errors name variables, never their values |

To cover the compiled path:

```bash
npm run build && npm test
```

### The self-consistent fixture trap

A second class of bug is invisible to any suite where the fixture generator and the implementation are written by the same hand: if both encode the same misunderstanding, they agree with each other and every test passes.

`initData secret key derivation` in `telegram-verification.test.ts` exists because of exactly that. The spec is:

```
secret_key = HMAC_SHA256(<bot_token>, "WebAppData")     <- raw 32 bytes
hash       = hex(HMAC_SHA256(data_check_string, secret_key))
```

The implementation derived `secret_key` through a helper that returns **hex**, so the second HMAC was keyed with 64 ASCII characters instead of the 32 raw bytes. The test helper signed the same wrong way. Every genuine Telegram sign-in returned `401`, while all 107 tests stayed green.

The guard is written against an inline transcription of the spec rather than against `buildInitData`, so it cannot inherit the same mistake:

| Test | Guards |
| --- | --- |
| `derives the secret key as the raw 32 byte digest` | The key is 32 raw bytes and equals the spec derivation |
| `accepts a payload hashed with the raw secret key` | A payload signed inline from the documented algorithm verifies |
| `rejects a payload hashed with the hex-encoded secret key` | The historical bug is rejected rather than accepted |
| `produces a different hash for raw versus hex secret keys` | The rejection above fails for the right reason |

The general lesson: when a test asserts a cryptographic algorithm, transcribe the specification independently. Fixtures generated by the code under test only prove the code agrees with itself.

---

## 18. Database indexes

**User**

| Index | Type | Purpose |
| --- | --- | --- |
| `{ telegramId: 1 }` (`telegramId_1`) | **unique** | One account per Telegram identity |
| `{ status: 1 }` (`status_1`) | single | Admin filtering (future) |
| `{ createdAt: -1 }` (`createdAt_desc`) | single | Newest-user listing (future) |

**Session**

| Index | Type | Purpose |
| --- | --- | --- |
| `{ tokenHash: 1 }` (`tokenHash_1`) | **unique** | Constant-time session lookup |
| `{ userId: 1 }` (`userId_1`) | single | Revoke all sessions for a user |
| `{ expiresAt: 1 }` (`expiresAt_1`) | **TTL** (`expireAfterSeconds: 0`) | Automatic cleanup of expired sessions |

`User.telegramId` is the hard guarantee against duplicate Telegram accounts. Even under concurrent first-time logins, one insert wins and the others read the existing row via E11000 recovery.

---

## 19. Troubleshooting

**"Open in Telegram" instead of the app**
The Mini App is not running inside Telegram. Telegram data is never faked. Open the bot in Telegram, or in Telegram Desktop via `web.telegram.org`.

**401 immediately after a successful login**
`initData` exceeded `TELEGRAM_AUTH_MAX_AGE_SECONDS`, or the clock is off. Restart the Mini App to get fresh data, or raise the window.

**Cookie not stored by the browser**
`SameSite=None` requires `Secure`, which requires HTTPS. In local development over `http`, use `SESSION_COOKIE_SAME_SITE=lax` or an HTTPS tunnel.

**CORS error in the console**
The request `Origin` is not in `FRONTEND_URL`. Add the exact origin, scheme included, with no trailing slash.

**429 Too many requests**
`AUTH_RATE_LIMIT` is per client IP for **failed** attempts only. Successful logins are not counted. Wait for `AUTH_RATE_LIMIT_WINDOW_MS`.

**Server exits at startup**
Configuration is invalid or MongoDB is unreachable — the error message lists the offending variables. The API deliberately refuses to run without a database.

**`NEXT_PUBLIC_API_URL is missing`**
Create `client/.env.local` from `client/.env.example`, then restart the dev server.

---

## 20. Phase 2 (not implemented)

Deliberately out of scope for Phase 1. Each belongs to a later phase with its own validation and migrations:

- ❌ VIP plans / VIP 1–8
- ❌ Deposits, payments
- ❌ Balance, daily income
- ❌ Rewards
- ❌ Wallet, transactions
- ❌ Withdrawals, withdrawal fees
- ❌ Daily tasks
- ❌ Advertisement tracking / Monetag
- ❌ Streaks
- ❌ Referrals
- ❌ Achievements
- ❌ Admin panel

The `User` model contains **no** financial fields, and a test asserts this so they cannot be introduced accidentally.

---

## License

Private project. All rights reserved.
