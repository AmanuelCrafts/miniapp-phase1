"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTelegram } from "@/contexts/TelegramContext";

/**
 * Switch account (Profile).
 *
 * Telegram's Android webview caches initData per webview instance and shares
 * the cookie jar across accounts on the same device — so a passive
 * "detect-and-switch" cannot work: the cached initData may still name the
 * previous account even after the user switched in Telegram.
 *
 * The reliable reset is to CLOSE the Mini App webview entirely. Reopening it
 * (from the bot or menu button) makes Telegram reissue initData for whichever
 * account is currently active. We clear our session first so the reopen
 * starts from a clean, unauthenticated state.
 */
export function SwitchAccountButton() {
  const router = useRouter();
  const { webApp, triggerHaptic } = useTelegram();
  const [pending, setPending] = useState(false);

  async function handleSwitch() {
    if (pending) return;
    setPending(true);
    triggerHaptic("medium");
    try {
      await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    } catch {
      // proceed regardless — closing the webview is the important part
    }

    if (webApp?.close) {
      // Closing forces Telegram to destroy the webview; the next launch
      // reissues initData for the currently-active Telegram account.
      webApp.close();
      return;
    }

    // Fallback (plain browser): refresh without session.
    router.refresh();
    setPending(false);
  }

  return (
    <Button
      variant="secondary"
      size="lg"
      className="w-full"
      onClick={handleSwitch}
      disabled={pending}
      aria-busy={pending}
    >
      <RefreshCcw className="h-4 w-4" aria-hidden="true" />
      Switch account
    </Button>
  );
}
