/**
 * Authentication middleware.
 *
 * The user identity is always resolved from a server side session record; it is
 * never read from a request body, query parameter, header or the URL. That is
 * what prevents a client from authenticating as an arbitrary telegramId.
 */
import type { Request, RequestHandler } from 'express';

import { readSessionCookie, resolveSession } from '../services/session.service.js';
import { AppError } from '../utils/AppError.js';
import { toPublicUser } from '../utils/dto.js';
import { logger } from '../utils/logger.js';

/**
 * Resolves the session on the request and populates `req.user` /
 * `req.sessionId` / `req.userObjectId`. Returns `false` when no valid session
 * is present instead of throwing, so callers can choose the reaction.
 */
async function attachAuthenticatedUser(req: Request): Promise<boolean> {
  try {
    const resolved = await resolveSession(readSessionCookie(req));
    if (!resolved) return false;

    if (resolved.user.status !== 'ACTIVE') {
      logger.warn('Blocked request for non-active user', {
        userId: resolved.user._id.toString(),
        status: resolved.user.status,
      });
      // Signal "authenticated but not permitted" to requireAuth, which answers
      // 403 instead of 401.
      req.user = toPublicUser(resolved.user);
      req.sessionId = resolved.sessionId;
      req.userObjectId = resolved.user._id;
      return true;
    }

    req.user = toPublicUser(resolved.user);
    req.sessionId = resolved.sessionId;
    req.userObjectId = resolved.user._id;
    return true;
  } catch (error) {
    if (error instanceof AppError) return false;
    throw error;
  }
}

/**
 * Rejects the request with 401 unless a valid, non-expired session exists.
 * Attaches `req.user` (public DTO) and `req.sessionId` on success.
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  void (async () => {
    try {
      const attached = await attachAuthenticatedUser(req);

      if (!attached) {
        next(AppError.unauthorized());
        return;
      }

      // A resolved session for a suspended user must not pass.
      if (req.user?.status !== 'ACTIVE') {
        next(AppError.forbidden('This account is not active', 'ACCOUNT_SUSPENDED'));
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  })();
};

/**
 * Attaches `req.user` when a valid session is present but never rejects.
 * Useful for endpoints that change shape for signed-in users.
 */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  void (async () => {
    try {
      await attachAuthenticatedUser(req);
      next();
    } catch (error) {
      next(error);
    }
  })();
};

/** Narrowing helper for controllers that run behind `requireAuth`. */
export function getAuthenticatedUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) {
    throw AppError.unauthorized();
  }
  return req.user;
}
