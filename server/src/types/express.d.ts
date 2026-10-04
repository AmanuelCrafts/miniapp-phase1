/**
 * Type augmentations for Express.
 */
import type { Types } from 'mongoose';

import type { PublicUser } from '../types/domain.js';

declare global {
  namespace Express {
    interface Request {
      /** Populated by `requireAuth`. Never derived from client supplied input. */
      user?: PublicUser;
      /** The session id backing `req.user`. */
      sessionId?: string;
      /** Output of the Zod `validate` middleware. */
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
      /** Object id of the authenticated user, for internal service calls. */
      userObjectId?: Types.ObjectId;
    }
  }
}

export {};
