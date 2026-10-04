/**
 * Telegram WebApp SDK types.
 *
 * Only the surface this app actually uses is declared. The official types come
 * from `@twa-dev/sdk`, but a hand written subset keeps the bundle small and the
 * contract explicit.
 */

export type TelegramPlatform =
  | 'ios'
  | 'android'
  | 'macos'
  | 'windows'
  | 'linux'
  | 'android_x'
  | 'web'
  | 'web_android'
  | 'web_ios'
  | 'unknown';

export interface HapticFeedback {
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
  notificationOccurred(type: 'error' | 'success' | 'warning'): void;
  selectionChanged(): void;
}

export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  accent_text_color?: string;
  section_bg_color?: string;
  section_header_text_color?: string;
  subtitle_text_color?: string;
  destructive_text_color?: string;
}

export interface BackButton {
  isVisible: boolean;
  show(): void;
  hide(): void;
  onClick(handler: () => void): void;
  offClick(handler: () => void): void;
}

export interface MainButton {
  text: string;
  isVisible: boolean;
  show(): void;
  hide(): void;
  setText(text: string): void;
  onClick(handler: () => void): void;
  offClick(handler: () => void): void;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
      language_code?: string;
      is_premium?: boolean;
      allows_write_to_pm?: boolean;
    };
    start_param?: string;
    auth_date?: number;
    hash?: string;
    [key: string]: unknown;
  };

  version: string;
  platform: TelegramPlatform;
  colorScheme: 'light' | 'dark';
  themeParams: TelegramThemeParams;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;

  ready(): void;
  expand(): void;
  close(): void;
  setHeaderColor(color: keyof TelegramThemeParams | string): void;
  setBackgroundColor(color: keyof TelegramThemeParams | string): void;
  enableClosingConfirmation(): void;
  disableVerticalSwipes?(): void;
  requestFullscreen?(): void;
  isVersionAtLeast?(version: string): boolean;

  HapticFeedback?: HapticFeedback;
  BackButton?: BackButton;
  MainButton?: MainButton;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export {};
