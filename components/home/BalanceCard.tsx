"use client";

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ComingSoonPill } from "@/components/ui/ComingSoon";

/**
 * AVAILABLE BALANCE — placeholder until the wallet ledger exists.
 * Deliberately shows NO numbers: fake balances are never fabricated.
 */
export function BalanceCard() {
  return (
    <section
      aria-label="Available balance"
      className="card animate-fade-up p-5 [animation-delay:60ms]"
    >
      <div className="flex items-center justify-between">
        <p className="eyebrow">Available balance</p>
        <ComingSoonPill />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.05] text-ink-faint ring-1 ring-white/[0.06]">
          <Lock className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-2xl font-extrabold tracking-tight text-ink-dim">
            — ETB
          </p>
          <p className="text-xs text-ink-faint">
            Wallet arrives soon
          </p>
        </div>
      </div>

      <Button variant="secondary" size="md" className="mt-4 w-full" disabled>
        Withdraw
      </Button>
      <p className="mt-2.5 text-center text-[11px] leading-relaxed text-ink-faint">
        Deposits & withdrawals unlock with the wallet release.
      </p>
    </section>
  );
}
