/**
 * Auth service: the single place that talks to the API about authentication.
 * Components use hooks/context, never `fetch` directly.
 */
import { ApiError, api } from '@/lib/api';
import type { PublicUser } from '@/types/api';

export interface AuthResult {
  user: PublicUser;
}

export const authService = {
  /**
   * Signs the user in using Telegram `initData`.
   * Throws `ApiError` on invalid, tampered or expired data.
   */
  async signInWithTelegram(initData: string, signal?: AbortSignal): Promise<AuthResult> {
    return api.auth.authenticateWithTelegram({ initData }, signal);
  },

  /** Loads the authenticated user from the session cookie. */
  async fetchCurrentUser(signal?: AbortSignal): Promise<AuthResult> {
    return api.auth.me(signal);
  },

  /**
   * Signs out. A failure here (for example an already dead session) is not
   * treated as fatal by the caller: the local state is cleared regardless.
   */
  async signOut(signal?: AbortSignal): Promise<void> {
    try {
      await api.auth.logout(signal);
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) return;
      throw error;
    }
  },
} as const;
