import type { Metadata, Viewport } from 'next';
import Script from 'next/script';

import './globals.css';

export const metadata: Metadata = {
  title: 'Rewards',
  description: 'Gamified rewards platform for Telegram',
  // A Mini App is embedded in a WebView, so indexing it is pointless and
  // referrer leakage is undesirable.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Matches the dark-first violet palette; Telegram may override this too.
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0b0a12' },
    { media: '(prefers-color-scheme: light)', color: '#f7f5ff' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
  return (
    <html lang="en" data-color-scheme="dark" suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        {/*
          Loads the Telegram WebApp SDK before hydration so `window.Telegram`
          already exists when the auth provider runs. The app does not depend on
          this script loading: outside Telegram it falls back to the
          "Open in Telegram" screen.
        */}
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
