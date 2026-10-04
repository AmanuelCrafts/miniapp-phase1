'use client';

import { useAuthContext } from '@/hooks/useAuth';
import { AuthErrorScreen } from '@/components/auth/AuthErrorScreen';
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen';
import { OutsideTelegramScreen } from '@/components/auth/OutsideTelegramScreen';
import { SignedOutScreen } from '@/components/auth/SignedOutScreen';
import { Button } from '@/components/ui/Button';
import type { ReactNode } from 'react';

/**
 * Renders the app only once authentication has resolved.
 *
 *   loading          -> splash
 *   outside_telegram -> "Open in Telegram"
 *   unauthenticated  -> "Signed out"
 *   error            -> "Authentication failed"
 *   authenticated    -> children
 */
export function AuthGate({ children }: { children: ReactNode }): ReactNode {
  const { status, retry } = useAuthContext();

  switch (status) {
    case 'loading':
      return <AuthLoadingScreen />;

    case 'outside_telegram':
      return <OutsideTelegramScreen />;

    case 'unauthenticated':
      return <SignedOutScreen />;

    case 'error':
      return <AuthErrorScreen />;

    case 'authenticated':
      return <>{children}</>;

    default:
      // Defensive fallback: never leave the user on a blank screen.
      return (
        <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6">
          <p className="text-sm text-tg-hint">Something went wrong.</p>
          <Button onClick={retry}>Try Again</Button>
        </main>
      );
  }
}
