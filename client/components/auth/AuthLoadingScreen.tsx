'use client';

import { Spinner } from '@/components/ui/Spinner';

/**
 * Shown while the Telegram handshake and backend verification are in flight.
 * The main app is never rendered before the state resolves.
 */
export function AuthLoadingScreen(): React.JSX.Element {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6">
      <div className="relative grid size-24 place-items-center">
        {/* Soft violet halo */}
        <span className="absolute inset-0 animate-pulse rounded-3xl bg-violet-500/25 blur-xl" />
        <span className="absolute inset-0 rounded-3xl border border-violet-400/30" />
        <span className="text-4xl" aria-hidden="true">
          🔐
        </span>
      </div>

      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-lg font-semibold text-tg-text">Signing you in…</p>
        <p className="text-sm text-tg-hint">Verifying your Telegram account</p>
      </div>

      <div className="flex items-center gap-2 text-violet-400">
        <Spinner className="size-4" />
        <span className="text-xs font-medium tracking-wide uppercase">Secure connection</span>
      </div>
    </main>
  );
}
