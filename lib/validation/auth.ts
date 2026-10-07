import { z } from "zod";

/** POST /api/auth/telegram body. Only the raw initData string is accepted. */
export const telegramAuthRequestSchema = z.object({
  initData: z.string().min(1).max(4_096),
});

/**
 * Schema for the `user` JSON field inside verified Telegram initData.
 * Applied only AFTER HMAC verification succeeds — never to client-sent data.
 */
export const telegramUserDataSchema = z.object({
  id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  first_name: z.string().min(1).max(64),
  last_name: z.string().max(64).optional(),
  username: z.string().max(32).optional(),
  photo_url: z.string().url().max(512).optional(),
  is_premium: z.boolean().optional(),
  language_code: z.string().max(16).optional(),
});

export type TelegramUserData = z.infer<typeof telegramUserDataSchema>;
