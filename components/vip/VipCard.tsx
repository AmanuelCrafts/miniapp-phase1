import { CheckCircle2, Diamond, Target } from "lucide-react";
import { formatDailyIncome, formatETB } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/**
 * A single VIP plan. Visual intensity rises gently with level so higher VIPs
 * feel more valuable without becoming noisy.
 */
function levelAccent(level: number): { ring: string; badge: string } {
  if (level >= 7) {
    return {
      ring: "border-gold/25 bg-gradient-to-br from-gold/[0.07] to-transparent",
      badge: "bg-gold/10 text-gold ring-gold/30",
    };
  }
  if (level >= 4) {
    return {
      ring: "border-fuchsia-400/20 bg-gradient-to-br from-fuchsia-500/[0.06] to-transparent",
      badge: "bg-fuchsia-400/10 text-fuchsia-300 ring-fuchsia-400/30",
    };
  }
  return {
    ring: "border-iris-500/20 bg-gradient-to-br from-iris-600/[0.08] to-transparent",
    badge: "bg-iris-500/10 text-iris-300 ring-iris-500/30",
  };
}

export function VipCard({
  plan,
  isCurrent,
  index = 0,
}: {
  plan: {
    level: number;
    name: string;
    depositAmount: number;
    dailyIncome: number;
    dailyTasksRequired: number;
  };
  isCurrent: boolean;
  index?: number;
}) {
  const accent = levelAccent(plan.level);

  return (
    <article
      className={cn(
        "card animate-fade-up p-4",
        accent.ring,
        isCurrent && "ring-1 ring-iris-400/40",
      )}
      style={{ animationDelay: `${Math.min(index, 7) * 50}ms` }}
      aria-label={`${plan.name}`}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold ring-1",
            accent.badge,
          )}
        >
          <Diamond className="h-3.5 w-3.5" aria-hidden="true" />
          {plan.name}
        </span>

        {isCurrent ? (
          <span className="pill-current animate-pop">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            Current plan
          </span>
        ) : plan.level === 8 ? (
          <span className="pill-soon">Max</span>
        ) : null}
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <p className="text-2xl font-extrabold tracking-tight text-ink">
          {formatETB(plan.depositAmount)}
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
          Deposit
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-mint/10 px-2.5 py-1.5 text-[11px] font-semibold text-mint">
          {formatDailyIncome(plan.dailyIncome)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-[11px] font-semibold text-ink-dim">
          <Target className="h-3 w-3 text-flame" aria-hidden="true" />
          {plan.dailyTasksRequired} daily tasks
        </span>
      </div>
    </article>
  );
}
