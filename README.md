# Birrly

Telegram Mini App — Phase 1 Foundation

## Tech Stack

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- MongoDB
- Mongoose

## Requirements

- Node.js 20+
- MongoDB

## Installation

```bash
npm install
```

## Environment

Create `.env.local` with:

```
MONGODB_URI=mongodb://localhost:27017/birrly
```

## Development

```bash
npm run dev
```

## Health Check

After starting the application:

```
GET /api/health
```

Should confirm that MongoDB is connected.
