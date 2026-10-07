import Link from "next/link";
import { ArrowRight, CheckCircle2, Diamond, Target } from "lucide-react";
import { buttonStyles } from "@/components/ui/Button";
import { formatDailyIncome, formatETB } from "@/lib/utils/format";
import type { CurrentVipResponse } from "@/types/vip";

/**
 * 💎 YOUR CURRENT VIP — the hero card.
 * Shows real VIP state only; never invents one.
 */
export function CurrentVipCard({ currentVip }: { currentVip: CurrentVipResponse }) {
  if (!currentVip.hasVip || !currentVip.vip) {
    return (
      <section
        aria-label="Your current VIP"
        className="card animate-fade-up relative overflow-hidden border-iris-500/20 bg-gradient-to-br from-iris-600/25 via-iris-500/10 to-transparent p-5"
      >
        <div className="flex items-center gap-2">
          <Diamond className="h-4 w-4 text-iris-300" aria-hidden="true" />
          <p className="eyebrow !text-iris-300/80">Your current VIP</p>
        </div>

        <p className="mt-4 text-2xl font-extrabold tracking-tight text-ink">
          No active VIP
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
          Choose a plan to get started.
        </p>

        <Link
          href="/plans"
          className={buttonStyles("primary", "md", "tap mt-5 w-full")}
        >
          Choose a plan
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>
    );
  }

  const { vip } = currentVip;

  return (
    <section
      aria-label="Your current VIP"
      className="card animate-fade-up relative overflow-hidden border-iris-500/25 bg-gradient-to-br from-iris-600/30 via-iris-500/10 to-transparent p-5"
    >
      {/* soft radial accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-iris-500/25 blur-3xl"
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Diamond className="h-4 w-4 text-iris-300" aria-hidden="true" />
          <p className="eyebrow !text-iris-300/80">Your current VIP</p>
        </div>
        <span className="pill-active">
          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
          Active
        </span>
      </div>

      <p className="mt-4 text-3xl font-extrabold tracking-tight text-ink">
        {vip.name}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-xs font-semibold text-ink-dim">
          {formatETB(vip.depositAmount)} deposit
        </span>
        <span className="rounded-lg bg-mint/10 px-2.5 py-1.5 text-xs font-semibold text-mint">
          {formatDailyIncome(vip.dailyIncome)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-xs font-semibold text-ink-dim">
          <Target className="h-3.5 w-3.5 text-flame" aria-hidden="true" />
          {vip.dailyTasksRequired} daily tasks
        </span>
      </div>

      <Link
        href="/plans"
        className="tap mt-5 inline-flex items-center gap-1 text-sm font-semibold text-iris-300 transition-colors hover:text-iris-200"
      >
        View {vip.name} details
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
