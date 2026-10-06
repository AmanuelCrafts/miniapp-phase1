/**
 * Shared domain types. These mirror exactly what the API is allowed to expose.
 */

/** Lifecycle of a user account. */
export const USER_STATUSES = ['ACTIVE', 'SUSPENDED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** Public, client safe representation of a user. */
export interface PublicUser {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string;
  lastName: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Telegram user payload extracted from verified initData.
 *
 * Optional fields are nullable because Telegram omits them or sends `null`
 * depending on the client version and the user's privacy settings.
 */
export interface TelegramUserPayload {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  photo_url?: string | null;
  language_code?: string | null;
  is_premium?: boolean | null;
  allows_write_to_pm?: boolean | null;
}

/** Everything we trust after `initData` has been cryptographically verified. */
export interface VerifiedTelegramData {
  user: TelegramUserPayload;
  authDate: Date;
  authDateUnix: number;
  startParam: string | null;
  chatType: string | null;
  chatInstance: string | null;
  queryId: string | null;
  /** The raw parsed key/value pairs (never includes `hash`/`signature`). */
  fields: Record<string, string>;
}
