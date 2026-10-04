/**
 * Rate limiting for authentication endpoints.
 *
 * Telegram clients can legitimately retry, but a burst of `initData` attempts
 * from one client is either a buggy client or a guessing attempt. Limits are
 * configurable via `AUTH_RATE_LIMIT` and `AUTH_RATE_LIMIT_WINDOW_MS`.
 */
import rateLimit, { type Options } from 'express-rate-limit';

import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export interface AuthRateLimitOptions {
  max: number;
  windowMs: number;
}

/** Default values taken from the validated environment. */
export const defaultAuthRateLimitOptions: AuthRateLimitOptions = {
  max: env.authRateLimit.max,
  windowMs: env.authRateLimit.windowMs,
};

/**
 * Builds an auth rate limiter.
 *
 * Keyed by client IP, which requires `app.set('trust proxy', ...)` to be correct
 * behind a load balancer (see `trustProxyHops`).
 */
export function createAuthRateLimiter(options: Partial<AuthRateLimitOptions> = {}) {
  const limit = options.max ?? env.authRateLimit.max;
  const windowMs = options.windowMs ?? env.authRateLimit.windowMs;

  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Count only failures by default so a real user who signs in repeatedly is
    // never locked out by their own successful logins.
    skipSuccessfulRequests: true,
    handler: (_req, _res, next) => {
      next(AppError.tooManyRequests('Too many authentication attempts, please try again later'));
    },
  } satisfies Partial<Options>);
}
