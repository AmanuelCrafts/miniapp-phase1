/**
 * Maps internal user documents to the exact public DTO the API is allowed to
 * return. Controllers must never serialise a Mongoose document directly - doing
 * so is how private fields and, in the wrong place, secrets leak into
 * responses.
 */
import type { Types } from 'mongoose';

import type { PublicUser, UserStatus } from '../types/domain.js';

/**
 * Structural shape of what the mapper needs. Deliberately not tied to a Mongoose
 * `HydratedDocument`, so both hydrated documents and lean results can be passed
 * and the mapper stays trivially testable.
 */
export interface UserLike {
  _id: Types.ObjectId | string;
  telegramId: string;
  // Nullable schema fields are typed as possibly-undefined by Mongoose, so both
  // are accepted and normalised to `null` here.
  username?: string | null;
  firstName: string;
  lastName?: string | null;
  avatarUrl?: string | null;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function toPublicUser(user: UserLike): PublicUser {
  return {
    id: String(user._id),
    telegramId: user.telegramId,
    username: user.username ?? null,
    firstName: user.firstName,
    lastName: user.lastName ?? null,
    avatarUrl: user.avatarUrl ?? null,
    status: user.status as UserStatus,
    createdAt: toIsoString(user.createdAt),
    updatedAt: toIsoString(user.updatedAt),
  };
}
