/**
 * Server side verification of Telegram Mini App `initData`.
 *
 * Implements Telegram's official validation process:
 *
 *   secret_key  = HMAC_SHA256(key = "WebAppData", message = bot_token)   [raw bytes]
 *   check_string= sorted "key=value" lines joined with "\n" (hash removed)
 *   calculated  = hex(HMAC_SHA256(key = secret_key, message = check_string))
 *
 * The bot token is read from the environment and never leaves the server. The
 * comparison against the client supplied `hash` is timing safe, and when the
 * newer Ed25519 `signature` field is present it is validated as well.
 */
import { createPublicKey, verify as cryptoVerify } from 'node:crypto';

import { z } from 'zod';

import { AppError } from '../utils/AppError.js';
import {
  deriveEd25519PublicKeyFromBotToken,
  deriveTelegramSecretKey,
  hmacSha256Hex,
  timingSafeEqualString,
  toEd25519Spki,
} from '../utils/crypto.js';
import type { TelegramUserPayload, VerifiedTelegramData } from '../types/domain.js';

/** Salt Telegram requires when deriving the HMAC key from the bot token. */
export const TELEGRAM_WEB_APP_DATA_SALT = 'WebAppData';

/** Guards against absurd payloads before any parsing work happens. */
const MAX_INIT_DATA_LENGTH = 8_192;

/** Telegram timestamps are seconds; allow a minute of clock skew into the future. */
const FUTURE_CLOCK_SKEW_SECONDS = 60;

const HASH_PATTERN = /^[a-f0-9]{64}$/i;

/**
 * Defensive schema for the JSON encoded `user` field inside initData.
 *
 * Optional profile fields may arrive absent, as an empty string, or explicitly
 * null depending on the Telegram client and the user's privacy settings, so
 * nullable variants are accepted and normalised to `undefined` here. The
 * required `id` and `first_name` stay strict.
 */
const telegramUserSchema = z.object({
  id: z.number().int().positive(),
  first_name: z.preprocess(
    (value) => (value === null || value === '' ? undefined : value),
    z.string().min(1).max(256).optional(),
  ),
  last_name: z.preprocess(
    (value) => (value === null || value === '' ? undefined : value),
    z.string().min(1).max(256).optional(),
  ),
  username: z.preprocess(
    (value) => (value === null || value === '' ? undefined : value),
    z
      .string()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z0-9_]+$/, 'username may only contain letters, digits and underscores')
      .optional(),
  ),
  photo_url: z.preprocess(
    (value) => (value === null || value === '' ? undefined : value),
    z.url().optional(),
  ),
  language_code: z.preprocess(
    (value) => (value === null || value === '' ? undefined : value),
    z.string().min(2).max(16).optional(),
  ),
  is_premium: z.boolean().nullish().transform((value) => value ?? undefined),
  allows_write_to_pm: z.boolean().nullish().transform((value) => value ?? undefined),
});

export interface VerifyInitDataOptions {
  botToken: string;
  /** Maximum accepted age of `auth_date`, in seconds. */
  maxAgeSeconds: number;
  /** Optional pre-computed Ed25519 public key (base64url, 32 bytes). */
  ed25519PublicKeyBase64Url?: string | undefined;
  /** Injectable clock, mainly for deterministic tests. */
  now?: Date;
}

/**
 * Rebuilds the `data_check_string` exactly as Telegram specifies: every field
 * except `hash` (and the optional `signature`) sorted by key, joined by "\n".
 */
export function buildDataCheckString(params: URLSearchParams): string {
  const pairs: Array<[string, string]> = [];

  for (const [key, value] of params.entries()) {
    if (key === 'hash' || key === 'signature') continue;
    pairs.push([key, value]);
  }

  pairs.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  return pairs.map(([key, value]) => `${key}=${value}`).join('\n');
}

/**
 * Verifies `initData` and returns the Telegram payload it carries.
 *
 * Throws `AppError` with a 401 status for anything that is not authentic
 * Telegram data. Never returns partially trusted data.
 */
