import { ApiError, getRequestIp, jsonOk, route } from "@/lib/api/http";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { getEnvNumber } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit/memoryRateLimiter";
import { verifyInitData } from "@/lib/telegram/verifyInitData";
import { telegramAuthRequestSchema } from "@/lib/validation/auth";
import {
  toTelegramProfile,
  toPublicUser,
  upsertTelegramUser,
} from "@/services/auth.service";

const AUTH_RATE_WINDOW_MS = 60_000;

/**
 * POST /api/auth/telegram
 *
 * Accepts ONLY the raw Telegram.WebApp.initData string. Verifies the HMAC,
 * finds/creates the user, rejects suspended accounts, then establishes an
 * HTTP-only cookie session. The client never sends identity fields.
 */
export const POST = route(async (request) => {
  // 1. Rate limit per IP (replaceable with a shared store later).
  const ip = getRequestIp(request);
  const rateLimit = checkRateLimit(
    `auth-telegram:${ip}`,
    getEnvNumber("AUTH_RATE_LIMIT", 10),
    AUTH_RATE_WINDOW_MS,
  );
  if (!rateLimit.success) {
    throw new ApiError(
      429,
      "rate_limited",
      "Too many attempts. Please wait a minute and try again.",
    );
  }

  // 2. Validate the request body with Zod.
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = telegramAuthRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ApiError(400, "bad_request", "Invalid request.");
  }

  // 3. Verify the Telegram initData (HMAC + auth_date freshness).
  const verified = verifyInitData(parsed.data.initData);
  if (!verified.ok) {
    switch (verified.reason) {
      case "not_configured":
        throw new ApiError(
          500,
          "auth_unavailable",
          "Sign-in is temporarily unavailable. Please try again.",
        );
      case "expired":
        throw new ApiError(
          401,
          "expired_init_data",
          "Your Telegram session expired. Please reopen BIRRLY.",
        );
      default:
        throw new ApiError(
          401,
          "invalid_init_data",
          "We couldn't verify your Telegram session. Please reopen BIRRLY.",
        );
    }
  }

  // 4. Find or create the user; refresh safe Telegram profile fields.
  const user = await upsertTelegramUser(toTelegramProfile(verified.user));

  // 5. Reject suspended accounts.
  if (user.status === "SUSPENDED") {
    throw new ApiError(
      403,
      "account_suspended",
      "This account is suspended. Contact support if you think this is a mistake.",
    );
  }

  // 6. Establish the session (HTTP-only cookie).
  const { token, expiresAt } = await createSession(user._id);
  await setSessionCookie(token, expiresAt);

  return jsonOk({ user: toPublicUser(user) });
});
