export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export interface TelegramWebAppInitData {
  user?: TelegramUser;
  query_id?: string;
  auth_date?: number;
  hash?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: TelegramWebAppInitData;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  backgroundColor?: string;
  secondaryBackgroundColor?: string;
  ready: () => void;
  expand: () => void;
  close: () => void;
  onEvent: (eventType: string, callback: () => void) => void;
  offEvent: (eventType: string, callback: () => void) => void;
}

export interface TelegramContextValue {
  isTelegram: boolean;
  isReady: boolean;
  initData: string;
  initDataUnsafe: TelegramWebAppInitData;
  webApp: TelegramWebApp | null;
  colorScheme: 'light' | 'dark';
}
