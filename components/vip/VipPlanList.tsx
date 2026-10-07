import { VipCard } from './VipCard';

interface VipPlan {
  level: number;
  name: string;
  depositAmount: number;
  dailyIncome: number;
  dailyTasksRequired: number;
}

interface VipPlanListProps {
  plans: VipPlan[];
  currentVipLevel?: number;
}

export function VipPlanList({ plans, currentVipLevel }: VipPlanListProps) {
  return (
    <div className="space-y-4">
      {plans.map((plan) => (
        <VipCard
          key={plan.level}
          level={plan.level}
          name={plan.name}
          depositAmount={plan.depositAmount}
          dailyIncome={plan.dailyIncome}
          dailyTasksRequired={plan.dailyTasksRequired}
          isCurrent={plan.level === currentVipLevel}
        />
      ))}
    </div>
  );
}
