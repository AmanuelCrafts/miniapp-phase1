'use client';

import { cn } from '@/lib/cn';

export function Spinner({ className }: { className?: string }): React.JSX.Element {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block size-5 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
    />
  );
}
