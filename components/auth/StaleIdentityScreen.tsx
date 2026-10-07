"use client";

import { Timer, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Stale Telegram identity screen.
 *
 * Telegram's Android webview caches initData (upstream: tdesktop#28303).
 * When the cached packet outlives TELEGRAM_AUTH_MAX_AGE, the server rejects
 * it rather than silently signing the user into a possibly-wrong account.
 * The fix is always the same: relaunch the webview so Telegram reissues
 * fresh initData for the currently-active account.
 */
export function StaleIdentityScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 pb-16">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-flame/10 text-flame ring-1 ring-flame/25">
        <Timer className="h-6 w-6" aria-hidden="true" />
      </div>
      <h1 className="mt-5 text-lg font-bold tracking-tight text-ink">
        Session needs a refresh
      </h1>
      <p className="mt-2 max-w-[32ch] text-center text-[13px] leading-relaxed text-ink-muted">
        BIRRLY was kept open a bit too long. Close the app fully and reopen it
        from the bot — this takes one second and keeps your account safe.
      </p>
      <Button variant="secondary" size="md" className="mt-6" onClick={onRetry}>
        <RefreshCcw className="h-4 w-4" aria-hidden="true" />
        Reopen BIRRLY
      </Button>
    </div>
  );
}
