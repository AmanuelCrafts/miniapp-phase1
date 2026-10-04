/**
 * End to end authentication flow against a real (in-memory) MongoDB.
 *
 * Maps directly to the Phase 1 success criteria: user creation, no duplicates,
 * session cookies, /me, logout and protected routes.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { UserModel } from '../src/models/User.js';
import { SessionModel } from '../src/models/Session.js';
import { agent, closeTestDatabase, connectTestDatabase, extractSessionCookie, request, resetDatabase } from './helpers/app.js';
import { buildInitData, telegramUserFixture } from './helpers/initData.js';
import { TEST_BOT_TOKEN } from './setup.js';

const initDataFor = (user: Record<string, unknown> = telegramUserFixture()) =>
  buildInitData({ botToken: TEST_BOT_TOKEN, user });

beforeAll(async () => {
  await connectTestDatabase();
});

afterAll(async () => {
  await closeTestDatabase();
});

beforeEach(async () => {
  await resetDatabase();
});

describe('POST /api/auth/telegram', () => {
  it('creates exactly one user for a new Telegram account', async () => {
    const response = await request()
      .post('/api/auth/telegram')
      .send({ initData: initDataFor() })
      .expect(200);

    expect(response.body.user).toMatchObject({
      telegramId: '123456789',
      firstName: 'Amanuel',
      lastName: 'Tesfaye',
      username: 'amanuel_dev',
      avatarUrl: 'https://t.me/i/userpic/320/amanuel_dev.jpg',
      status: 'ACTIVE',
    });
    expect(response.body.user.id).toEqual(expect.any(String));
    expect(response.body.user.createdAt).toEqual(expect.any(String));

    const users = await UserModel.find({ telegramId: '123456789' }).exec();
    expect(users).toHaveLength(1);
  });

  it('sets an HTTP-only session cookie', async () => {
    const response = await request()
      .post('/api/auth/telegram')
      .send({ initData: initDataFor() })
      .expect(200);

    const cookies = response.headers['set-cookie'] as unknown as string[];
    const sessionCookie = cookies.find((cookie) => cookie.startsWith('tgma_session='));

    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toContain('HttpOnly');
    expect(sessionCookie).toContain('Path=/');
    // The value must be an opaque token, not readable identity data.
    expect(sessionCookie).not.toContain('123456789');
    expect(sessionCookie).not.toContain('Amanuel');
  });

  it('never stores the raw session token in the database', async () => {
    const response = await request()
      .post('/api/auth/telegram')
      .send({ initData: initDataFor() })
      .expect(200);

    const sessionCookie = extractSessionCookie(response.headers['set-cookie'] as unknown as string[]);
    const rawToken = decodeURIComponent(sessionCookie.split('=')[1] ?? '').split('.')[0] ?? '';

    const stored = await SessionModel.findOne({ tokenHash: { $exists: true } })
      .select('+tokenHash')
      .lean()
      .exec();

    expect(stored).not.toBeNull();
    expect(stored?.tokenHash).toHaveLength(64);
    expect(stored?.tokenHash).not.toBe(rawToken);
  });

  it('recognises an existing user and does not create a duplicate', async () => {
    const first = await request().post('/api/auth/telegram').send({ initData: initDataFor() }).expect(200);
    const second = await request().post('/api/auth/telegram').send({ initData: initDataFor() }).expect(200);

    expect(second.body.user.id).toBe(first.body.user.id);
    expect(await UserModel.countDocuments({}).exec()).toBe(1);
  });

  it('does not duplicate users when the same account authenticates repeatedly', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request().post('/api/auth/telegram').send({ initData: initDataFor() }).expect(200);
    }

    expect(await UserModel.countDocuments({ telegramId: '123456789' }).exec()).toBe(1);
  });

  it('does not create duplicates under concurrent first-time logins', async () => {
    const initData = initDataFor();

    const responses = await Promise.all(
      Array.from({ length: 8 }, () =>
        request().post('/api/auth/telegram').send({ initData }),
      ),
    );

    for (const response of responses) {
      expect(response.status).toBe(200);
    }

    const users = await UserModel.find({ telegramId: '123456789' }).exec();
    expect(users).toHaveLength(1);

    const userIds = new Set(responses.map((response) => response.body.user.id as string));
    expect(userIds.size).toBe(1);
  });

  it('updates the Telegram profile fields on subsequent logins', async () => {
    await request()
      .post('/api/auth/telegram')
      .send({ initData: initDataFor() })
      .expect(200);

    const updated = await request()
      .post('/api/auth/telegram')
      .send({
        initData: initDataFor(
          telegramUserFixture({ first_name: 'Amanuel', last_name: null, username: 'amanuel_new', photo_url: null }),
        ),
      })
      .expect(200);

    expect(updated.body.user.username).toBe('amanuel_new');
    expect(updated.body.user.lastName).toBeNull();
    expect(updated.body.user.avatarUrl).toBeNull();

    const users = await UserModel.find({ telegramId: '123456789' }).exec();
    expect(users).toHaveLength(1);
  });

  it('creates separate users for different Telegram accounts', async () => {
    await request()
      .post('/api/auth/telegram')
      .send({ initData: initDataFor(telegramUserFixture({ id: 111 })) })
      .expect(200);
    await request()
      .post('/api/auth/telegram')
      .send({ initData: initDataFor(telegramUserFixture({ id: 222, username: 'second_user' })) })
      .expect(200);

    expect(await UserModel.countDocuments({}).exec()).toBe(2);
  });

  it('creates a new session on every login', async () => {
    await request().post('/api/auth/telegram').send({ initData: initDataFor() }).expect(200);
    await request().post('/api/auth/telegram').send({ initData: initDataFor() }).expect(200);

    expect(await SessionModel.countDocuments({ revokedAt: null }).exec()).toBe(2);
  });

  it.each([
    ['a tampered payload', () => buildInitData({ botToken: TEST_BOT_TOKEN, user: telegramUserFixture(), tamperUserPayload: telegramUserFixture({ id: 424_242 }) })],
    ['a foreign bot token', () => buildInitData({ botToken: '111:wrong-token', user: telegramUserFixture() })],
    ['expired data', () => buildInitData({ botToken: TEST_BOT_TOKEN, user: telegramUserFixture(), authDate: Math.floor(Date.now() / 1000) - 90_000 })],
  ])('rejects %s and creates no user', async (_label, buildInitDataFn) => {
    const response = await request()
      .post('/api/auth/telegram')
      .send({ initData: buildInitDataFn() })
      .expect(401);

    expect(response.body.error.code).toMatch(/INVALID_TELEGRAM_DATA|EXPIRED_TELEGRAM_DATA/);
    expect(await UserModel.countDocuments({}).exec()).toBe(0);
  });

  it('refuses to authenticate a suspended user and issues no session', async () => {
    await request().post('/api/auth/telegram').send({ initData: initDataFor() }).expect(200);
    await UserModel.updateOne({ telegramId: '123456789' }, { $set: { status: 'SUSPENDED' } }).exec();

    const response = await request()
      .post('/api/auth/telegram')
      .send({ initData: initDataFor() })
      .expect(403);

    expect(response.body.error.code).toBe('ACCOUNT_SUSPENDED');
    expect(response.headers['set-cookie']).toBeUndefined();
  });
});

describe('GET /api/auth/me', () => {
  it('returns the authenticated user for a valid session', async () => {
    const client = agent();
    const auth = await client.post('/api/auth/telegram').send({ initData: initDataFor() }).expect(200);

    const response = await client.get('/api/auth/me').expect(200);

    expect(response.body.user.id).toBe(auth.body.user.id);
    expect(response.body.user.telegramId).toBe('123456789');
    expect(response.body.user.status).toBe('ACTIVE');
  });

  it('returns 401 without a session', async () => {
    const response = await request().get('/api/auth/me').expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(response.body.user).toBeUndefined();
  });

  it('returns 401 for a forged session cookie', async () => {
    const response = await request()
      .get('/api/auth/me')
      .set('Cookie', 'tgma_session=forged-token.forged-signature')
      .expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when only the signature is tampered with', async () => {
    const auth = await request().post('/api/auth/telegram').send({ initData: initDataFor() }).expect(200);
    const sessionCookie = extractSessionCookie(auth.headers['set-cookie'] as unknown as string[]);
    const tampered = `${sessionCookie.slice(0, -4)}AAAA`;

    const response = await request()
      .get('/api/auth/me')
      .set('Cookie', tampered)
      .expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 after the session is revoked', async () => {
    const auth = await request().post('/api/auth/telegram').send({ initData: initDataFor() }).expect(200);
    const sessionCookie = extractSessionCookie(auth.headers['set-cookie'] as unknown as string[]);

    await SessionModel.updateMany({}, { $set: { revokedAt: new Date() } }).exec();

    await request().get('/api/auth/me').set('Cookie', sessionCookie).expect(401);
  });

  it('returns 403 for a suspended user with a valid session', async () => {
    const client = agent();
    await client.post('/api/auth/telegram').send({ initData: initDataFor() }).expect(200);
    await UserModel.updateOne({ telegramId: '123456789' }, { $set: { status: 'SUSPENDED' } }).exec();

    const response = await client.get('/api/auth/me').expect(403);

    expect(response.body.error.code).toBe('ACCOUNT_SUSPENDED');
  });

  it('does not let a client impersonate another user through the body', async () => {
    await request()
      .post('/api/auth/telegram')
      .send({ initData: initDataFor(telegramUserFixture({ id: 111 })) })
      .expect(200);

    const client = agent();
    await client
      .post('/api/auth/telegram')
      .send({ initData: initDataFor(telegramUserFixture({ id: 222, username: 'victim' })) })
      .expect(200);

    const response = await client
      .post('/api/auth/me')
      .send({ telegramId: '111' })
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

describe('POST /api/auth/logout', () => {
  it('invalidates the session and clears the cookie', async () => {
    const auth = await request().post('/api/auth/telegram').send({ initData: initDataFor() }).expect(200);
    const sessionCookie = extractSessionCookie(auth.headers['set-cookie'] as unknown as string[]);

    const logoutResponse = await request()
      .post('/api/auth/logout')
      .set('Cookie', sessionCookie)
      .expect(200);

    expect(logoutResponse.body).toEqual({ success: true });

    const cookies = logoutResponse.headers['set-cookie'] as unknown as string[];
    const clearedCookie = cookies.find((cookie) => cookie.startsWith('tgma_session='));
    expect(clearedCookie).toBeDefined();
    expect(clearedCookie).toContain('tgma_session=;');
    expect(clearedCookie).toContain('Expires=Thu, 01 Jan 1970');

    // The revoked cookie must no longer authenticate.
    await request().get('/api/auth/me').set('Cookie', sessionCookie).expect(401);
  });

  it('marks the session revoked in the database', async () => {
    const auth = await request().post('/api/auth/telegram').send({ initData: initDataFor() }).expect(200);
    const sessionCookie = extractSessionCookie(auth.headers['set-cookie'] as unknown as string[]);

    await request().post('/api/auth/logout').set('Cookie', sessionCookie).expect(200);

    const session = await SessionModel.findOne({ revokedAt: { $ne: null } }).lean().exec();
    expect(session).not.toBeNull();
  });

  it('is idempotent without a session', async () => {
    const response = await request().post('/api/auth/logout').expect(200);
    expect(response.body).toEqual({ success: true });
  });

  it('does not revoke other sessions of the same user', async () => {
    const clientA = agent();
    const clientB = agent();
    await clientA.post('/api/auth/telegram').send({ initData: initDataFor() }).expect(200);
    await clientB.post('/api/auth/telegram').send({ initData: initDataFor() }).expect(200);

    await clientA.post('/api/auth/logout').expect(200);

    await clientA.get('/api/auth/me').expect(401);
    await clientB.get('/api/auth/me').expect(200);
  });

  it('ends the agent cookie jar session after logout', async () => {
    const client = agent();
    await client.post('/api/auth/telegram').send({ initData: initDataFor() }).expect(200);
    await client.get('/api/auth/me').expect(200);

    await client.post('/api/auth/logout').expect(200);

    await client.get('/api/auth/me').expect(401);
  });
});

describe('GET /api/protected/ping', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const response = await request().get('/api/protected/ping').expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('allows authenticated requests and reports the session identity', async () => {
    const client = agent();
    const auth = await client.post('/api/auth/telegram').send({ initData: initDataFor() }).expect(200);

    const response = await client.get('/api/protected/ping').expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.userId).toBe(auth.body.user.id);
  });
});
