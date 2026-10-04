/**
 * Authentication orchestration.
 *
 * Controllers stay thin: they validate input, call a service, and shape the
 * HTTP response. All security decisions live here or in the modules it calls.
 */
import { Types } from 'mongoose';

import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { toPublicUser } from '../utils/dto.js';
import { logger } from '../utils/logger.js';
import {
  createSession,
  destroyAllSessionsForUser,
  destroySession,
  setSessionCookie,
  type IssuedSession,
} from './session.service.js';
import { verifyTelegramInitData } from './telegram.service.js';
import { findOrCreateUserByTelegram } from './user.service.js';
import type { PublicUser, VerifiedTelegramData } from '../types/domain.js';

export interface AuthenticateInput {
  initData: string;
  userAgent?: string | undefined;
  ip?: string | undefined;
}

export interface AuthenticateResult {
  user: PublicUser;
  session: IssuedSession;
  created: boolean;
}

/**
 * Full Telegram login flow:
 *   verify initData -> find/create user -> enforce status -> create session.
 */
export async function authenticateWithTelegram(input: AuthenticateInput): Promise<AuthenticateResult> {
  const verified = verifyTelegramInitData(input.initData, {
    botToken: env.telegramBotToken,
    maxAgeSeconds: env.telegramAuthMaxAgeSeconds,
    ed25519PublicKeyBase64Url: env.telegramEd25519PublicKey,
  });

  const { user, created } = await findOrCreateUserByTelegram(verified);

  if (user.status !== 'ACTIVE') {
    // Do not create a session for a suspended account.
    logger.warn('Rejected authentication for non-active user', {
      userId: user._id.toString(),
      status: user.status,
    });
    throw AppError.forbidden('This account is not active', 'ACCOUNT_SUSPENDED');
  }

  const session = await createSession({
    userId: user._id,
    userAgent: input.userAgent,
    ip: input.ip,
  });

  logger.info('Authenticated Telegram user', {
    userId: user._id.toString(),
    telegramId: user.telegramId,
    created,
  });

  return { user: toPublicUser(user), session, created };
}

/** Issues a fresh session for an already verified login. */
export function attachSessionCookie(res: Parameters<typeof setSessionCookie>[0], session: IssuedSession): void {
  setSessionCookie(res, session);
}

export interface LogoutResult {
  revoked: boolean;
}

/**
 * Destroys the caller's session. Idempotent: logging out twice, or without a
 * session, still returns success - the end state (no session) is the same.
 */
export async function logout(rawCookieValue: string | undefined): Promise<LogoutResult> {
  const revoked = await destroySession(rawCookieValue);
  return { revoked };
}

/**
 * Support/admin helper: revoke every session of a user.
 *
 * Takes a plain string so callers cannot accidentally pass a client controlled
 * value without it being validated here first.
 */
export async function revokeAllSessions(userId: string): Promise<number> {
  if (!Types.ObjectId.isValid(userId)) {
    throw AppError.badRequest('Invalid user id', 'BAD_REQUEST');
  }

  return destroyAllSessionsForUser(new Types.ObjectId(userId));
}

/** Re-exported so controllers do not need to know where verification happens. */
export type { VerifiedTelegramData };
