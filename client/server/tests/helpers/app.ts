/**
 * Shared helpers for the API integration tests: database lifecycle, an app
 * instance and supertest agents that persist cookies like a browser does.
 */
import type { Application } from 'express';
import mongoose from 'mongoose';
import supertest from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';

import { createApp, type CreateAppOptions } from '../../src/app.js';
import { disconnectDatabase } from '../../src/config/database.js';

export const SESSION_COOKIE_NAME = 'tgma_session';

/**
 * Default app options for tests.
 *
 * The auth rate limiter is effectively disabled by default so that unrelated
 * tests are never throttled; the dedicated rate limiting suite builds its own
 * app with a small limit.
 */
export const defaultTestAppOptions: CreateAppOptions = {
  enableRequestLogging: false,
  authRateLimit: { max: 10_000, windowMs: 60_000 },
};

export function getApp(options: CreateAppOptions = {}): Application {
  return createApp({ ...defaultTestAppOptions, ...options });
}

/**
 * Connects and waits for the declared indexes to exist.
 *
 * Mongoose builds indexes asynchronously in the background. Without waiting,
 * a duplicate-key assertion could run before the unique `telegramId` index is
 * in place and silently pass a duplicate.
 */
export async function connectTestDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;

  const uri = process.env['MONGODB_URI'];
  if (!uri) throw new Error('MONGODB_URI is not set - tests/setup.ts must run first');

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  await ensureIndexes();
}

/** Creates every declared index up front so constraints apply immediately. */
export async function ensureIndexes(): Promise<void> {
  const { UserModel } = await import('../../src/models/User.js');
  const { SessionModel } = await import('../../src/models/Session.js');

  await Promise.all([UserModel.createIndexes(), SessionModel.createIndexes()]);
}

/** Removes all documents so each test starts from a known state. */
export async function resetDatabase(): Promise<void> {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

export async function closeTestDatabase(): Promise<void> {
  await disconnectDatabase();
}

/** Supertest agent that keeps cookies between calls. */
export function agent(options: CreateAppOptions = {}): TestAgent {
  return supertest.agent(getApp(options));
}

/** One-off request without cookie persistence. */
export function request(options: CreateAppOptions = {}) {
  return supertest(getApp(options));
}

/** Extracts the session cookie from a `set-cookie` header. */
export function extractSessionCookie(setCookieHeader: string | string[] | undefined): string {
  if (!setCookieHeader) throw new Error('Expected a Set-Cookie header');

  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  const sessionCookie = cookies.find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`));

  if (!sessionCookie) throw new Error(`No ${SESSION_COOKIE_NAME} cookie in response`);

  return sessionCookie.split(';')[0] ?? '';
}

export function countCookies(setCookieHeader: string | string[] | undefined): number {
  if (!setCookieHeader) return 0;
  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  return cookies.filter((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`)).length;
}
