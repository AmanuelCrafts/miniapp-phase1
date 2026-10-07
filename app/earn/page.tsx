import { Flame } from "lucide-react";
import { EarnScreen } from "@/components/earn/EarnScreen";

/** 🔥 EARN — gamification engine arrives in a later phase. */
export default function EarnPage() {
  return (
    <div className="mx-auto w-full max-w-app px-4 pb-6 pt-6">
      <header className="mb-5">
        <p className="eyebrow flex items-center gap-1.5">
          <Flame className="h-3.5 w-3.5 text-flame" aria-hidden="true" />
          Earn
        </p>
        <h1 className="mt-1 text-[22px] font-extrabold tracking-tight text-ink">
          Earn rewards
        </h1>
      </header>
      <EarnScreen />
    </div>
  );
}
