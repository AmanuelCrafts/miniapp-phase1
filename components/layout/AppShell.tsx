import type { ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { BottomNav } from "@/components/navigation/BottomNav";
import type { PublicUser } from "@/types/auth";

/**
 * Centered, mobile-first shell (max 480px) so the app feels like a native
 * Telegram Mini App even in a desktop browser.
 */
export function AppShell({
  user,
  children,
}: {
  user: PublicUser;
  children: ReactNode;
}) {
  return (
    <AuthProvider initialUser={user}>
      <div className="mx-auto flex min-h-dvh w-full max-w-app flex-col">
        <main className="flex-1 pb-28">{children}</main>
        <BottomNav />
      </div>
    </AuthProvider>
  );
}
