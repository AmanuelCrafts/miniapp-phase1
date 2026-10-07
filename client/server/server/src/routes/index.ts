/**
 * API v1 router composition.
 */
import { Router } from 'express';

import { healthHandler } from '../controllers/health.controller.js';
import type { AuthRateLimitOptions } from '../middleware/rateLimit.js';
import { createAuthRouter } from './auth.routes.js';
import protectedRoutes from './protected.routes.js';

export function createApiRouter(rateLimitOptions?: Partial<AuthRateLimitOptions>): Router {
  const router = Router();

  router.get('/health', healthHandler);
  router.use('/auth', createAuthRouter(rateLimitOptions));
  router.use('/protected', protectedRoutes);

  return router;
}
