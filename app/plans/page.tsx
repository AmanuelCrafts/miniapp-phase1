'use client';

import { useEffect, useState } from 'react';
import { VipPlanList } from '@/components/vip/VipPlanList';
import { CurrentVipCard } from '@/components/vip/CurrentVipCard';

interface VipPlan {
  level: number;
  name: string;
  depositAmount: number;
  dailyIncome: number;
  dailyTasksRequired: number;
}

interface CurrentVipResponse {
  hasVip: boolean;
  vip: {
    level: number;
    name: string;
    depositAmount: number;
    dailyIncome: number;
    dailyTasksRequired: number;
  } | null;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<VipPlan[]>([]);
  const [currentVip, setCurrentVip] = useState<CurrentVipResponse['vip']>(null);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isLoadingVip, setIsLoadingVip] = useState(true);
  const [plansError, setPlansError] = useState(false);
  const [vipError, setVipError] = useState(false);

  useEffect(() => {
    fetch('/api/vip/plans')
      .then((res) => res.json())
      .then((data) => {
        setPlans(data.plans);
        setIsLoadingPlans(false);
      })
      .catch(() => {
        setPlansError(true);
        setIsLoadingPlans(false);
      });
  }, []);

  useEffect(() => {
    fetch('/api/vip/current')
      .then((res) => {
        if (res.ok) return res.json();
        return { hasVip: false, vip: null };
      })
      .then((data) => {
        setCurrentVip(data.vip);
        setIsLoadingVip(false);
      })
      .catch(() => {
        setVipError(true);
        setIsLoadingVip(false);
      });
  }, []);

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-sm space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-center">💎 VIP PLANS</h1>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Your Current VIP</h2>
          {isLoadingVip ? (
            <div className="rounded-2xl border border-white/5 bg-surface p-5">
              <p className="text-text-muted text-sm">Loading...</p>
            </div>
          ) : vipError ? (
            <div className="rounded-2xl border border-white/5 bg-surface p-5 space-y-3">
              <p className="text-red-400 text-sm">Unable to load your current VIP.</p>
              <button
                onClick={() => window.location.reload()}
                className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white"
              >
                Retry
              </button>
            </div>
          ) : (
            <CurrentVipCard vip={currentVip} />
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">All Plans</h2>
          {isLoadingPlans ? (
            <div className="rounded-2xl border border-white/5 bg-surface p-5">
              <p className="text-text-muted text-sm">Loading plans...</p>
            </div>
          ) : plansError ? (
            <div className="rounded-2xl border border-white/5 bg-surface p-5 space-y-3">
              <p className="text-red-400 text-sm">Unable to load VIP plans.</p>
              <button
                onClick={() => window.location.reload()}
                className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white"
              >
                Retry
              </button>
            </div>
          ) : (
            <VipPlanList plans={plans} currentVipLevel={currentVip?.level} />
          )}
        </div>
      </div>
    </main>
  );
}
