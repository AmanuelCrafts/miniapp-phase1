export type UserStatus = "ACTIVE" | "SUSPENDED";

/**
 * Sanitized, serializable user as returned by the backend.
 * Never contains session tokens, ObjectIds, or internal fields.
 */
export interface PublicUser {
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  createdAt: string;
  hasVip: boolean;
  vipLevel: number | null;
}

export interface AuthSuccessResponse {
  user: PublicUser;
}

export interface MeResponse {
  user: PublicUser | null;
}

export interface LogoutResponse {
  ok: boolean;
}

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
  };
}
