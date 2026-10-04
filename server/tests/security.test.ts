/**
 * API hardening: validation, rate limiting, CORS, error handling and the
 * guarantee that no server secret ever reaches the client.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { UserModel } from '../src/models/User.js';
import { env } from '../src/config/env.js';
import { TEST_BOT_TOKEN } from './setup.js';
import { closeTestDatabase, connectTestDatabase, request, resetDatabase } from './helpers/app.js';
import { buildInitData, telegramUserFixture } from './helpers/initData.js';

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

describe('request validation', () => {
  it.each([
    ['an empty body', {}],
    ['a null initData', { initData: null }],
    ['a numeric initData', { initData: 12345 }],
    ['an array initData', { initData: ['a'] }],
    ['an object initData', { initData: { hash: 'a' } }],
    ['an empty string', { initData: '' }],
    ['whitespace only', { initData: '   ' }],
  ])('rejects %s with 400', async (_label, body) => {
    const response = await request().post('/api/auth/telegram').send(body as object).expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(response.body.error.details?.issues)).toBe(true);
  });

  it('rejects unexpected extra properties', async () => {
    const response = await request()
      .post('/api/auth/telegram')
      .send({ initData: initDataFor(), telegramId: '999999999' })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(await UserModel.countDocuments({}).exec()).toBe(0);
  });

  it('rejects a client supplied telegramId even when the initData is valid', async () => {
    const response = await request()
      .post('/api/auth/telegram')
      .send({ initData: initDataFor(), telegramId: '424242' })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an oversized initData string', async () => {
    const response = await request()
      .post('/api/auth/telegram')
      .send({ initData: 'a'.repeat(9_000) })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects malformed JSON with 400', async () => {
    const response = await request()
      .post('/api/auth/telegram')
      .set('Content-Type', 'application/json')
      .send('{"initData": "unterminated')
      .expect(400);

    expect(response.body.error.code).toBe('BAD_REQUEST');
    expect(JSON.stringify(response.body)).not.toMatch(/SyntaxError|at JSON.parse/);
  });

  it('rejects an oversized request body with 413', async () => {
    const response = await request()
      .post('/api/auth/telegram')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ initData: 'a'.repeat(40_000) }))
      .expect(413);

    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});

describe('rate limiting', () => {
  it('returns 429 after exceeding the configured number of failed attempts', async () => {
    const limited = request({ authRateLimit: { max: 3, windowMs: 60_000 } });
    const invalidInitData = buildInitData({ botToken: '999:someone-elses-token', user: telegramUserFixture() });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await limited.post('/api/auth/telegram').send({ initData: invalidInitData }).expect(401);
    }

    const blocked = await limited.post('/api/auth/telegram').send({ initData: invalidInitData }).expect(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
  });

  it('does not count successful logins against the limit', async () => {
    const limited = request({ authRateLimit: { max: 2, windowMs: 60_000 } });

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await limited.post('/api/auth/telegram').send({ initData: initDataFor() }).expect(200);
    }
  });

  it('exposes rate limit headers', async () => {
    const limited = request({ authRateLimit: { max: 5, windowMs: 60_000 } });

    const response = await limited
      .post('/api/auth/telegram')
      .send({ initData: initDataFor() })
      .expect(200);

    expect(response.headers['ratelimit']).toBeDefined();
  });

  it('reads the limit from the environment configuration', () => {
    expect(env.authRateLimit.max).toBe(10);
    expect(env.authRateLimit.windowMs).toBe(60_000);
  });
});

describe('CORS', () => {
  it('allows the configured frontend origin', async () => {
    const response = await request()
      .post('/api/auth/telegram')
      .set('Origin', 'http://localhost:3000')
      .send({ initData: initDataFor() })
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('never answers with a wildcard origin', async () => {
    const response = await request()
      .post('/api/auth/telegram')
      .set('Origin', 'https://evil.example.com')
      .expect(403);

    expect(response.headers['access-control-allow-origin']).not.toBe('*');
    expect(response.body.error.code).toBe('CORS_ORIGIN_DENIED');
  });

  it('answers the preflight request only for allowed origins', async () => {
    const allowed = await request()
      .options('/api/auth/telegram')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST')
      .expect(204);

    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000');

    const denied = await request()
      .options('/api/auth/telegram')
      .set('Origin', 'https://evil.example.com')
      .set('Access-Control-Request-Method', 'POST')
      .expect(403);

    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('error handling', () => {
  it('returns 404 for unknown routes', async () => {
    const response = await request().get('/api/does-not-exist').expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.error.message).toContain('/api/does-not-exist');
  });

  it('uses a consistent error envelope', async () => {
    const response = await request().get('/api/auth/me').expect(401);

    expect(Object.keys(response.body)).toEqual(['error']);
    expect(Object.keys(response.body.error).sort()).toEqual(['code', 'message']);
  });

  it('never leaks a stack trace', async () => {
    const response = await request().post('/api/auth/telegram').send({}).expect(400);

    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toMatch(/at \w+ \(/);
    expect(serialized).not.toMatch(/\.ts:\d+:\d+/);
  });

  it('hides the Express fingerprint', async () => {
    const response = await request().get('/api/health').expect(200);
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('reports health and database status without credentials', async () => {
    const response = await request().get('/api/health').expect(200);

    expect(response.body).toMatchObject({ status: 'ok', database: 'connected' });
    expect(JSON.stringify(response.body)).not.toMatch(/mongodb:\/\//);
  });
});

describe('secret containment', () => {
  it('never returns the bot token in any response', async () => {
    const auth = await request().post('/api/auth/telegram').send({ initData: initDataFor() }).expect(200);
    const me = await request()
      .get('/api/auth/me')
      .set('Cookie', auth.headers['set-cookie'] as unknown as string[])
      .expect(200);
    const health = await request().get('/api/health').expect(200);
    const rejected = await request()
      .post('/api/auth/telegram')
      .send({ initData: buildInitData({ botToken: 'bad:token', user: telegramUserFixture() }) })
      .expect(401);

    for (const payload of [auth, me, health, rejected]) {
      const serialized = JSON.stringify(payload.body) + JSON.stringify(payload.headers);
      expect(serialized).not.toContain(TEST_BOT_TOKEN);
      expect(serialized).not.toContain(TEST_BOT_TOKEN.split(':')[1] ?? 'never');
      expect(serialized).not.toContain(env.sessionSecret);
      expect(serialized).not.toMatch(/TELEGRAM_BOT_TOKEN|SESSION_SECRET/);
    }
  });

  it('does not expose the bot token through any error path', async () => {
    const responses = await Promise.all([
      request().post('/api/auth/telegram').send({}).expect(400),
      request().get('/api/auth/me').expect(401),
      request().get('/api/nope').expect(404),
      request().post('/api/auth/telegram').send('not json at all').expect(400),
    ]);

    for (const response of responses) {
      expect(JSON.stringify(response.body)).not.toContain(TEST_BOT_TOKEN);
    }
  });

  it('keeps the bot token out of the frontend build inputs', () => {
    // The server only reads its token from its own validated environment.
    expect(env.telegramBotToken).toBe(TEST_BOT_TOKEN);
    expect(process.env['NEXT_PUBLIC_TELEGRAM_BOT_TOKEN']).toBeUndefined();
    expect(Object.keys(process.env).filter((key) => key.startsWith('NEXT_PUBLIC_'))).toHaveLength(0);
  });

  it('does not persist the bot token or session secret in the database', async () => {
    await request().post('/api/auth/telegram').send({ initData: initDataFor() }).expect(200);

    const serializedUsers = JSON.stringify(await UserModel.find({}).lean().exec());
    expect(serializedUsers).not.toContain(TEST_BOT_TOKEN);
    expect(serializedUsers).not.toContain(env.sessionSecret);
  });
});

describe('cookie hardening', () => {
  it('never exposes the session cookie to JavaScript or the wrong scope', async () => {
    const response = await request().post('/api/auth/telegram').send({ initData: initDataFor() }).expect(200);
    const cookies = response.headers['set-cookie'] as unknown as string[];
    const sessionCookie = cookies.find((cookie) => cookie.startsWith('tgma_session=')) ?? '';

    expect(sessionCookie).toContain('HttpOnly');
    expect(sessionCookie).toContain('Path=/');
    // Host-only cookie: no Domain attribute.
    expect(sessionCookie).not.toMatch(/Domain=/i);
    expect(sessionCookie).toMatch(/Expires=|Max-Age=/);
  });

  it('never sets a readable authentication cookie for the frontend', async () => {
    const response = await request().post('/api/auth/telegram').send({ initData: initDataFor() }).expect(200);
    const cookies = (response.headers['set-cookie'] as unknown as string[]) ?? [];

    // Only the session cookie is issued - no bearer token, no identity blob.
    expect(cookies).toHaveLength(1);
    expect(cookies[0]?.startsWith('tgma_session=')).toBe(true);
  });
});
