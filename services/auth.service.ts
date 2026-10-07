import "server-only";
import { connectDB } from "@/lib/mongodb";
import type { TelegramUserData } from "@/lib/validation/auth";
import User, { type UserDocument } from "@/models/User";
import type { PublicUser } from "@/types/auth";

/**
 * Normalize a verified Telegram user into the profile shape BIRRLY stores.
 * Input has already passed HMAC verification — this is only mapping.
 */
export function toTelegramProfile(user: TelegramUserData) {
  return {
    telegramId: user.id,
    username: user.username ?? null,
    firstName: user.first_name,
    lastName: user.last_name ?? null,
    avatarUrl: user.photo_url ?? null,
  };
}

/**
 * Find or create the user for a verified Telegram profile and refresh the
 * safe profile fields (username / names / avatar). Identity, status and VIP
 * state are NEVER taken from the client.
 *
 * Handles the parallel-first-login race by falling back to findOne on a
 * duplicate-key error (unique telegramId index).
 */
export async function upsertTelegramUser(
  profile: ReturnType<typeof toTelegramProfile>,
): Promise<UserDocument> {
  await connectDB(); // ensure connection even if this is the process's first request
  const update = {
    $set: {
      username: profile.username,
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatarUrl: profile.avatarUrl,
    },
  };

  try {
    return await User.findOneAndUpdate(
      { telegramId: profile.telegramId },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    const isDuplicateKey =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000;
    if (!isDuplicateKey) throw error;

    const existing = await User.findOne({ telegramId: profile.telegramId });
    if (!existing) throw error;
    const refreshed = await User.findByIdAndUpdate(existing._id, update, {
      new: true,
    });
    return refreshed ?? existing;
  }
}

/**
 * Strip everything internal — safe to serialize to clients.
 * If `currentVipPlan` is populated (only the `level` field), the level is
 * included; otherwise vipLevel is null while hasVip still reflects state.
 */
export function toPublicUser(user: UserDocument): PublicUser {
  const populated = user.populated("currentVipPlan");
  let vipLevel: number | null = null;
  if (
    populated &&
    typeof populated === "object" &&
    "level" in (populated as object)
  ) {
    vipLevel = (populated as unknown as { level: number }).level;
  }

  return {
    telegramId: user.telegramId,
    username: user.username ?? null,
    firstName: user.firstName,
    lastName: user.lastName ?? null,
    avatarUrl: user.avatarUrl ?? null,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    hasVip: Boolean(user.currentVipPlan),
    vipLevel,
  };
}
