'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { useHaptics } from '@/hooks/useHaptics';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
  children: ReactNode;
}

const VARIANT_STYLES: Record<Variant, string> = {
  primary:
    'bg-linear-to-b from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-900/40 hover:from-violet-400 hover:to-purple-500 active:scale-[0.98]',
  secondary:
    'bg-tg-secondary text-tg-text border border-tg-hint/15 hover:bg-tg-hint/10 active:scale-[0.98]',
  ghost: 'bg-transparent text-tg-link hover:bg-tg-hint/10 active:scale-[0.98]',
  danger: 'bg-tg-destructive/15 text-tg-destructive hover:bg-tg-destructive/25 active:scale-[0.98]',
};

export function Button({
  variant = 'primary',
  fullWidth = false,
  className,
  children,
  onClick,
  type = 'button',
  ...rest
}: ButtonProps): React.JSX.Element {
  const haptics = useHaptics();

  return (
    <button
      type={type}
      onClick={(event) => {
        haptics.impact('light');
        onClick?.(event);
      }}
      className={cn(
        // 44px+ touch target, thumb friendly.
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-[15px] font-semibold',
        'transition-all duration-200 outline-none select-none',
        'focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-tg-bg',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANT_STYLES[variant],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
