/**
 * Small protected router used as an authentication scaffold.
 *
 * Every route here sits behind `requireAuth`, which makes it the reference
 * place to mount future phase endpoints (VIP, tasks, rewards...) and to verify
 * that the auth middleware rejects anonymous callers with 401.
 */
import { Router } from 'express';

import { getAuthenticatedUser, requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

/** GET /api/protected/ping */
router.get(
  '/ping',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = getAuthenticatedUser(req);
    res.status(200).json({
      ok: true,
      // Proves the identity came from the server side session, not the client.
      userId: user.id,
      sessionId: req.sessionId ?? null,
    });
  }),
);

export default router;
