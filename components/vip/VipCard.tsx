interface VipCardProps {
  level: number;
  name: string;
  depositAmount: number;
  dailyIncome: number;
  dailyTasksRequired: number;
  isCurrent?: boolean;
}

function formatETB(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function VipCard({ level, name, depositAmount, dailyIncome, dailyTasksRequired, isCurrent }: VipCardProps) {
  return (
    <div className="relative rounded-2xl border border-white/5 bg-surface p-5 space-y-4">
      {isCurrent && (
        <div className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-1 text-xs font-medium text-white">
          ✓ CURRENT PLAN
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-lg">
          💎
        </div>
        <div>
          <h3 className="text-lg font-semibold">{name}</h3>
          <p className="text-text-muted text-xs">Level {level}</p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-text-muted text-sm">Deposit</span>
          <span className="text-lg font-bold">{formatETB(depositAmount)} ETB</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-muted text-sm">Daily Income</span>
          <span className="text-green-400 font-semibold">+{formatETB(dailyIncome)} ETB / day</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-muted text-sm">Daily Tasks</span>
          <span className="text-sm">🎯 {dailyTasksRequired} tasks</span>
        </div>
      </div>
    </div>
  );
}
