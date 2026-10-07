'use client';

import { useAuth } from '@/components/AuthProvider';
import { useTelegram } from '@/components/TelegramProvider';

export default function Home() {
  const { user, isAuthenticated, isLoading, isTelegram, login } = useAuth();
  const { isReady } = useTelegram();

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
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">💎 Birrly</h1>
          <p className="text-text-muted text-sm">Telegram Mini App</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-surface p-6 space-y-3">
          <p className="text-green-400 text-sm font-medium">Telegram connected ✓</p>
          <p className="text-text text-lg">Welcome, {user?.first_name} 👋</p>
          <p className="text-text-muted text-xs">Your account is secure.</p>
        </div>
      </div>
    </main>
  );
}
