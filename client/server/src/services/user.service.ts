/**
 * User persistence.
 *
 * The Telegram identity comes exclusively from server-verified initData. The
 * frontend never sends a telegramId, and even if it did, it would be ignored.
 */
import type { Types } from 'mongoose';

import { UserModel, type UserDocument } from '../models/User.js';
import { logger } from '../utils/logger.js';
import type { VerifiedTelegramData } from '../types/domain.js';

export interface FindOrCreateResult {
  user: UserDocument;
  created: boolean;
}

/**
 * Finds the user by verified Telegram id, creating them on first login.
 *
 * Duplicate protection works at two levels:
 *  1. `findOne` then `create` for the common case.
 *  2. A unique index on `telegramId` as the hard guarantee. Two concurrent
 *     first-time logins race on the index; the loser catches the E11000 error
 *     and reads the row the winner just inserted instead of creating a
 *     duplicate.
 */
export async function findOrCreateUserByTelegram(
  verified: VerifiedTelegramData,
): Promise<FindOrCreateResult> {
  const telegramId = String(verified.user.id);

  const existing = await UserModel.findOne({ telegramId }).exec();
  if (existing) {
    return { user: await syncProfileFromTelegram(existing, verified), created: false };
  }

  try {
    const created = await UserModel.create({
      telegramId,
      firstName: verified.user.first_name ?? 'Telegram User',
      lastName: verified.user.last_name ?? null,
      username: verified.user.username ?? null,
      avatarUrl: verified.user.photo_url ?? null,
      status: 'ACTIVE',
    });

    logger.info('Created new Telegram user', { telegramId, userId: created._id.toString() });
    return { user: created, created: true };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      // Another request inserted the same telegramId first. Read it.
      const raced = await UserModel.findOne({ telegramId }).exec();
      if (raced) {
        return { user: await syncProfileFromTelegram(raced, verified), created: false };
      }
    }
    throw error;
  }
}

/**
 * Refreshes the denormalised Telegram profile fields.
 *
 * Only fields Telegram actually sent are touched, so a temporarily missing
 * value never wipes a previously known username.
 */
export async function syncProfileFromTelegram(
  user: UserDocument,
  verified: VerifiedTelegramData,
): Promise<UserDocument> {
  const updates: Record<string, string | null> = {};

  if (verified.user.first_name && verified.user.first_name !== user.firstName) {
    updates['firstName'] = verified.user.first_name;
  }
  if ((verified.user.last_name ?? null) !== user.lastName) {
    updates['lastName'] = verified.user.last_name ?? null;
  }
  if ((verified.user.username ?? null) !== user.username) {
    updates['username'] = verified.user.username ?? null;
  }
  if ((verified.user.photo_url ?? null) !== user.avatarUrl) {
    updates['avatarUrl'] = verified.user.photo_url ?? null;
  }

  if (Object.keys(updates).length === 0) {
    return user;
  }

  const updated = await UserModel.findOneAndUpdate(
    { _id: user._id },
    { $set: updates },
    { returnDocument: 'after', runValidators: true },
  ).exec();

  return updated ?? user;
}

/** Looks up a user by id, used by session resolution. */
export async function findUserById(userId: Types.ObjectId | string): Promise<UserDocument | null> {
  return UserModel.findById(userId).exec();
}

/**
 * Detects the MongoDB duplicate key error (E11000) without importing the driver
 * directly, so mongoose stays the only database dependency.
 */
function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11_000
  );
}
