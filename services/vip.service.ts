import { VIPPlanModel } from '@/models/VIPPlan';
import { UserModel } from '@/models/User';
import type { IVIPPlan } from '@/models/VIPPlan';

export async function getActiveVipPlans(): Promise<IVIPPlan[]> {
  return VIPPlanModel.find({ isActive: true }).sort({ level: 1 }).lean();
}

export async function getCurrentUserVip(userId: string): Promise<IVIPPlan | null> {
  const user = await UserModel.findById(userId).populate('currentVipPlan').lean();
  if (!user || !user.currentVipPlan) return null;
  return user.currentVipPlan as unknown as IVIPPlan;
}

export async function getVipPlanByLevel(level: number): Promise<IVIPPlan | null> {
  return VIPPlanModel.findOne({ level, isActive: true }).lean();
}
