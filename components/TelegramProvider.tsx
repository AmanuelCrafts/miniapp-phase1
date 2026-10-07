'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { TelegramContextValue, TelegramWebApp } from '@/types/telegram';

const TelegramContext = createContext<TelegramContextValue>({
  isTelegram: false,
  isReady: false,
  initData: '',
  initDataUnsafe: {},
  webApp: null,
  colorScheme: 'dark',
});

export function useTelegram(): TelegramContextValue {
  return useContext(TelegramContext);
}

function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp ?? null;
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);

  useEffect(() => {
    const tg = getTelegramWebApp();

    if (!tg) {
      setIsReady(true);
      return;
    }

    tg.ready();
    tg.expand();
    setWebApp(tg);
    setIsReady(true);
  }, []);

  const value: TelegramContextValue = {
    isTelegram: webApp !== null,
    isReady,
    initData: webApp?.initData ?? '',
    initDataUnsafe: webApp?.initDataUnsafe ?? {},
    webApp,
    colorScheme: webApp?.colorScheme ?? 'dark',
  };

  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>;
}
