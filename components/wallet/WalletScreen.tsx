import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  History,
  Wallet,
} from "lucide-react";
import {
  ComingSoonPanel,
  EmptyState,
  RoadmapRow,
} from "@/components/ui/ComingSoon";

/** 💰 WALLET — ledger-ready structure. No balances are fabricated. */
export function WalletScreen() {
  return (
    <div className="space-y-4">
      <ComingSoonPanel
        icon={<Wallet className="h-6 w-6" aria-hidden="true" />}
        title="Wallet coming soon"
        message="Your balance, deposits and withdrawals will live here. BIRRLY never shows numbers that don't exist yet."
      />

      <div className="card animate-fade-up p-4 [animation-delay:100ms]">
        <p className="eyebrow mb-3">Arriving with the wallet</p>
        <div className="space-y-2">
          <RoadmapRow
            icon={<Banknote className="h-4 w-4" aria-hidden="true" />}
            label="Available balance"
          />
          <RoadmapRow
            icon={<ArrowDownToLine className="h-4 w-4" aria-hidden="true" />}
            label="Deposits"
          />
          <RoadmapRow
            icon={<ArrowUpFromLine className="h-4 w-4" aria-hidden="true" />}
            label="Withdrawals"
          />
          <RoadmapRow
            icon={<History className="h-4 w-4" aria-hidden="true" />}
            label="Transaction history"
            status="later"
          />
        </div>
      </div>

      <div className="animate-fade-up [animation-delay:160ms]">
        <EmptyState
          icon={<History className="h-5 w-5" aria-hidden="true" />}
          title="No transactions"
          message="Your transaction history will appear here."
        />
      </div>
    </div>
  );
}
