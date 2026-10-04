'use client';

import { Button } from '@/components/ui/Button';
import { useAuthContext } from '@/hooks/useAuth';
import { useHaptics } from '@/hooks/useHaptics';

/**
 * Shown when Telegram verification failed.
 * The app never continues silently as an unauthenticated visitor.
 */
export function AuthErrorScreen(): React.JSX.Element {
  const { error, retry } = useAuthContext();
  const haptics = useHaptics();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6">
      <div className="relative grid size-24 place-items-center">
        <span className="absolute inset-0 rounded-3xl bg-red-500/20 blur-xl" />
        <span className="absolute inset-0 rounded-3xl border border-red-400/30" />
        <span className="text-4xl" aria-hidden="true">
          ⚠️
        </span>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-xl font-bold text-tg-text">Authentication failed</h1>
        <p className="max-w-xs text-sm leading-relaxed text-tg-hint">
          Unable to verify your Telegram account.
        </p>

        {error ? (
          <p className="mt-2 max-w-xs rounded-xl bg-tg-hint/8 px-3 py-2 text-center text-xs text-tg-hint">
            {error.message}
          </p>
        ) : null}
      </div>

      <Button
        fullWidth
        className="max-w-xs"
        onClick={() => {
          haptics.warning();
          retry();
        }}
      >
        Try Again
      </Button>
    </main>
  );
}
