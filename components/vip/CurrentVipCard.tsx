interface CurrentVipCardProps {
  vip: {
    level: number;
    name: string;
    depositAmount: number;
    dailyIncome: number;
    dailyTasksRequired: number;
  } | null;
}

function formatETB(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CurrentVipCard({ vip }: CurrentVipCardProps) {
  if (!vip) {
    return (
      <div className="rounded-2xl border border-white/5 bg-surface p-5">
        <p className="text-text-muted text-sm">No active VIP plan</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5 space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-lg">
          💎
        </div>
        <div>
          <h3 className="text-lg font-semibold">{vip.name}</h3>
          <p className="text-primary-light text-xs">✓ Active</p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-text-muted text-sm">Deposit</span>
          <span className="font-bold">{formatETB(vip.depositAmount)} ETB</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-muted text-sm">Daily Income</span>
          <span className="text-green-400 font-semibold">+{formatETB(vip.dailyIncome)} ETB / day</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-muted text-sm">Daily Tasks</span>
          <span className="text-sm">🎯 {vip.dailyTasksRequired} tasks</span>
        </div>
      </div>
    </div>
  );
}
