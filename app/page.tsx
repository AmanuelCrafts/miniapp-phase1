'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useTelegram } from '@/components/TelegramProvider';
import { CurrentVipCard } from '@/components/vip/CurrentVipCard';

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

export default function Home() {
  const { user, isAuthenticated, isLoading, isTelegram, login } = useAuth();
  const { isReady } = useTelegram();
  const [currentVip, setCurrentVip] = useState<CurrentVipResponse['vip']>(null);
  const [isLoadingVip, setIsLoadingVip] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/vip/current')
        .then((res) => {
          if (res.ok) return res.json();
          return { hasVip: false, vip: null };
        })
        .then((data) => {
          setCurrentVip(data.vip);
          setIsLoadingVip(false);
        })
        .catch(() => setIsLoadingVip(false));
    }
  }, [isAuthenticated]);

  if (!isReady) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">💎 Birrly</h1>
            <p className="text-text-muted text-sm">Telegram Mini App</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-surface p-6">
            <p className="text-text-muted text-sm">Initializing Telegram...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!isTelegram) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">💎 Birrly</h1>
            <p className="text-text-muted text-sm">Telegram Mini App</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-surface p-6">
            <p className="text-text-muted text-sm">
              Open this app inside Telegram to continue.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">💎 Birrly</h1>
            <p className="text-text-muted text-sm">Telegram Mini App</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-surface p-6">
            <p className="text-text-muted text-sm">Connecting securely...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">💎 Birrly</h1>
            <p className="text-text-muted text-sm">Telegram Mini App</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-surface p-6 space-y-4">
            <p className="text-red-400 text-sm">Authentication failed.</p>
            <button
              onClick={login}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 pb-24">
      <div className="mx-auto max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">💎 Birrly</h1>
          <p className="text-text-muted text-sm">Welcome, {user?.first_name} 👋</p>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Your Current VIP</h2>
          {isLoadingVip ? (
            <div className="rounded-2xl border border-white/5 bg-surface p-5">
              <p className="text-text-muted text-sm">Loading...</p>
            </div>
          ) : (
            <CurrentVipCard vip={currentVip} />
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">VIP Plans</h2>
          <Link
            href="/plans"
            className="block rounded-2xl border border-white/5 bg-surface p-4 text-center text-sm font-medium text-primary-light transition-colors hover:bg-primary/10"
          >
            View all 8 plans →
          </Link>
        </div>
      </div>
    </main>
  );
}
