import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { TelegramProvider } from '@/components/TelegramProvider';
import { AuthProvider } from '@/components/AuthProvider';
import { Navigation } from '@/components/Navigation';
import './globals.css';

export const metadata: Metadata = {
  title: 'Birrly',
  description: 'Telegram Mini App',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-text antialiased">
        <TelegramProvider>
          <AuthProvider>
            {children}
            <Navigation />
          </AuthProvider>
        </TelegramProvider>
      </body>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
    </html>
  );
}
