import { NextResponse } from 'next/server';
import { getActiveVipPlans } from '@/services/vip.service';

export async function GET() {
  try {
    const plans = await getActiveVipPlans();

    return NextResponse.json({
      plans: plans.map((plan) => ({
        level: plan.level,
        name: plan.name,
        depositAmount: plan.depositAmount,
        dailyIncome: plan.dailyIncome,
        dailyTasksRequired: plan.dailyTasksRequired,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: 'Unable to load VIP plans' },
      { status: 500 },
    );
  }
}
