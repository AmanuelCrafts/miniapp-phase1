import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getCurrentUserVip } from '@/services/vip.service';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const vip = await getCurrentUserVip(user._id.toString());

    if (!vip) {
      return NextResponse.json({ hasVip: false, vip: null });
    }

    return NextResponse.json({
      hasVip: true,
      vip: {
        level: vip.level,
        name: vip.name,
        depositAmount: vip.depositAmount,
        dailyIncome: vip.dailyIncome,
        dailyTasksRequired: vip.dailyTasksRequired,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Unable to load your current VIP' },
      { status: 500 },
    );
  }
}
