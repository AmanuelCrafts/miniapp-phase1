/**
 * Public API contract shared with the Express backend.
 *
 * These schemas validate every response before it reaches React state, so a
 * backend change surfaces as a typed error instead of `undefined` at runtime.
 */
import { z } from 'zod';

export const userStatusSchema = z.enum(['ACTIVE', 'SUSPENDED']);
export type UserStatus = z.infer<typeof userStatusSchema>;

export const publicUserSchema = z.object({
  id: z.string().min(1),
  telegramId: z.string().min(1),
  username: z.string().nullable(),
  firstName: z.string().min(1),
  lastName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  status: userStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PublicUser = z.infer<typeof publicUserSchema>;

export const authUserResponseSchema = z.object({ user: publicUserSchema });
export type AuthUserResponse = z.infer<typeof authUserResponseSchema>;

export const logoutResponseSchema = z.object({ success: z.literal(true) });
export type LogoutResponse = z.infer<typeof logoutResponseSchema>;

/** Error envelope produced by the centralized error handler. */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type ApiErrorBody = z.infer<typeof apiErrorSchema>;

/** Request body for `POST /api/auth/telegram`. */
export interface TelegramAuthRequest {
  initData: string;
}
