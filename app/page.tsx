import {
  BalanceCard,
} from "@/components/home/BalanceCard";
import { CurrentVipCard } from "@/components/home/CurrentVipCard";
import { DailyTaskCard } from "@/components/home/DailyTaskCard";
import { HomeHeader } from "@/components/home/HomeHeader";
import { PlansTeaser } from "@/components/home/PlansTeaser";
import { StreakCard } from "@/components/home/StreakCard";
import { getCurrentUser } from "@/lib/auth/session";
import { getCurrentVipForUser, listActivePlans } from "@/services/vip.service";
import type { StreakWeek } from "@/components/home/StreakCard";

/**
 * HOME — hierarchy per product spec:
 *   1. Current VIP   2. Balance   3. Streak   4. Daily task   5. VIP plans
 * Only real functionality renders; unbuilt systems show tasteful states.
 */

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) return null; // layout renders the auth gate

  const [currentVip, plans] = await Promise.all([
    getCurrentVipForUser(user),
    listActivePlans(),
  ]);

  // Streak system is not implemented yet — component renders the zero-state.
  const week: StreakWeek | null = null;

  return (
    <div className="mx-auto w-full max-w-app px-4 pb-6 pt-6">
      <HomeHeader user={user} />

      <div className="space-y-4">
        <CurrentVipCard currentVip={currentVip} />
        <BalanceCard />
        <StreakCard week={week} />
        <DailyTaskCard />
        <PlansTeaser plans={plans} />
      </div>
    </div>
  );
}
