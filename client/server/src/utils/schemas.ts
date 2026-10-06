/**
 * Request schemas shared by controllers and (for documentation purposes) the
 * client. Parsing happens through the `validate` middleware.
 */
import { z } from 'zod';

/** POST /api/auth/telegram */
export const telegramAuthSchema = z
  .object({
    initData: z
      .string({ message: 'initData is required' })
      .trim()
      .min(1, 'initData must not be empty')
      // Real Telegram payloads are ~1-2 KB. The cap is a cheap DoS guard.
      .max(8_192, 'initData is too large'),
  })
  .strict();

export type TelegramAuthInput = z.infer<typeof telegramAuthSchema>;
