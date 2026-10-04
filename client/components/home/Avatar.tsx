'use client';

import Image from 'next/image';

import { cn } from '@/lib/cn';
import type { PublicUser } from '@/types/api';

interface AvatarProps {
  user: Pick<PublicUser, 'firstName' | 'avatarUrl'>;
  size?: number;
  className?: string;
}

/**
 * Telegram profile photo with a graceful fallback to initials, so a missing or
 * unreachable `photo_url` never breaks the layout.
 */
export function Avatar({ user, size = 96, className }: AvatarProps): React.JSX.Element {
  const initials = user.firstName.slice(0, 2).toUpperCase();
  const dimension = { width: size, height: size };

  if (!user.avatarUrl) {
    return (
      <div
        className={cn(
          'grid shrink-0 place-items-center rounded-full bg-linear-to-br from-violet-500 to-purple-700',
          'text-xl font-bold text-white shadow-lg shadow-violet-900/40',
          className,
        )}
        style={{ width: size, height: size }}
        aria-label={`${user.firstName} avatar`}
      >
        {initials}
      </div>
    );
  }

  return (
    <Image
      {...dimension}
      src={user.avatarUrl}
      alt={`${user.firstName} profile photo`}
      className={cn('shrink-0 rounded-full object-cover ring-2 ring-violet-500/40', className)}
      unoptimized
    />
  );
}
