import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  buildDataCheckString,
  TELEGRAM_WEB_APP_DATA_SALT,
  verifyTelegramInitData,
} from '../src/services/telegram.service.js';
import {
  deriveEd25519PublicKeyFromBotToken,
  deriveTelegramSecretKey,
  signValue,
  timingSafeEqualString,
  verifySignedValue,
} from '../src/utils/crypto.js';
import { buildInitData, signEd25519, telegramUserFixture } from './helpers/initData.js';
import { TEST_BOT_TOKEN } from './setup.js';

const OTHER_BOT_TOKEN = '9876543210:BBBdifferent-token-entirely';
const MAX_AGE_SECONDS = 86_400;

const verify = (initData: string, botToken: string = TEST_BOT_TOKEN) =>
  verifyTelegramInitData(initData, { botToken, maxAgeSeconds: MAX_AGE_SECONDS });

describe('verifyTelegramInitData', () => {
  it('accepts valid initData and returns the verified user', () => {
    const initData = buildInitData({ botToken: TEST_BOT_TOKEN, user: telegramUserFixture() });

    const result = verify(initData);

    expect(result.user.id).toBe(123_456_789);
    expect(result.user.first_name).toBe('Amanuel');
    expect(result.user.last_name).toBe('Tesfaye');
    expect(result.user.username).toBe('amanuel_dev');
    expect(result.user.photo_url).toBe('https://t.me/i/userpic/320/amanuel_dev.jpg');
    expect(result.authDateUnix).toBeGreaterThan(0);
    // The hash must never be part of the exposed field set.
    expect(result.fields['hash']).toBeUndefined();
    expect(result.fields['signature']).toBeUndefined();
  });

  it('rejects initData signed with a different bot token', () => {
    const initData = buildInitData({ botToken: OTHER_BOT_TOKEN, user: telegramUserFixture() });

    expect(() => verify(initData)).toThrowError(/signature verification failed/i);
  });

  it('rejects tampered initData whose payload changed after signing', () => {
    const initData = buildInitData({
      botToken: TEST_BOT_TOKEN,
      user: telegramUserFixture({ id: 123_456_789, first_name: 'Amanuel' }),
      // Same hash, attacker-supplied payload claiming a different Telegram id.
      tamperUserPayload: telegramUserFixture({ id: 999_999_999, first_name: 'Attacker', username: 'attacker' }),
    });

    expect(() => verify(initData)).toThrowError(/signature verification failed/i);
  });

  it('rejects a single character change anywhere in the signed fields', () => {
    const initData = buildInitData({
      botToken: TEST_BOT_TOKEN,
      user: telegramUserFixture(),
      extraFields: { start_param: 'ref_1234' },
    });

    const tampered = initData.replace('ref_1234', 'ref_9999');
    expect(tampered).not.toBe(initData);

    expect(() => verify(tampered)).toThrowError(/signature verification failed/i);
  });

  it('rejects expired authentication data', () => {
    const staleAuthDate = Math.floor(Date.now() / 1000) - MAX_AGE_SECONDS - 60;
    const initData = buildInitData({
      botToken: TEST_BOT_TOKEN,
      user: telegramUserFixture(),
      authDate: staleAuthDate,
    });

    expect(() => verify(initData)).toThrowError(/expired/i);
  });

  it('accepts data that is still inside the freshness window', () => {
    const recentAuthDate = Math.floor(Date.now() / 1000) - MAX_AGE_SECONDS + 60;
    const initData = buildInitData({
      botToken: TEST_BOT_TOKEN,
      user: telegramUserFixture(),
      authDate: recentAuthDate,
    });

    expect(() => verify(initData)).not.toThrow();
  });

  it('rejects a timestamp implausibly far in the future', () => {
    const futureAuthDate = Math.floor(Date.now() / 1000) + 3_600;
    const initData = buildInitData({
      botToken: TEST_BOT_TOKEN,
      user: telegramUserFixture(),
      authDate: futureAuthDate,
    });

    expect(() => verify(initData)).toThrowError(/invalid timestamp/i);
  });

  it.each([
    ['an empty string', ''],
    ['whitespace only', '   '],
    ['random text', 'not-telegram-data-at-all'],
    ['data without a hash', 'auth_date=1700000000&user=%7B%22id%22%3A1%7D'],
    ['a malformed hash', 'auth_date=1700000000&user=%7B%22id%22%3A1%7D&hash=zzzz'],
  ])('rejects %s', (_label, initData) => {
    expect(() => verify(initData)).toThrowError();
  });

  it('rejects a correctly signed payload whose user field is not JSON', () => {
    const initData = buildInitData({
      botToken: TEST_BOT_TOKEN,
      user: telegramUserFixture(),
      rawUserField: 'not-json',
    });

    expect(() => verify(initData)).toThrowError(/not valid JSON/i);
  });

  it('rejects a correctly signed payload with no user field at all', () => {
    const initData = buildInitData({
      botToken: TEST_BOT_TOKEN,
      user: telegramUserFixture(),
      rawUserField: '',
    });

    expect(() => verify(initData)).toThrowError(/missing the user field/i);
  });

  it('rejects a payload whose user id is not a positive integer', () => {
    const initData = buildInitData({ botToken: TEST_BOT_TOKEN, user: { id: -5, first_name: 'Nope' } });

    expect(() => verify(initData)).toThrowError(/valid Telegram user/i);
  });

  it('rejects an oversized initData payload before parsing it', () => {
    const oversized = `auth_date=${Math.floor(Date.now() / 1000)}&user=${'a'.repeat(9_000)}&hash=${'0'.repeat(64)}`;

    expect(() => verify(oversized)).toThrowError(/too large/i);
  });

  it('rejects initData carrying a Telegram signature from a different bot token', () => {
    const base = buildInitData({ botToken: TEST_BOT_TOKEN, user: telegramUserFixture() });

    // Rebuild the check string without the hash/signature, then attach an
    // Ed25519 signature produced by a different bot token.
    const params = new URLSearchParams(base);
    params.delete('hash');
    params.delete('signature');
    const checkString = buildDataCheckString(params);

    const secretKey = createHmac('sha256', TELEGRAM_WEB_APP_DATA_SALT).update(TEST_BOT_TOKEN, 'utf8').digest('hex');
    params.set('hash', createHmac('sha256', secretKey).update(checkString, 'utf8').digest('hex'));
    params.set('signature', signEd25519(OTHER_BOT_TOKEN, checkString));

    expect(() => verify(params.toString())).toThrowError(/signature verification failed/i);
  });

  it('accepts the Ed25519 signature field when it matches the bot token key', () => {
    const initData = buildInitData({
      botToken: TEST_BOT_TOKEN,
      user: telegramUserFixture(),
      withSignature: true,
    });

    const result = verify(initData);
    expect(result.user.id).toBe(123_456_789);
  });

  it('accepts an explicitly configured Ed25519 public key', () => {
    const initData = buildInitData({
      botToken: TEST_BOT_TOKEN,
      user: telegramUserFixture(),
      withSignature: true,
    });

    const publicKey = deriveEd25519PublicKeyFromBotToken(TEST_BOT_TOKEN);

    const result = verifyTelegramInitData(initData, {
      botToken: TEST_BOT_TOKEN,
      maxAgeSeconds: MAX_AGE_SECONDS,
      ed25519PublicKeyBase64Url: publicKey.toString('base64url'),
    });

    expect(result.user.username).toBe('amanuel_dev');
  });

  it('rejects a correctly signed payload when the Ed25519 signature is corrupt', () => {
    const initData = buildInitData({
      botToken: TEST_BOT_TOKEN,
      user: telegramUserFixture(),
      withSignature: true,
    });

    // Flip a character in the middle of the base64url signature. The final
    // character only carries padding bits, so changing it may decode to the
    // very same bytes and would make this a flaky assertion.
    const [head = '', rawSignature = ''] = initData.split('signature=');
    const middle = Math.floor(rawSignature.length / 2);
    const replacement = rawSignature[middle] === 'A' ? 'B' : 'A';
    const corrupted = `${head}signature=${rawSignature.slice(0, middle)}${replacement}${rawSignature.slice(middle + 1)}`;

    expect(corrupted).not.toBe(initData);
    expect(() => verify(corrupted)).toThrowError(/signature verification failed/i);
  });
});

