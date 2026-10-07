/**
 * Generates valid Telegram `initData` for the given payload by applying
 * Telegram's official signing algorithm.
 *
 * Used only to produce test fixtures. The production backend never signs
 * anything - it only verifies what Telegram signed.
 */
import { createHash, createHmac, createPrivateKey, sign } from 'node:crypto';

import { buildDataCheckString, TELEGRAM_WEB_APP_DATA_SALT } from '../../src/services/telegram.service.js';
import { deriveEd25519PublicKeyFromBotToken } from '../../src/utils/crypto.js';

const ED25519_PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');

function hmacRaw(key: Buffer | string, message: string): Buffer {
  return createHmac('sha256', key).update(message, 'utf8').digest();
}

function hmacHex(key: Buffer | string, message: string): string {
  return hmacRaw(key, message).toString('hex');
}

export interface InitDataOptions {
  botToken: string;
  user: Record<string, unknown>;
  authDate?: number;
  /** Extra fields such as start_param, chat_type, query_id. */
  extraFields?: Record<string, string>;
  /** Adds the Ed25519 `signature` field (Bot API 7.0+). */
  withSignature?: boolean;
  /** Overrides the computed hash, e.g. to simulate tampering. */
  hashOverride?: string;
  /**
   * Signs with the secret key hex-ENCODED instead of using the raw 32 bytes.
   * That contradicts Telegram's spec and must always be rejected; it exists so
   * a regression test can prove the verifier is not making this mistake.
   */
  hexSecretKey?: boolean;
  /** Rewrites the `user` field *after* hashing so the hash no longer matches. */
  tamperUserPayload?: Record<string, unknown>;
  /**
   * Replaces the serialised `user` field *before* hashing. Use this to produce a
   * correctly signed payload whose contents fail schema validation.
   */
  rawUserField?: string;
}

/** Derives the Ed25519 private key that belongs to a bot token. */
function ed25519PrivateKey(botToken: string) {
  const seed = createHash('sha256').update(botToken, 'utf8').digest();
  return createPrivateKey({
    key: Buffer.concat([ED25519_PKCS8_PREFIX, seed]),
    format: 'der',
    type: 'pkcs8',
  });
}

/** Signs a `data_check_string` the way Telegram's backend does. */
export function signEd25519(botToken: string, checkString: string): string {
  return sign(null, Buffer.from(checkString, 'utf8'), ed25519PrivateKey(botToken)).toString('base64url');
}

/** Builds an `initData` string exactly the way the Telegram client would. */
export function buildInitData(options: InitDataOptions): string {
  const authDate = options.authDate ?? Math.floor(Date.now() / 1000);

  const params = new URLSearchParams();
  params.set('auth_date', String(authDate));
  params.set('query_id', 'AAHdF6IQAAAAAN0XohDhrOrc');
  params.set('user', options.rawUserField ?? JSON.stringify(options.user));
  for (const [key, value] of Object.entries(options.extraFields ?? {})) {
    params.set(key, value);
  }

  const checkString = buildDataCheckString(params);

  // Telegram: secret_key = HMAC_SHA256(bot_token, "WebAppData"), used verbatim as
  // the key of the next HMAC. It is the RAW 32 byte digest, never its hex form.
  // `hexSecretKey` reproduces the historical bug on purpose so the regression
  // test can assert such payloads are rejected.
  const secretKey = options.hexSecretKey
    ? Buffer.from(hmacHex(TELEGRAM_WEB_APP_DATA_SALT, options.botToken), 'utf8')
    : hmacRaw(TELEGRAM_WEB_APP_DATA_SALT, options.botToken);

  const hash = options.hashOverride ?? hmacHex(secretKey, checkString);

  params.set('hash', hash);
  if (options.withSignature) {
    params.set('signature', signEd25519(options.botToken, checkString));
  }

  // Post-hash tampering: the payload changes but the signature does not.
  if (options.tamperUserPayload) {
    params.set('user', JSON.stringify(options.tamperUserPayload));
  }

  return params.toString();
}

/** A realistic Telegram user payload. */
export function telegramUserFixture(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 123_456_789,
    first_name: 'Amanuel',
    last_name: 'Tesfaye',
    username: 'amanuel_dev',
    photo_url: 'https://t.me/i/userpic/320/amanuel_dev.jpg',
    language_code: 'en',
    is_premium: false,
    allows_write_to_pm: true,
    ...overrides,
  };
}

export { deriveEd25519PublicKeyFromBotToken };
