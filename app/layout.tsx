import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { AuthGate } from "@/components/auth/AuthGate";
import { SessionSync } from "@/components/auth/SessionSync";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentUser } from "@/lib/auth/session";
import { TelegramProvider } from "@/contexts/TelegramContext";

export const metadata: Metadata = {
  title: "BIRRLY",
  description:
    "BIRRLY — a gamified Telegram Mini App. Build streaks, level up your VIP, and earn rewards.",
};

export const viewport: Viewport = {
  themeColor: "#0B0713",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * The layout resolves the session server-side:
 *  - authenticated → app shell + pages
 *  - no session     → AuthGate (Telegram handshake / "Open in Telegram")
 */
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className="dark">
      <body className="min-h-dvh">
        {/* Official Telegram WebApp SDK — must load before the app boots */}
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <TelegramProvider>
          {user ? (
            <AppShell user={user}>
              <SessionSync />
              {children}
            </AppShell>
          ) : (
            <AuthGate />
          )}
        </TelegramProvider>
      </body>
    </html>
  );
}
