import Link from "next/link";
import { ArrowRight, Diamond } from "lucide-react";
import { formatDailyIncome, formatETB } from "@/lib/utils/format";
import type { VipPlanDto } from "@/types/vip";

/** VIP PLANS teaser — first three plans, snap-scrolled, links to /plans. */
export function PlansTeaser({ plans }: { plans: VipPlanDto[] }) {
  if (plans.length === 0) return null;

  return (
    <section
      aria-label="VIP plans"
      className="animate-fade-up [animation-delay:240ms]"
    >
      <div className="mb-3 flex items-center justify-between px-0.5">
        <span className="eyebrow flex items-center gap-1.5">
          <Diamond className="h-3.5 w-3.5 text-iris-300" aria-hidden="true" />
          VIP plans
        </span>
        <Link
          href="/plans"
          className="tap inline-flex items-center gap-1 text-xs font-semibold text-iris-300 transition-colors hover:text-iris-200"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
        {plans.slice(0, 3).map((plan) => (
          <Link
            key={plan.level}
            href="/plans"
            className="card tap w-[46%] min-w-[150px] snap-start p-4 transition-colors hover:border-iris-500/30"
          >
            <div className="flex items-center gap-1.5">
              <Diamond
                className="h-3.5 w-3.5 text-iris-300"
                aria-hidden="true"
              />
              <p className="text-xs font-bold uppercase tracking-wide text-ink-dim">
                {plan.name}
              </p>
            </div>
            <p className="mt-3 text-xl font-extrabold tracking-tight text-ink">
              {formatETB(plan.depositAmount)}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-mint">
              {formatDailyIncome(plan.dailyIncome)}
            </p>
            <p className="mt-1.5 text-[11px] text-ink-faint">
              🎯 {plan.dailyTasksRequired} daily tasks
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
