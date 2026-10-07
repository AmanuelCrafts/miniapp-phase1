"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BirrlyLogo } from "@/components/auth/BirrlyLogo";
import { useAuth } from "@/contexts/AuthContext";
import { useTelegram } from "@/contexts/TelegramContext";

/**
 * Keeps the HTTP-only session aligned with the Telegram account that opened
 * the app. Some Telegram clients (e.g. Android WebView) share the cookie jar
 * across accounts on the same device, so a valid session may belong to a
 * DIFFERENT Telegram account than the current initData.
 *
 * The comparison below uses initDataUnsafe purely as a UX hint to decide
 * whether to re-handshake. Identity itself is always established server-side:
 * the raw initData is verified via HMAC before any new session is issued.
 */
export function SessionSync() {
  const router = useRouter();
  const { isReady, isTelegram, initData, initDataUnsafe } = useTelegram();
  const sessionUser = useAuth();

  const [switching, setSwitching] = useState(false);
  const syncingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady || !isTelegram || !initData) return;
    if (!sessionUser) return; // AuthGate owns the initial handshake
    if (syncingRef.current) return;

    const telegramId = initDataUnsafe?.id;
    if (!telegramId || telegramId === sessionUser.telegramId) return;

    // Different Telegram account than the cookie session → re-handshake.
    syncingRef.current = true;
    setSwitching(true);

    (async () => {
      let switched = false;
      for (let attempt = 0; attempt < 3 && !switched; attempt++) {
        try {
          const response = await fetch("/api/auth/telegram", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData }),
            cache: "no-store",
          });
          if (response.ok) {
            switched = true;
            break;
          }
          if (response.status === 403) break; // suspended — do not retry
          // 429 / 5xx: back off and retry.
          await new Promise((r) => setTimeout(r, Math.min(1_000 * 2 ** attempt, 4_000)));
        } catch {
          await new Promise((r) => setTimeout(r, Math.min(1_000 * 2 ** attempt, 4_000)));
        }
      }

      if (switched) {
        router.refresh(); // re-render server components under the new session
        syncingRef.current = false;
        setSwitching(false);
      } else if (mountedRef.current) {
        // Keep the privacy overlay up and retry once more shortly — never
        // leave the wrong account's data on screen.
        setTimeout(() => {
          if (mountedRef.current) {
            syncingRef.current = false; // allow the effect to re-fire
            router.refresh();
          }
        }, 2_000);
      }
    })();
  }, [isReady, isTelegram, initData, initDataUnsafe, sessionUser, router]);

  if (!switching) return null;

  // Privacy overlay: never flash the previous account's data mid-switch.
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-night">
      <div className="animate-breathe">
        <BirrlyLogo size={56} />
      </div>
      <p className="mt-4 text-sm font-semibold text-ink-dim">
        Switching account…
      </p>
    </div>
  );
}
