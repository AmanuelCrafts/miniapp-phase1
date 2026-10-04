'use client';

import { Button } from '@/components/ui/Button';
import { useAuthContext } from '@/hooks/useAuth';

/**
 * Shown after an explicit logout. Signing in again is a deliberate action rather
 * than an automatic loop, which would make logout impossible to observe.
 */
export function SignedOutScreen(): React.JSX.Element {
  const { retry } = useAuthContext();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6">
      <div className="relative grid size-24 place-items-center">
        <span className="absolute inset-0 rounded-3xl bg-violet-500/20 blur-xl" />
        <span className="absolute inset-0 rounded-3xl border border-violet-400/30" />
        <span className="text-4xl" aria-hidden="true">
          👋
        </span>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-xl font-bold text-tg-text">Signed out</h1>
        <p className="max-w-xs text-sm leading-relaxed text-tg-hint">
          Your session has been ended on this device.
        </p>
      </div>

      <Button fullWidth className="max-w-xs" onClick={retry}>
        Sign in again
      </Button>
    </main>
  );
}
