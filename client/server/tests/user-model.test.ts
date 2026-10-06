/**
 * User model guarantees: unique identity, timestamps and a schema that stays
 * free of financial fields until a later phase introduces them.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { SessionModel } from '../src/models/Session.js';
import { UserModel } from '../src/models/User.js';
import { toPublicUser } from '../src/utils/dto.js';
import { closeTestDatabase, connectTestDatabase, resetDatabase } from './helpers/app.js';

const baseUser = {
  telegramId: '555000111',
  firstName: 'Amanuel',
  lastName: null,
  username: 'amanuel_dev',
  avatarUrl: null,
};

beforeAll(async () => {
  await connectTestDatabase();
});

afterAll(async () => {
  await closeTestDatabase();
});

beforeEach(async () => {
  await resetDatabase();
});

describe('User model', () => {
  it('creates a user with ACTIVE status and timestamps', async () => {
    const user = await UserModel.create(baseUser);

    expect(user.status).toBe('ACTIVE');
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it('rejects a duplicate telegramId at the database level', async () => {
    await UserModel.create(baseUser);

    await expect(UserModel.create({ ...baseUser, username: 'someone_else' })).rejects.toMatchObject({
      code: 11_000,
    });

    expect(await UserModel.countDocuments({ telegramId: baseUser.telegramId }).exec()).toBe(1);
  });

  it('requires telegramId', async () => {
    await expect(UserModel.create({ firstName: 'No Id' })).rejects.toThrow(/telegramId is required/);
  });

  it('requires firstName', async () => {
    await expect(UserModel.create({ telegramId: '999' })).rejects.toThrow(/firstName is required/);
  });

  it('rejects an unknown status', async () => {
    // Bypass the compile time enum to prove the database level guard holds.
    await expect(
      UserModel.create({ ...baseUser, status: 'PENDING' } as unknown as { telegramId: string }),
    ).rejects.toThrow();
  });

  it('accepts both supported statuses', async () => {
    await UserModel.create({ ...baseUser, status: 'ACTIVE' });
    await UserModel.create({ ...baseUser, telegramId: '555000222', status: 'SUSPENDED' });

    expect(await UserModel.countDocuments({}).exec()).toBe(2);
  });

  it('has a unique index on telegramId', async () => {
    const indexes = await UserModel.collection.indexes();
    const telegramIndex = indexes.find((index) => index.key?.['telegramId'] === 1);

    expect(telegramIndex).toBeDefined();
    expect(telegramIndex?.unique).toBe(true);
  });

  it('has a unique index on the session token hash', async () => {
    const indexes = await SessionModel.collection.indexes();
    const tokenIndex = indexes.find((index) => index.key?.['tokenHash'] === 1);

    expect(tokenIndex).toBeDefined();
    expect(tokenIndex?.unique).toBe(true);
  });

  it('expires sessions through a TTL index', async () => {
    const indexes = await SessionModel.collection.indexes();
    const ttlIndex = indexes.find((index) => index.key?.['expiresAt'] === 1);

    expect(ttlIndex).toBeDefined();
    expect(ttlIndex?.expireAfterSeconds).toBe(0);
  });

  it('has an index for status based lookups', async () => {
    const indexes = await UserModel.collection.indexes();
    expect(indexes.some((index) => index.key?.['status'] === 1)).toBe(true);
  });

  it('defaults nullable profile fields to null', async () => {
    const user = await UserModel.create({ telegramId: '777000888', firstName: 'No Last Name' });

    expect(user.lastName).toBeNull();
    expect(user.username).toBeNull();
    expect(user.avatarUrl).toBeNull();
  });

  it('contains no financial or reward fields in Phase 1', () => {
    const forbidden = [
      'balance',
      'deposits',
      'withdrawals',
      'withdrawalFee',
      'rewards',
      'dailyIncome',
      'transactions',
      'wallet',
      'streak',
      'tasks',
      'referrals',
      'vipLevel',
      'vip',
    ];

    const paths = Object.keys(UserModel.schema.paths);
    for (const field of forbidden) {
      expect(paths).not.toContain(field);
    }
  });
});

describe('toPublicUser', () => {
  it('maps a document to the public DTO shape', async () => {
    const user = await UserModel.create(baseUser);
    const dto = toPublicUser(user);

    expect(Object.keys(dto).sort()).toEqual([
      'avatarUrl',
      'createdAt',
      'firstName',
      'id',
      'lastName',
      'status',
      'telegramId',
      'updatedAt',
      'username',
    ]);
    expect(dto.id).toBe(user._id.toString());
    expect(dto.createdAt).toBe(user.createdAt.toISOString());
  });

  it('does not include internal mongoose fields', async () => {
    const user = await UserModel.create(baseUser);
    const dto = toPublicUser(user) as unknown as Record<string, unknown>;

    expect(dto['_id']).toBeUndefined();
    expect(dto['__v']).toBeUndefined();
  });
});
