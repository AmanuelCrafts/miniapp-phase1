'use client';

import { Button } from '@/components/ui/Button';
import { useHaptics } from '@/hooks/useHaptics';

/**
 * Shown when the app is opened in a normal browser.
 * Telegram identity is never faked; the user is told how to get the real thing.
 */
export function OutsideTelegramScreen(): React.JSX.Element {
  const haptics = useHaptics();

  const openTelegram = (): void => {
    haptics.impact('medium');
    window.open('https://t.me/botfather', '_blank', 'noopener,noreferrer');
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6">
      <div className="relative grid size-24 place-items-center">
        <span className="absolute inset-0 rounded-3xl bg-sky-500/20 blur-xl" />
        <span className="absolute inset-0 rounded-3xl border border-sky-400/30" />
        <span className="text-4xl" aria-hidden="true">
          📱
        </span>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-xl font-bold text-tg-text">Open in Telegram</h1>
        <p className="max-w-xs text-sm leading-relaxed text-tg-hint">
          This app must be opened through Telegram.
        </p>
      </div>

      <Button variant="secondary" fullWidth className="max-w-xs" onClick={openTelegram}>
        Open Telegram
      </Button>
    </main>
  );
}
