/**
 * Cryptographic helpers used for Telegram initData verification and session
 * token handling. Everything here is server side only.
 */
import {
  createHash,
  createHmac,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  timingSafeEqual,
  type KeyObject,
} from 'node:crypto';

const TOKEN_BYTE_LENGTH = 32;

/** URL safe, cryptographically random token (256 bits of entropy). */
export function randomToken(byteLength: number = TOKEN_BYTE_LENGTH): string {
  return randomBytes(byteLength).toString('base64url');
}

/** Hex encoded SHA-256 digest. Used to store session tokens at rest. */
export function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/** HMAC-SHA256 hex digest. `secretKey` is the HMAC key, `message` the payload. */
export function hmacSha256Hex(secretKey: string | Buffer, message: string): string {
  return createHmac('sha256', secretKey).update(message, 'utf8').digest('hex');
}

/**
 * Derives Telegram's `secret_key` for Mini App `initData` verification:
 * `HMAC_SHA256(key = salt, message = bot_token)`.
 *
 * The raw 32 bytes MUST be returned, not a hex string. Telegram feeds this
 * digest straight into a second HMAC as the key, so re-encoding it as hex
 * first silently invalidates every payload. `hmacSha256Hex` returns hex by
 * design (it exists to produce comparable digests), which is exactly the trap
 * this function exists to avoid - callers must never pass its output here.
 */
export function deriveTelegramSecretKey(botToken: string, salt: string): Buffer {
  return createHmac('sha256', salt).update(botToken, 'utf8').digest();
}

/**
 * Timing safe string comparison.
 *
 * `timingSafeEqual` requires equal length buffers, so mismatched lengths are
 * rejected after performing a dummy comparison to keep the timing profile of
 * the failure path close to that of the success path.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');

  if (bufferA.length !== bufferB.length) {
    timingSafeEqual(bufferA, bufferA);
    return false;
  }

  return timingSafeEqual(bufferA, bufferB);
}

/** Signs an arbitrary string value with a secret (base64url digest). */
export function signValue(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value, 'utf8').digest('base64url');
}

/** Verifies a value produced by {@link signValue} in constant time. */
export function verifySignedValue(value: string, signature: string, secret: string): boolean {
  return timingSafeEqualString(signValue(value, secret), signature);
}

/** PKCS#8 prefix for an Ed25519 private key seeded with a raw 32 byte value. */
const ED25519_PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');

/** SubjectPublicKeyInfo prefix for Ed25519 (12 bytes) followed by the raw key. */
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

/**
 * Wraps a raw 32 byte Ed25519 public key back into a DER SubjectPublicKeyInfo
 * buffer, which is what Node's `verify` expects.
 */
export function toEd25519Spki(rawPublicKey: Buffer): Buffer {
  if (rawPublicKey.length !== 32) {
    throw new Error('An Ed25519 public key must be exactly 32 bytes');
  }

  return Buffer.concat([ED25519_SPKI_PREFIX, rawPublicKey]);
}

/**
 * Derives the Ed25519 public key that belongs to a bot token, following
 * Telegram's "Validating data received via the Mini App / third party
 * validation" specification: the token is SHA-256 hashed and the digest is used
 * as the raw Ed25519 seed.
 */
export function deriveEd25519PublicKeyFromBotToken(botToken: string): Buffer {
  const seed = createHash('sha256').update(botToken, 'utf8').digest();
  const privateKey = createPrivateKey({
    key: Buffer.concat([ED25519_PKCS8_PREFIX, seed]),
    format: 'der',
    type: 'pkcs8',
  });
  return exportRawEd25519PublicKey(privateKey);
}

/** Exports the raw 32 byte Ed25519 public key from a private KeyObject. */
export function exportRawEd25519PublicKey(privateKey: KeyObject): Buffer {
  const spki = createPublicKey(privateKey).export({ format: 'der', type: 'spki' });

  if (!spki.subarray(0, ED25519_SPKI_PREFIX.length).equals(ED25519_SPKI_PREFIX)) {
    throw new Error('Unexpected Ed25519 SubjectPublicKeyInfo encoding');
  }

  return spki.subarray(ED25519_SPKI_PREFIX.length);
}
