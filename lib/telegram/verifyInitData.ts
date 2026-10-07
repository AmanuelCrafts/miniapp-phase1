import crypto from "node:crypto";
import { requireEnv } from "@/lib/env";
import {
  telegramUserDataSchema,
  type TelegramUserData,
} from "@/lib/validation/auth";

/**
 * Official Telegram Mini App initData verification, server-side only.
 *
 * Algorithm (per Telegram docs):
 *   1. Parse initData as a query string; extract and remove `hash`.
 *   2. Sort the remaining fields alphabetically.
 *   3. Build the data-check-string: "<key>=<value>" lines joined by "\n".
 *   4. secret_key = HMAC_SHA256(key="WebAppData", message=BOT_TOKEN)
 *   5. computed   = HMAC_SHA256(key=secret_key, message=data-check-string)
 *   6. Compare computed to `hash` with a timing-safe equality check.
 *   7. Reject if auth_date is older than TELEGRAM_AUTH_MAX_AGE.
 *
 * Never log or return the bot token, secret key or hashes.
 */

export type InitDataVerifyResult =
  | { ok: true; user: TelegramUserData; authDate: number }
  | {
      ok: false;
      reason:
        | "not_configured"
        | "malformed"
        | "missing_hash"
        | "missing_auth_date"
        | "invalid_auth_date"
        | "expired"
        | "invalid_hash"
        | "invalid_user";
    };

function timingSafeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function verifyInitData(rawInitData: string): InitDataVerifyResult {
  let botToken: string;
  try {
    botToken = requireEnv("TELEGRAM_BOT_TOKEN");
  } catch {
    console.error(
      "[telegram] TELEGRAM_BOT_TOKEN is not configured — rejecting auth attempt.",
    );
    return { ok: false, reason: "not_configured" };
  }

  if (!rawInitData || typeof rawInitData !== "string") {
    return { ok: false, reason: "malformed" };
  }

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(rawInitData);
  } catch {
    return { ok: false, reason: "malformed" };
  }

  const hash = params.get("hash");
  if (!hash) return { ok: false, reason: "missing_hash" };

  const authDateRaw = params.get("auth_date");
  if (!authDateRaw) return { ok: false, reason: "missing_auth_date" };

  const authDate = Number.parseInt(authDateRaw, 10);
  if (!Number.isFinite(authDate) || authDate <= 0) {
    return { ok: false, reason: "invalid_auth_date" };
  }

  const maxAgeSeconds = (() => {
    try {
      return Number(process.env.TELEGRAM_AUTH_MAX_AGE ?? "86400") || 86_400;
    } catch {
      return 86_400;
    }
  })();

  const nowSeconds = Math.floor(Date.now() / 1_000);
  if (nowSeconds - authDate > maxAgeSeconds) {
    return { ok: false, reason: "expired" };
  }

  // Build the data-check-string: every field except `hash`, sorted by key.
  params.delete("hash");
  const dataCheckString = Array.from(params.entries())
    .sort(([keyA], [keyB]) => (keyA < keyB ? -1 : keyA > keyB ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  try {
    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    const computedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    if (!timingSafeEqualHex(computedHash, hash)) {
      return { ok: false, reason: "invalid_hash" };
    }
  } catch {
    return { ok: false, reason: "invalid_hash" };
  }

  const rawUser = params.get("user");
  if (!rawUser) return { ok: false, reason: "invalid_user" };

  let parsedUser: unknown;
  try {
    parsedUser = JSON.parse(rawUser);
  } catch {
    return { ok: false, reason: "invalid_user" };
  }

  const userResult = telegramUserDataSchema.safeParse(parsedUser);
  if (!userResult.success) {
    return { ok: false, reason: "invalid_user" };
  }

  return { ok: true, user: userResult.data, authDate };
}
