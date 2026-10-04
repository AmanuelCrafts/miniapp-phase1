'use client';

import { Avatar } from '@/components/home/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthContext } from '@/hooks/useAuth';
import { useHaptics } from '@/hooks/useHaptics';
import type { PublicUser } from '@/types/api';

/**
 * Phase 1 home screen: proves authentication works by showing the verified
 * Telegram profile. No balance, VIP, tasks or other Phase 2 surfaces here.
 */
export function ProfileCard({ user }: { user: PublicUser }): React.JSX.Element {
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ');

  return (
    <Card className="flex flex-col items-center gap-4 text-center">
      <Avatar user={user} size={96} />

      <div className="flex flex-col items-center gap-1">
        <h1 className="text-xl font-bold text-tg-text">{displayName}</h1>
        {user.username ? (
          <a
            href={`https://t.me/${user.username}`}
            target="_blank"
            rel="noreferrer noopener"
            className="text-sm font-medium text-tg-link"
          >
            @{user.username}
          </a>
        ) : (
          <span className="text-sm text-tg-hint">No username</span>
        )}
      </div>

      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
        <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
        Authenticated
      </span>
    </Card>
  );
}

/** Reads the authenticated user from context. Only rendered behind AuthGate. */
export function HomeContent(): React.JSX.Element {
  const { user, signOut } = useAuthContext();

  if (!user) return <></>;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-4 pt-8 pb-10 safe-bottom">
      <ProfileCard user={user} />

      <Card className="flex flex-col items-center gap-2 text-center">
        <p className="text-base font-semibold text-tg-text">👋 Welcome, {user.firstName}</p>
        {user.username ? <p className="text-sm text-tg-hint">@{user.username}</p> : null}
        <p className="text-sm text-tg-hint">You are successfully authenticated.</p>
      </Card>

      <section className="rounded-3xl border border-dashed border-tg-hint/20 p-4">
        <h2 className="mb-2 text-xs font-semibold tracking-wide text-tg-hint uppercase">
          Phase 1 verified
        </h2>
        <ul className="space-y-1.5 text-sm text-tg-text/90">
          <li className="flex items-center gap-2">
            <span className="text-emerald-400" aria-hidden="true">
              ✓
            </span>
            Telegram initData verified server side
          </li>
          <li className="flex items-center gap-2">
            <span className="text-emerald-400" aria-hidden="true">
              ✓
            </span>
            Secure HTTP-only session cookie
          </li>
          <li className="flex items-center gap-2">
            <span className="text-emerald-400" aria-hidden="true">
              ✓
            </span>
            Account identity loaded from MongoDB
          </li>
        </ul>
      </section>

      <div className="mt-auto">
        <LogoutButton onSignOut={signOut} />
      </div>
    </main>
  );
}

function LogoutButton({ onSignOut }: { onSignOut: () => Promise<void> }): React.JSX.Element {
  const haptics = useHaptics();

  return (
    <Button
      variant="secondary"
      fullWidth
      className="border-tg-destructive/25 text-tg-destructive"
      onClick={() => {
        haptics.warning();
        void onSignOut();
      }}
    >
      Log out
    </Button>
  );
}
