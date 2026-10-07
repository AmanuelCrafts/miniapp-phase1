import { Wallet } from "lucide-react";
import { WalletScreen } from "@/components/wallet/WalletScreen";

/** 💰 WALLET — ledger-based wallet arrives in a later phase. */
export default function WalletPage() {
  return (
    <div className="mx-auto w-full max-w-app px-4 pb-6 pt-6">
      <header className="mb-5">
        <p className="eyebrow flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5 text-mint" aria-hidden="true" />
          Wallet
        </p>
        <h1 className="mt-1 text-[22px] font-extrabold tracking-tight text-ink">
          Your money hub
        </h1>
      </header>
      <WalletScreen />
    </div>
  );
}
