/**
 * Shared test setup.
 *
 * Environment variables are assigned at module scope (not inside `beforeAll`)
 * because Vitest runs setup files before importing the test modules, and
 * `src/config/env.ts` validates `process.env` as soon as it is imported.
 *
 * This in-memory MongoDB means the suite needs no external database.
 */
import { randomBytes } from 'node:crypto';

import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll } from 'vitest';

export const TEST_BOT_TOKEN = '1234567890:AAHtest-token-for-automated-tests-only';
export const testSessionSecret = randomBytes(48).toString('hex');

// --- Environment configuration (must run before any src import) --------------
process.env['NODE_ENV'] = 'test';
process.env['TELEGRAM_BOT_TOKEN'] = TEST_BOT_TOKEN;
process.env['SESSION_SECRET'] = testSessionSecret;
process.env['FRONTEND_URL'] = 'http://localhost:3000';
process.env['PORT'] = '4000';
process.env['AUTH_RATE_LIMIT'] = '10';
process.env['AUTH_RATE_LIMIT_WINDOW_MS'] = '60000';
process.env['TRUST_PROXY_HOPS'] = '0';
process.env['LOG_LEVEL'] = process.env['LOG_LEVEL'] ?? 'silent';

// Placeholder so `src/config/env.ts` can be imported before the real URI is
// known; it is replaced as soon as the in-memory server is up.
process.env['MONGODB_URI'] ??= 'mongodb://127.0.0.1:27017/telegram_rewards_test_pending';

// --- In-memory database -----------------------------------------------------
let mongoServer: MongoMemoryServer | undefined;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env['MONGODB_URI'] = mongoServer.getUri('telegram_rewards_test');
}, 300_000);

afterAll(async () => {
  await mongoServer?.stop();
});
