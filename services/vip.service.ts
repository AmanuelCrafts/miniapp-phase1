import "server-only";
import { connectDB } from "@/lib/mongodb";
import VIPPlan from "@/models/VIPPlan";
import type { PublicUser } from "@/types/auth";
import type { CurrentVipResponse, VipPlanDto } from "@/types/vip";

/** Active VIP plans sorted by level — MongoDB is the source of truth. */
export async function listActivePlans(): Promise<VipPlanDto[]> {
  await connectDB();
  const plans = await VIPPlan.find({ isActive: true })
    .sort({ level: 1 })
    .lean();

  return plans.map((plan) => ({
    level: plan.level,
    name: plan.name,
    depositAmount: plan.depositAmount,
    dailyIncome: plan.dailyIncome,
    dailyTasksRequired: plan.dailyTasksRequired,
  }));
}

/**
 * Resolve the current VIP for an authenticated user. VIP state comes from the
 * user document (server-side) — never from the client.
 */
export async function getCurrentVipForUser(
  user: PublicUser,
): Promise<CurrentVipResponse> {
  if (!user.hasVip || user.vipLevel === null) {
    return { hasVip: false, vip: null };
  }

  await connectDB();
  const plan = await VIPPlan.findOne({ level: user.vipLevel }).lean();
  if (!plan) {
    return { hasVip: false, vip: null };
  }

  return {
    hasVip: true,
    vip: {
      level: plan.level,
      name: plan.name,
      depositAmount: plan.depositAmount,
      dailyIncome: plan.dailyIncome,
      dailyTasksRequired: plan.dailyTasksRequired,
    },
  };
}
