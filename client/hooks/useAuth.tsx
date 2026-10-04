/**
 * Authentication context.
 *
 * A single source of truth for the auth state machine so no component has to
 * keep its own copy:
 *
 *   loading            -> the Telegram handshake is in flight, show the splash
 *   outside_telegram  -> the SDK is unavailable, show "Open in Telegram"
 *   authenticated      -> `user` is set, render the app
 *   unauthenticated    -> signed out, offer to sign in again
 *   error              -> verification failed, offer a retry
 *
 * The session itself lives in an HTTP-only cookie: nothing is written to
 * localStorage or sessionStorage, so JavaScript can never read the credential.
 */
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { ApiError } from '@/lib/api';
import { authService } from '@/services/auth.service';
import { initTelegram, readTelegramRuntime, type TelegramRuntime } from '@/lib/telegram';
import type { PublicUser } from '@/types/api';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'outside_telegram' | 'error';

export interface AuthContextValue {
  status: AuthStatus;
  user: PublicUser | null;
  error: { code: string; message: string } | null;
  telegram: TelegramRuntime;
  retry: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Initial snapshot, shared by the server render and the first client render. */
const INITIAL_TELEGRAM: TelegramRuntime = {
  webApp: null,
  available: false,
  platform: 'unknown',
  colorScheme: 'dark',
  initData: '',
  version: '',
};

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<PublicUser | null>(null);
  const [error, setError] = useState<AuthContextValue['error']>(null);
  // The Telegram runtime is read from the environment, never stored in state.
  const telegram = useMemo(() => readTelegramRuntime(), []);
  const [attempt, setAttempt] = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    // `initTelegram()` notifies Telegram that the app is ready (ready/expand).
    const runtime = initTelegram();
    let cancelled = false;

    const authenticate = async (): Promise<void> => {
      // The Telegram SDK is absent in a plain browser: never fabricate a user,
      // just explain the situation.
      if (!runtime.available || runtime.initData.length === 0) {
        if (!cancelled) setStatus('outside_telegram');
        return;
      }

      try {
        // Step 1: hand the signed initData to the backend for verification.
        const { user: authenticatedUser } = await authService.signInWithTelegram(
          runtime.initData,
          controller.signal,
        );

        if (cancelled) return;
        setUser(authenticatedUser);
        setStatus('authenticated');
      } catch (signInError) {
        if (cancelled || controller.signal.aborted) return;

        // Step 2: an existing, still valid session cookie is enough to continue.
        // This keeps a reload working even when Telegram hands us initData the
        // backend considers stale.
        try {
          const { user: currentUser } = await authService.fetchCurrentUser(controller.signal);

          if (cancelled) return;
          setUser(currentUser);
          setStatus('authenticated');
          return;
        } catch {
          // Fall through to the error state below.
        }

        if (cancelled) return;
        setError(toAuthError(signInError));
        setStatus('error');
      }
    };

    void authenticate();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [attempt]);

  // Follow the Telegram colour scheme so the UI matches the client's theme.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset['colorScheme'] = telegram.colorScheme;
  }, [telegram.colorScheme]);

  const retry = useCallback(() => {
    setError(null);
    setUser(null);
    setStatus('loading');
    setAttempt((value) => value + 1);
  }, []);

  const signOut = useCallback(async () => {
    const controller = new AbortController();

    try {
      await authService.signOut(controller.signal);
    } catch {
      // The server side session may already be gone; the local state must still
      // be cleared so the UI never shows a stale authenticated user.
    } finally {
      abortRef.current?.abort();
      setUser(null);
      setError(null);
      setStatus('unauthenticated');
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      error,
      telegram,
      retry,
      signOut,
    }),
    [status, user, error, telegram, retry, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function toAuthError(error: unknown): { code: string; message: string } {
  if (error instanceof ApiError) {
    return { code: error.code, message: error.message };
  }

  return {
    code: 'UNKNOWN',
    message: 'Unable to verify your Telegram account. Please try again.',
  };
}

/** Access the auth state from any component below the provider. */
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext must be used inside <AuthProvider>');
  }

  return context;
}

/** Re-exported for convenience. */
export { INITIAL_TELEGRAM };
