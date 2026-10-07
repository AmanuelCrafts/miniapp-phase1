import { createHmac, timingSafeEqual } from 'node:crypto';
import type { TelegramUser } from '@/types/telegram';

const MAX_INIT_DATA_LENGTH = 8192;
const FUTURE_CLOCK_SKEW_SECONDS = 60;

export interface VerifiedTelegramData {
  user: TelegramUser;
  authDate: Date;
  authDateUnix: number;
}

export function verifyTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds: number,
): VerifiedTelegramData {
  if (!initData || initData.length > MAX_INIT_DATA_LENGTH) {
    throw new Error('Invalid initData');
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');

  if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) {
    throw new Error('Missing or invalid hash');
  }

  const authDateUnix = parseAuthDate(params.get('auth_date'));
  const now = Math.floor(Date.now() / 1000);
  const ageSeconds = now - authDateUnix;

  if (ageSeconds > maxAgeSeconds) {
    throw new Error('Authentication data has expired');
  }

  if (-ageSeconds > FUTURE_CLOCK_SKEW_SECONDS) {
    throw new Error('Invalid timestamp');
  }

  const dataCheckString = buildDataCheckString(params);
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (!timingSafeEqual(Buffer.from(calculatedHash, 'hex'), Buffer.from(hash.toLowerCase(), 'hex'))) {
    throw new Error('Signature verification failed');
  }

  const user = parseUser(params.get('user'));

  return {
    user,
    authDate: new Date(authDateUnix * 1000),
    authDateUnix,
  };
}

function buildDataCheckString(params: URLSearchParams): string {
  const pairs: Array<[string, string]> = [];

  for (const [key, value] of params.entries()) {
    if (key === 'hash') continue;
    pairs.push([key, value]);
  }

  pairs.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  return pairs.map(([key, value]) => `${key}=${value}`).join('\n');
}

function parseAuthDate(value: string | null): number {
  if (!value || !/^\d{1,12}$/.test(value)) {
    throw new Error('Missing or invalid auth_date');
  }
  return Number(value);
}

function parseUser(raw: string | null): TelegramUser {
  if (!raw) {
    throw new Error('Missing user field');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Invalid user JSON');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid user data');
  }

  const user = parsed as Record<string, unknown>;

  if (typeof user['id'] !== 'number' || user['id'] <= 0) {
    throw new Error('Invalid user id');
  }

  return {
    id: user['id'],
    first_name: typeof user['first_name'] === 'string' ? user['first_name'] : '',
    last_name: typeof user['last_name'] === 'string' ? user['last_name'] : undefined,
    username: typeof user['username'] === 'string' ? user['username'] : undefined,
    language_code: typeof user['language_code'] === 'string' ? user['language_code'] : undefined,
    photo_url: typeof user['photo_url'] === 'string' ? user['photo_url'] : undefined,
  };
}
