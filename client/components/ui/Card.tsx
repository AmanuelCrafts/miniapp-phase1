import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
}

/** Rounded, elevated surface used across the app. */
export function Card({ children, className }: CardProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-3xl border border-tg-hint/12 bg-tg-secondary/70 p-5',
        'shadow-lg shadow-black/20 backdrop-blur-sm',
        className,
      )}
    >
      {children}
    </div>
  );
}