export function verifyTelegramInitData(
  initData: string,
  options: VerifyInitDataOptions,
): VerifiedTelegramData {
  const now = options.now ?? new Date();

  if (typeof initData !== 'string' || initData.trim().length === 0) {
    throw AppError.unauthorized('initData is missing or empty', 'INVALID_TELEGRAM_DATA');
  }
  if (initData.length > MAX_INIT_DATA_LENGTH) {
    throw AppError.unauthorized('initData payload is too large', 'INVALID_TELEGRAM_DATA');
  }

  const params = new URLSearchParams(initData);

  const hash = params.get('hash');
  if (!hash || !HASH_PATTERN.test(hash)) {
    throw AppError.unauthorized('initData is malformed: missing or invalid hash', 'INVALID_TELEGRAM_DATA');
  }

  const checkString = buildDataCheckString(params);

  // The bot token is used as HMAC material here and is never returned or logged.
  // `secretKey` must stay the raw 32 byte digest: Telegram uses it verbatim as
  // the key of the second HMAC. Hex-encoding it here would break verification
  // of every genuine payload.
  const secretKey = deriveTelegramSecretKey(options.botToken, TELEGRAM_WEB_APP_DATA_SALT);
  const calculatedHash = hmacSha256Hex(secretKey, checkString);

  // Constant time comparison - a plain === would leak the hash byte by byte.
  if (!timingSafeEqualString(calculatedHash, hash.toLowerCase())) {
    throw AppError.unauthorized('initData signature verification failed', 'INVALID_TELEGRAM_DATA');
  }

  verifyEd25519SignatureIfPresent(params, checkString, options);

  const authDateUnix = parseAuthDate(params.get('auth_date'));

  const ageSeconds = Math.floor(now.getTime() / 1000) - authDateUnix;
  if (ageSeconds > options.maxAgeSeconds) {
    throw AppError.unauthorized(
      'Telegram authentication data has expired, please reopen the app',
      'EXPIRED_TELEGRAM_DATA',
    );
  }
  if (-ageSeconds > FUTURE_CLOCK_SKEW_SECONDS) {
    throw AppError.unauthorized('Telegram authentication data has an invalid timestamp', 'INVALID_TELEGRAM_DATA');
  }

  // Optional profile fields are absent or explicitly null depending on the
  // Telegram client and privacy settings, so they are normalised here.
  const userResult = telegramUserSchema.safeParse(parseUserField(params.get('user')));
  if (!userResult.success) {
    throw AppError.unauthorized('initData does not contain a valid Telegram user', 'INVALID_TELEGRAM_DATA');
  }

  return {
    user: userResult.data satisfies TelegramUserPayload,
    authDate: new Date(authDateUnix * 1000),
    authDateUnix,
    startParam: params.get('start_param'),
    chatType: params.get('chat_type'),
    chatInstance: params.get('chat_instance'),
    queryId: params.get('query_id'),
    fields: Object.fromEntries(
      [...params.entries()].filter(([key]) => key !== 'hash' && key !== 'signature'),
    ),
  };
}

function parseAuthDate(value: string | null): number {
  if (!value || !/^\d{1,12}$/.test(value)) {
    throw AppError.unauthorized('initData is missing a valid auth_date', 'INVALID_TELEGRAM_DATA');
  }
  return Number(value);
}

function parseUserField(raw: string | null): unknown {
  if (!raw) {
    throw AppError.unauthorized('initData is missing the user field', 'INVALID_TELEGRAM_DATA');
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw AppError.unauthorized('initData user field is not valid JSON', 'INVALID_TELEGRAM_DATA');
  }
}

/**
 * Validates the optional Ed25519 `signature` field (Telegram Bot API 7.0+).
 *
 * The key is either supplied through configuration or derived from the bot
 * token as described in Telegram's third party validation docs. Signature
 * verification failures reject the payload, even though the HMAC check passed.
 */
function verifyEd25519SignatureIfPresent(
  params: URLSearchParams,
  checkString: string,
  options: VerifyInitDataOptions,
): void {
  const signature = params.get('signature');
  if (!signature) return;

  if (!/^[A-Za-z0-9_-]{86}$/.test(signature)) {
    throw AppError.unauthorized('initData signature is malformed', 'INVALID_TELEGRAM_DATA');
  }

  let publicKey: Buffer;
  if (options.ed25519PublicKeyBase64Url) {
    publicKey = Buffer.from(options.ed25519PublicKeyBase64Url, 'base64url');
  } else {
    publicKey = deriveEd25519PublicKeyFromBotToken(options.botToken);
  }

  if (publicKey.length !== 32) {
    throw new AppError(500, 'INTERNAL_SERVER_ERROR', 'Configured Ed25519 public key must be 32 bytes');
  }

  let isValid = false;
  try {
    // Ed25519 is a one-shot (non-digest) algorithm, so `verify` is used
    // directly rather than the streaming `createVerify` interface. The raw
    // 32 byte key is rebuilt into a DER SubjectPublicKeyInfo first.
    isValid = cryptoVerify(
      null,
      Buffer.from(checkString, 'utf8'),
      createPublicKey({ key: toEd25519Spki(publicKey), format: 'der', type: 'spki' }),
      Buffer.from(signature, 'base64url'),
    );
  } catch {
    isValid = false;
  }

  // Constant time comparison is not required here: the Ed25519 check is a public
  // key operation with no secret material involved (unlike the bot token HMAC
  // above, where `timingSafeEqualString` is essential).
  if (!isValid) {
    throw AppError.unauthorized('initData signature verification failed', 'INVALID_TELEGRAM_DATA');
  }
}
