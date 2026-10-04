/**
 * Session lifecycle: creation, cookie binding, resolution and invalidation.
 *
 * Cookie layout:  `<token>.<signature>`
 *   - `token`      256 bits of CSPRNG entropy, opaque to the client.
 *   - `signature`  HMAC-SHA256(token, SESSION_SECRET), base64url. Proves the
 *                  cookie was issued by this server and was not edited.
 *
 * MongoDB only ever stores `sha256(token)`, so a database dump cannot be
 * replayed as a session cookie.
 */
import type { CookieOptions, Request, Response } from 'express';
import type { Types } from 'mongoose';

import { env } from '../config/env.js';
import { SessionModel } from '../models/Session.js';
import { randomToken, sha256, signValue, timingSafeEqualString, verifySignedValue } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import type { UserDocument } from '../models/User.js';

/** Only refresh `lastSeenAt` at most this often to avoid a write per request. */
const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;

export interface IssuedSession {
  token: string;
  cookieValue: string;
  expiresAt: Date;
}

export interface CreateSessionInput {
  userId: Types.ObjectId;
  userAgent?: string | undefined;
  ip?: string | undefined;
}

export interface ResolvedSession {
  sessionId: string;
  user: UserDocument;
}

function cookieBaseOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.sessionCookieSameSite,
    path: '/',
    // No `domain`: restrict the cookie to the exact API host (host-only cookie),
    // which is the safest default for an API that only serves its own origin.
  };
}

/** Creates a session record and returns the signed cookie value for it. */
export async function createSession(input: CreateSessionInput): Promise<IssuedSession> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + env.sessionTtlMs);

  await SessionModel.create({
    userId: input.userId,
    tokenHash: sha256(token),
    userAgent: input.userAgent ?? null,
    ipHash: input.ip ? sha256(input.ip) : null,
    lastSeenAt: new Date(),
    expiresAt,
    revokedAt: null,
  });

  return {
    token,
    cookieValue: `${token}.${signValue(token, env.sessionSecret)}`,
    expiresAt,
  };
}

export function setSessionCookie(res: Response, session: IssuedSession): void {
  res.cookie(
    env.sessionCookieName,
    session.cookieValue,
    {
      ...cookieBaseOptions(),
      expires: session.expiresAt,
      maxAge: env.sessionTtlMs,
    },
  );
}

/** Removes the session cookie using the exact same attributes used to set it. */
export function clearSessionCookie(res: Response): void {
  res.clearCookie(env.sessionCookieName, cookieBaseOptions());
}

/**
 * Resolves a raw cookie value into a live session + user.
 *
 * Returns `null` for every failure mode (absent, malformed, tampered, expired,
 * revoked, deleted user) so callers cannot accidentally distinguish them and
 * accidentally leak information through different responses.
 */
export async function resolveSession(rawCookieValue: string | undefined): Promise<ResolvedSession | null> {
  if (!rawCookieValue) return null;

  const separatorIndex = rawCookieValue.lastIndexOf('.');
  if (separatorIndex <= 0) return null;

  const token = rawCookieValue.slice(0, separatorIndex);
  const signature = rawCookieValue.slice(separatorIndex + 1);
  if (!token || !signature) return null;

  // Reject anything that was not signed by this server, in constant time.
  if (!verifySignedValue(token, signature, env.sessionSecret)) return null;

  const session = await SessionModel.findOne({
    tokenHash: sha256(token),
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .select('+tokenHash')
    .populate<{ userId: UserDocument }>('userId')
    .lean()
    .exec();

  // `populate` replaces the raw userId with the user document. A missing user
  // means the account was deleted, so the session is unusable.
  const user = session?.userId;
  if (!session || !user || typeof user === 'string') return null;

  touchSession(session._id).catch((error: unknown) => {
    logger.debug('Failed to update session lastSeenAt', {
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  });

  return { sessionId: session._id.toString(), user };
}

async function touchSession(sessionId: Types.ObjectId): Promise<void> {
  const threshold = new Date(Date.now() - LAST_SEEN_THROTTLE_MS);
  await SessionModel.updateOne(
    { _id: sessionId, $or: [{ lastSeenAt: { $lt: threshold } }, { lastSeenAt: null }] },
    { $set: { lastSeenAt: new Date() } },
  ).exec();
}

/** Invalidates a single session. Safe to call with an already dead session. */
export async function destroySession(rawCookieValue: string | undefined): Promise<boolean> {
  if (!rawCookieValue) return false;

  const separatorIndex = rawCookieValue.lastIndexOf('.');
  if (separatorIndex <= 0) return false;

  const token = rawCookieValue.slice(0, separatorIndex);
  if (!verifySignedValue(token, rawCookieValue.slice(separatorIndex + 1), env.sessionSecret)) {
    return false;
  }

  const result = await SessionModel.updateOne(
    { tokenHash: sha256(token), revokedAt: null },
    { $set: { revokedAt: new Date() } },
  ).exec();

  return result.modifiedCount > 0;
}

/** Revokes every active session for a user (used by bans and "log out all"). */
export async function destroyAllSessionsForUser(userId: Types.ObjectId): Promise<number> {
  const result = await SessionModel.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  ).exec();

  return result.modifiedCount;
}

/** Removes expired and revoked rows. Optional housekeeping for cron jobs. */
export async function purgeStaleSessions(): Promise<number> {
  const result = await SessionModel.deleteMany({
    $or: [{ expiresAt: { $lte: new Date() } }, { revokedAt: { $ne: null } }],
  }).exec();

  return result.deletedCount ?? 0;
}

/**
 * Reads the session cookie from the request.
 *
 * Returns `undefined` when no session cookie is present, which is a normal
 * anonymous request rather than an error.
 */
export function readSessionCookie(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  return cookies?.[env.sessionCookieName];
}

/** Exposed for tests: validates a cookie string without touching the database. */
export function isWellSignedSessionCookie(rawCookieValue: string | undefined): boolean {
  if (!rawCookieValue) return false;
  const separatorIndex = rawCookieValue.lastIndexOf('.');
  if (separatorIndex <= 0) return false;

  return timingSafeEqualString(
    rawCookieValue.slice(separatorIndex + 1),
    signValue(rawCookieValue.slice(0, separatorIndex), env.sessionSecret),
  );
}