/**
 * Regression guard for a bug that made every genuine Telegram sign-in fail
 * with a 401 while the whole suite stayed green.
 *
 * Telegram's spec is:
 *
 *   secret_key = HMAC_SHA256(<bot_token>, "WebAppData")      <- raw 32 bytes
 *   hash       = hex(HMAC_SHA256(data_check_string, secret_key))
 *
 * The implementation derived `secret_key` through the hex-returning HMAC
 * helper, so the second HMAC was keyed with 64 ASCII characters instead of the
 * 32 raw bytes. The test helper signed the same wrong way, so the two agreed
 * with each other and no test could see the defect.
 *
 * These tests pin the key encoding against an inline transcription of the spec
 * rather than against the implementation, so the mistake cannot come back.
 */
describe('initData secret key derivation', () => {
  const specSecretKey = (botToken: string): Buffer =>
    createHmac('sha256', TELEGRAM_WEB_APP_DATA_SALT).update(botToken, 'utf8').digest();

  it('derives the secret key as the raw 32 byte digest, not hex', () => {
    const secretKey = deriveTelegramSecretKey(TEST_BOT_TOKEN, TELEGRAM_WEB_APP_DATA_SALT);

    expect(Buffer.isBuffer(secretKey)).toBe(true);
    expect(secretKey.length).toBe(32);
    expect(secretKey.equals(specSecretKey(TEST_BOT_TOKEN))).toBe(true);
  });

  it('accepts a payload hashed with the raw secret key, per spec', () => {
    // Signed inline straight from the documented algorithm, bypassing the helper.
    const user = JSON.stringify({ id: 555_000_111, first_name: 'Spec', username: 'spec_user' });
    const authDate = Math.floor(Date.now() / 1000);
    const checkString = ['auth_date=' + authDate, 'user=' + user].sort().join('\n');
    const hash = createHmac('sha256', specSecretKey(TEST_BOT_TOKEN))
      .update(checkString, 'utf8')
      .digest('hex');

    const initData = `auth_date=${authDate}&user=${encodeURIComponent(user)}&hash=${hash}`;

    const result = verify(initData);

    expect(result.user.id).toBe(555_000_111);
    expect(result.user.username).toBe('spec_user');
  });

  it('rejects a payload hashed with the hex-encoded secret key', () => {
    const initData = buildInitData({
      botToken: TEST_BOT_TOKEN,
      user: telegramUserFixture(),
      hexSecretKey: true,
    });

    expect(() => verify(initData)).toThrowError(/signature verification failed/i);
  });

  it('produces a different hash for raw versus hex secret keys', () => {
    // Guards the guard: if these ever matched, the rejection test above would
    // pass for the wrong reason and would stop protecting anything.
    const raw = createHmac('sha256', specSecretKey(TEST_BOT_TOKEN)).update('user=x', 'utf8').digest('hex');
    const hex = createHmac('sha256', Buffer.from(specSecretKey(TEST_BOT_TOKEN).toString('hex'), 'utf8'))
      .update('user=x', 'utf8')
      .digest('hex');

    expect(raw).not.toBe(hex);
  });
});

