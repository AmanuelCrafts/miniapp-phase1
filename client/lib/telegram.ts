/**
 * Thin wrapper around the Telegram WebApp object.
 *
 * Nothing here ever fabricates Telegram data: when the SDK is absent we report
 * `available: false` and the UI shows the "Open in Telegram" screen.
 */
import type { HapticFeedback, TelegramWebApp, TelegramPlatform } from '@/types/telegram';

export interface TelegramRuntime {
  webApp: TelegramWebApp | null;
  available: boolean;
  platform: TelegramPlatform;
  colorScheme: 'light' | 'dark';
  /** Raw `initData` string, empty when outside Telegram. */
  initData: string;
  version: string;
}

function readWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp ?? null;
}

/**
 * Side effect free snapshot of the Telegram environment.
 *
 * Safe to call during render and from `useSyncExternalStore`: it never calls
 * `ready()` or `expand()`, which are one-shot client notifications handled by
 * {@link initTelegram}.
 */
export function readTelegramRuntime(): TelegramRuntime {
  const webApp = readWebApp();

  if (!webApp) {
    return {
      webApp: null,
      available: false,
      platform: 'unknown',
      colorScheme: 'dark',
      initData: '',
      version: '',
    };
  }

  const platform = webApp.platform ?? 'unknown';
  const initData = webApp.initData ?? '';

  return {
    webApp,
    // A real client always provides a known platform or non-empty init data.
    available: platform !== 'unknown' || initData.length > 0,
    platform,
    colorScheme: webApp.colorScheme === 'light' ? 'light' : 'dark',
    initData,
    version: webApp.version ?? '',
  };
}

/**
 * Initialises the Mini App.
 *
 * `ready()` must be called once the app is ready so Telegram hides its own
 * loading indicator; `expand()` makes the Mini App fill the available space.
 */
export function initTelegram(): TelegramRuntime {
  const runtime = readTelegramRuntime();

  if (!runtime.webApp) return runtime;

  try {
    runtime.webApp.ready();
    runtime.webApp.expand();

    // Header colour follows the Mini App background.
    if (typeof runtime.webApp.setHeaderColor === 'function') {
      runtime.webApp.setHeaderColor('secondary_bg_color');
    }

    // Prevents an accidental swipe from closing the app mid interaction.
    if (typeof runtime.webApp.disableVerticalSwipes === 'function') {
      runtime.webApp.disableVerticalSwipes();
    }
  } catch {
    // A partially implemented WebView must not break the app; verification
    // still happens server side.
  }

  return runtime;
}

/** Reads `initData` without side effects. */
export function readInitData(): string {
  return readWebApp()?.initData ?? '';
}

/**
 * Whether the app appears to be running inside a Telegram client.
 *
 * Both signals have to be absent for a definite "no": no SDK object and no init
 * data. A real client always provides at least one of them.
 */
export function isInsideTelegram(): boolean {
  return readTelegramRuntime().available;
}

/**
 * Subscribes to external Telegram changes.
 *
 * The SDK does not expose change events for platform or colour scheme, so this
 * only fires on the window `load` event (when a late SDK finishes loading) and
 * on Telegram's own viewport/expand events if present.
 */
export function subscribeToTelegram(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;

  window.addEventListener('load', onStoreChange);
  window.addEventListener('focus', onStoreChange);

  return () => {
    window.removeEventListener('load', onStoreChange);
    window.removeEventListener('focus', onStoreChange);
  };
}

type HapticStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
type HapticNotification = 'error' | 'success' | 'warning';

function haptics(): HapticFeedback | undefined {
  return readWebApp()?.HapticFeedback;
}

/** Fires a haptic impact where supported; silently ignored elsewhere. */
export function hapticImpact(style: HapticStyle = 'light'): void {
  try {
    haptics()?.impactOccurred(style);
  } catch {
    // Unsupported client.
  }
}

/** Fires a haptic notification where supported. */
export function hapticNotification(type: HapticNotification): void {
  try {
    haptics()?.notificationOccurred(type);
  } catch {
    // Unsupported client.
  }
}

export function hapticSelection(): void {
  try {
    haptics()?.selectionChanged();
  } catch {
    // Unsupported client.
  }
}

/** Closes the Mini App. */
export function closeMiniApp(): void {
  try {
    readWebApp()?.close();
  } catch {
    // Unsupported client.
  }
}
