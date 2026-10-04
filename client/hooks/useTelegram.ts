'use client';

import { useSyncExternalStore } from 'react';

import { readTelegramRuntime, subscribeToTelegram, type TelegramRuntime } from '@/lib/telegram';

const SERVER_RUNTIME: TelegramRuntime = {
  webApp: null,
  available: false,
  platform: 'unknown',
  colorScheme: 'dark',
  initData: '',
  version: '',
};

/**
 * Gives components access to the Telegram runtime (platform, colour scheme,
 * haptics) without every one of them touching `window`.
 *
 * Uses `useSyncExternalStore` so the server render and the first client render
 * agree, avoiding a hydration mismatch. Reading the runtime is deliberately
 * side effect free - `ready()` and `expand()` are called once by the auth
 * provider, not on every read.
 */
export function useTelegram(): TelegramRuntime {
  return useSyncExternalStore(subscribeToTelegram, readTelegramRuntime, () => SERVER_RUNTIME);
}