describe('buildDataCheckString', () => {
  it('sorts keys and excludes hash and signature', () => {
    const params = new URLSearchParams('user=%7B%22id%22%3A1%7D&auth_date=1700000000&hash=abc&signature=def');

    expect(buildDataCheckString(params)).toBe('auth_date=1700000000\nuser={"id":1}');
  });

  it('is stable regardless of the order fields arrive in', () => {
    const first = new URLSearchParams('b=2&a=1&user=x');
    const second = new URLSearchParams('user=x&a=1&b=2');

    expect(buildDataCheckString(first)).toBe(buildDataCheckString(second));
  });
});

describe('timing safe comparison helpers', () => {
  it('compares equal values as equal', () => {
    expect(timingSafeEqualString('abc123', 'abc123')).toBe(true);
  });

  it('compares different values of the same length as different', () => {
    expect(timingSafeEqualString('abc123', 'abc124')).toBe(false);
  });

  it('compares values of different lengths as different without throwing', () => {
    expect(timingSafeEqualString('short', 'much longer value')).toBe(false);
    expect(timingSafeEqualString('', 'x')).toBe(false);
    expect(timingSafeEqualString('', '')).toBe(true);
  });

  it('round-trips signed values', () => {
    const secret = 'a'.repeat(64);
    const signature = signValue('token-value', secret);

    expect(verifySignedValue('token-value', signature, secret)).toBe(true);
    expect(verifySignedValue('token-value', signature, `${secret}x`)).toBe(false);
    expect(verifySignedValue('other-token', signature, secret)).toBe(false);
  });
});
