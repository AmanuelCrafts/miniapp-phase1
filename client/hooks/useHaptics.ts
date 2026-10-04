/**
 * Haptics hook. Wraps the Telegram HapticFeedback API and degrades silently on
 * clients that do not support it (web, desktop).
 */
'use client';

import { useCallback } from 'react';

import { hapticImpact, hapticNotification, hapticSelection } from '@/lib/telegram';

export interface Haptics {
  impact: (style?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  success: () => void;
  error: () => void;
  warning: () => void;
  select: () => void;
}

export function useHaptics(): Haptics {
  const impact = useCallback((style: Parameters<typeof hapticImpact>[0] = 'light') => {
    hapticImpact(style);
  }, []);

  const success = useCallback(() => hapticNotification('success'), []);
  const error = useCallback(() => hapticNotification('error'), []);
  const warning = useCallback(() => hapticNotification('warning'), []);
  const select = useCallback(() => hapticSelection(), []);

  return { impact, success, error, warning, select };
}
