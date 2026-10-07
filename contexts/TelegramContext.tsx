"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  HapticImpactStyle,
  HapticNotificationType,
  TelegramThemeParams,
  TelegramWebApp,
  TelegramWebAppUser,
} from "@/types/telegram";

/**
 * React context over the official Telegram WebApp SDK.
 *
 * SECURITY: `initDataUnsafe` / `user` are for UI display ONLY.
 * Authentication must always use the raw `initData` string, which is verified
 * server-side (HMAC). Nothing from this context is treated as identity.
 */

const BRAND_BG = "#0B0713";

export interface TelegramContextValue {
  /** SDK object, or null outside Telegram / before the script loads. */
  webApp: TelegramWebApp | null;
  /** True once we know whether we are inside Telegram. */
  isReady: boolean;
  isTelegram: boolean;
  /** Raw initData string — the ONLY value safe to send to the backend. */
  initData: string;
  /** UI convenience only. NEVER for authentication. */
  initDataUnsafe: TelegramWebAppUser | null;
  /** Telegram user info for UI display only. */
  user: TelegramWebAppUser | null;
  colorScheme: "light" | "dark";
  themeParams: TelegramThemeParams | null;
  hapticFeedback: TelegramWebApp["HapticFeedback"];
  triggerHaptic(style: HapticImpactStyle | HapticNotificationType): void;
}

const defaultContext: TelegramContextValue = {
  webApp: null,
  isReady: false,
  isTelegram: false,
  initData: "",
  initDataUnsafe: null,
  user: null,
  colorScheme: "dark",
  themeParams: null,
  hapticFeedback: undefined,
  triggerHaptic: () => {},
};

const TelegramContext = createContext<TelegramContextValue>(defaultContext);

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const app = window.Telegram?.WebApp;

    if (!app) {
      // Opened in a regular browser — the app will show its "Open in
      // Telegram" experience. Not an error state.
      setIsReady(true);
      return;
    }

    app.ready();
    app.expand();

    // Blend the WebApp chrome with BIRRLY's dark violet identity.
    try {
      app.setHeaderColor?.(BRAND_BG);
      app.setBackgroundColor?.(BRAND_BG);
    } catch {
      // Older clients may not support these — non-fatal.
    }

    setWebApp(app);
    setIsReady(true);

    const onThemeChanged = () => {
      setWebApp((current) =>
        current
          ? { ...current, colorScheme: app.colorScheme, themeParams: { ...app.themeParams } }
          : current,
      );
    };
    app.onEvent("themeChanged", onThemeChanged);
    return () => app.offEvent("themeChanged", onThemeChanged);
  }, []);

  const triggerHaptic = useCallback(
    (style: HapticImpactStyle | HapticNotificationType) => {
      const haptics = webApp?.HapticFeedback;
      if (!haptics) return;
      if (
        style === "success" ||
        style === "warning" ||
        style === "error"
      ) {
        haptics.notificationOccurred(style);
      } else {
        haptics.impactOccurred(style);
      }
    },
    [webApp],
  );

  const value = useMemo<TelegramContextValue>(() => {
    if (!webApp) {
      return {
        ...defaultContext,
        isReady,
        webApp: null,
        triggerHaptic,
      };
    }
    // Outside a real Telegram client the SDK still exposes a WebApp shim
    // with an EMPTY initData — that is not a Telegram session.
    const insideTelegram = Boolean(webApp.initData);
    return {
      webApp,
      isReady,
      isTelegram: insideTelegram,
      initData: webApp.initData ?? "",
      initDataUnsafe: insideTelegram ? webApp.initDataUnsafe ?? null : null,
      user: insideTelegram ? webApp.initDataUnsafe ?? null : null,
      colorScheme: webApp.colorScheme ?? "dark",
      themeParams: webApp.themeParams ?? null,
      hapticFeedback: webApp.HapticFeedback,
      triggerHaptic,
    };
  }, [webApp, isReady, triggerHaptic]);

  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  );
}

export function useTelegram(): TelegramContextValue {
  return useContext(TelegramContext);
}
