import { Diamond } from "lucide-react";
import { VipPlanList } from "@/components/vip/VipPlanList";
import { EmptyState } from "@/components/ui/ComingSoon";
import { getCurrentUser } from "@/lib/auth/session";
import { listActivePlans } from "@/services/vip.service";

/** 🎯 PLANS — all 8 VIP plans, MongoDB is the source of truth. */
export default async function PlansPage() {
  const [user, plans] = await Promise.all([
    getCurrentUser(),
    listActivePlans(),
  ]);

  const currentLevel = user?.vipLevel ?? null;

  return (
    <div className="mx-auto w-full max-w-app px-4 pb-6 pt-6">
      <header className="mb-5">
        <p className="eyebrow flex items-center gap-1.5">
          <Diamond className="h-3.5 w-3.5 text-iris-300" aria-hidden="true" />
          Plans
        </p>
        <h1 className="mt-1 text-[22px] font-extrabold tracking-tight text-ink">
          VIP Plans
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
          {currentLevel !== null
            ? "You can view every level below — your plan is marked."
            : "No active VIP plan. Pick your level when you're ready."}
        </p>
      </header>

      {plans.length === 0 ? (
        <EmptyState
          title="No plans yet"
          message="VIP plans are being prepared. Please check back soon."
        />
      ) : (
        <>
          <VipPlanList plans={plans} currentLevel={currentLevel} />
          <p className="mt-5 px-1 text-center text-[11px] leading-relaxed text-ink-faint">
            Deposits aren&apos;t open yet — plan activation arrives with the
            wallet release.
          </p>
        </>
      )}
    </div>
  );
}
