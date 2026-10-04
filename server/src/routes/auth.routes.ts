/**
 * Authentication routes.
 *
 * Flow: route -> validation/rate limit middleware -> controller -> service.
 * No business logic lives in this file.
 */
import { Router } from 'express';

import { logoutHandler, meHandler, telegramAuthHandler } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { createAuthRateLimiter, type AuthRateLimitOptions } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { telegramAuthSchema } from '../utils/schemas.js';

export function createAuthRouter(rateLimitOptions?: Partial<AuthRateLimitOptions>): Router {
  const router = Router();
  const authLimiter = createAuthRateLimiter(rateLimitOptions ?? {});

  // Telegram sends the signed initData. Verified server side, never trusted.
  router.post(
    '/telegram',
    authLimiter,
    validate(telegramAuthSchema, 'body'),
    asyncHandler(telegramAuthHandler),
  );

  // Current user from the session cookie.
  router.get('/me', requireAuth, asyncHandler(meHandler));

  // Destroys the session server side and clears the cookie.
  router.post('/logout', asyncHandler(logoutHandler));

  return router;
}

export default createAuthRouter();
