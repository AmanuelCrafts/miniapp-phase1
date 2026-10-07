'use client';

import { useTelegram } from '@/components/TelegramProvider';

export default function Home() {
  const { isTelegram, isReady, initDataUnsafe } = useTelegram();

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

  const firstName = initDataUnsafe.user?.first_name;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">💎 Birrly</h1>
          <p className="text-text-muted text-sm">Telegram Mini App</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-surface p-6 space-y-3">
          <p className="text-green-400 text-sm font-medium">Telegram connected ✓</p>
          {firstName && (
            <p className="text-text text-lg">Welcome, {firstName}</p>
          )}
        </div>
      </div>
    </main>
  );
}
