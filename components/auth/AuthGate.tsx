"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ShieldX, Timer } from "lucide-react";
import { BirrlyLogo } from "@/components/auth/BirrlyLogo";
import { OpenInTelegram } from "@/components/auth/OpenInTelegram";
import { StaleIdentityScreen } from "@/components/auth/StaleIdentityScreen";
import { Button } from "@/components/ui/Button";
import { useTelegram } from "@/contexts/TelegramContext";

type Phase =
  | "boot"
  | "signing"
  | "no-telegram"
  | "suspended"
  | "stale"
  | "rate-limited"
  | "error";

/** Auto-retry budget for transient (429/5xx/network) handshake failures. */
const MAX_AUTO_RETRIES = 3;

/**
 * Rendered when no valid session exists. Performs the one-time Telegram
 * handshake: sends the raw initData to POST /api/auth/telegram, then refreshes
 * the server components once the HTTP-only session cookie is set.
 */
export function AuthGate() {
  const router = useRouter();
  const { isReady, isTelegram, initData, initDataUnsafe, triggerHaptic } = useTelegram();

  const [phase, setPhase] = useState<Phase>("boot");
  const attemptedRef = useRef(false);
  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const signIn = useCallback(
    async (options?: { isRetry?: boolean }) => {
      setPhase("signing");
      try {
        const response = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
          cache: "no-store",
        });

        if (!mountedRef.current) return;

        if (response.ok) {
          triggerHaptic("success");
          router.refresh();
          return;
        }

        if (response.status === 403) {
          setPhase("suspended");
          return;
        }

        // Expired cached initData: relaunching the webview is the only fix.
        if (response.status === 401) {
          const payload = (await response.json().catch(() => null)) as {
            error?: { code?: string };
          } | null;
          if (payload?.error?.code === "expired_init_data") {
            setPhase("stale");
            return;
          }
        }

        // 429 and transient 5xx: auto-retry a few times before giving up.
        if (
          (response.status === 429 || response.status >= 500) &&
          (options?.isRetry ? retryCountRef.current : 0) < MAX_AUTO_RETRIES
        ) {
          if (!options?.isRetry) retryCountRef.current = 0;
          retryCountRef.current += 1;
          const attempt = retryCountRef.current;
          const delay = Math.min(1_000 * 2 ** (attempt - 1), 8_000);
          if (mountedRef.current) {
            setPhase("signing");
            setTimeout(() => {
              if (mountedRef.current) void signIn({ isRetry: true });
            }, delay);
          }
          return;
        }

        if (response.status === 429) setPhase("rate-limited");
        else setPhase("error");
      } catch {
        // Network failure — treat as transient and retry.
        const attempt = options?.isRetry
          ? retryCountRef.current
          : 0;
        if (attempt < MAX_AUTO_RETRIES) {
          retryCountRef.current = attempt + 1;
          const delay = Math.min(1_000 * 2 ** (attempt), 8_000);
          if (mountedRef.current) {
            setTimeout(() => {
              if (mountedRef.current) void signIn({ isRetry: true });
            }, delay);
          }
          return;
        }
        if (mountedRef.current) setPhase("error");
      }
    },
    [initData, router, triggerHaptic],
  );

  useEffect(() => {
    if (!isReady) return; // wait until we know whether Telegram SDK exists
    if (!isTelegram) {
      setPhase("no-telegram");
      return;
    }
    if (!initData) {
      setPhase("error");
      return;
    }
    if (attemptedRef.current) return;
    attemptedRef.current = true;
    void signIn();
  }, [isReady, isTelegram, initData, signIn]);

  if (phase === "no-telegram") {
    return <OpenInTelegram />;
  }

  if (phase === "stale") {
    return (
      <StaleIdentityScreen
        onRetry={() => {
          attemptedRef.current = false;
          retryCountRef.current = 0;
          setPhase("boot");
          void signIn();
        }}
      />
    );
  }

  if (phase === "suspended") {
    return (
      <GateFrame>
        <GateIcon className="text-red-300/80 bg-red-400/10 ring-red-400/25">
          <ShieldX className="h-6 w-6" aria-hidden="true" />
        </GateIcon>
        <GateTitle>Account suspended</GateTitle>
        <GateMessage>
          This account can&apos;t use BIRRLY right now. Contact support if you
          believe this is a mistake.
        </GateMessage>
      </GateFrame>
    );
  }

  if (phase === "rate-limited") {
    return (
      <GateFrame>
        <GateIcon className="text-flame bg-flame/10 ring-flame/25">
          <Timer className="h-6 w-6" aria-hidden="true" />
        </GateIcon>
        <GateTitle>Too many attempts</GateTitle>
        <GateMessage>
          Please wait about a minute, then reopen BIRRLY to try again.
        </GateMessage>
        <RetryButton
          onRetry={() => {
            attemptedRef.current = false;
            retryCountRef.current = 0;
            void signIn();
          }}
        />
      </GateFrame>
    );
  }

  if (phase === "error") {
    return (
      <GateFrame>
        <GateIcon className="text-amber-300/90 bg-amber-400/10 ring-amber-400/25">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </GateIcon>
        <GateTitle>We couldn&apos;t sign you in</GateTitle>
        <GateMessage>
          {isTelegram
            ? "Telegram sent session data we couldn't verify — this usually happens when the Mini App was kept open during an account switch. Fully close BIRRLY and reopen it from the bot."
            : "Please try again."}
        </GateMessage>
        <RetryButton
          onRetry={() => {
            attemptedRef.current = false;
            retryCountRef.current = 0;
            void signIn();
          }}
        />
      </GateFrame>
    );
  }

  // boot / signing — branded splash
  const signingAs = (() => {
    const u = initDataUnsafe;
    if (!isTelegram || !u?.first_name) return null;
    return [u.first_name, u.last_name].filter(Boolean).join(" ");
  })();

  return (
    <GateFrame>
      <div className="animate-breathe">
        <BirrlyLogo size={64} />
      </div>
      <p className="mt-5 text-lg font-extrabold tracking-tight text-ink">
        BIRRLY
      </p>
      {signingAs ? (
        <p className="mt-1.5 text-[13px] font-medium text-ink-dim">
          Signing in as {signingAs}
        </p>
      ) : null}
      <div
        className="mt-2 flex items-center gap-1"
        role="status"
        aria-label="Signing in"
      >
        <span className="loading-dot h-1.5 w-1.5 rounded-full bg-iris-400" />
        <span className="loading-dot h-1.5 w-1.5 rounded-full bg-iris-400" />
        <span className="loading-dot h-1.5 w-1.5 rounded-full bg-iris-400" />
      </div>
      <p className="mt-4 text-[13px] text-ink-faint">
        {phase === "signing" ? "Signing you in securely…" : "Preparing…"}
      </p>
    </GateFrame>
  );
}

function GateFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 pb-16">
      {children}
    </div>
  );
}

function GateIcon({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex h-14 w-14 items-center justify-center rounded-2xl ring-1 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function GateTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="mt-5 text-lg font-bold tracking-tight text-ink">
      {children}
    </h1>
  );
}

function GateMessage({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 max-w-[32ch] text-center text-[13px] leading-relaxed text-ink-muted">
      {children}
    </p>
  );
}

function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <Button variant="secondary" size="md" className="mt-6" onClick={onRetry}>
      Try again
    </Button>
  );
}
