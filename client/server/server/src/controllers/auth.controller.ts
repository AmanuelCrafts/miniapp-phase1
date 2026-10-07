/**
 * HTTP controllers.
 *
 * Controllers only do three things: read validated input, call a service, shape
 * the response. No verification logic, no database queries, no secrets.
 */
import type { Request, Response } from 'express';

import { getAuthenticatedUser } from '../middleware/auth.middleware.js';
import {
  attachSessionCookie,
  authenticateWithTelegram,
  logout,
} from '../services/auth.service.js';
import { clearSessionCookie, readSessionCookie } from '../services/session.service.js';
import { AppError } from '../utils/AppError.js';
import type { TelegramAuthInput } from '../utils/schemas.js';
import type { PublicUser } from '../types/domain.js';

export interface AuthUserResponse {
  user: PublicUser;
}

/** POST /api/auth/telegram */
export async function telegramAuthHandler(req: Request, res: Response): Promise<void> {
  const { initData } = req.validated?.body as TelegramAuthInput;

  if (!initData) {
    // Defensive: the validate middleware should have caught this already.
    throw AppError.badRequest('Invalid request', 'VALIDATION_ERROR');
  }

  const result = await authenticateWithTelegram({
    initData,
    userAgent: req.get('user-agent') ?? undefined,
    ip: req.ip,
  });

  attachSessionCookie(res, result.session);

  res.status(200).json({ user: result.user } satisfies AuthUserResponse);
}

/** GET /api/auth/me */
export async function meHandler(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req);
  res.status(200).json({ user } satisfies AuthUserResponse);
}

/** POST /api/auth/logout */
export async function logoutHandler(req: Request, res: Response): Promise<void> {
  await logout(readSessionCookie(req));
  clearSessionCookie(res);

  res.status(200).json({ success: true } satisfies { success: true });
}
