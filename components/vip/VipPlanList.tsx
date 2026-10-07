import { VipCard } from "@/components/vip/VipCard";
import type { VipPlanDto } from "@/types/vip";

export function VipPlanList({
  plans,
  currentLevel,
}: {
  plans: VipPlanDto[];
  currentLevel: number | null;
}) {
  return (
    <div className="space-y-3">
      {plans.map((plan, index) => (
        <VipCard
          key={plan.level}
          plan={plan}
          index={index}
          isCurrent={currentLevel !== null && currentLevel === plan.level}
        />
      ))}
    </div>
  );
}
