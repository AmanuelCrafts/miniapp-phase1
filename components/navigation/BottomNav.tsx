"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Flame, Home, Target, User, Wallet } from "lucide-react";
import { useTelegram } from "@/contexts/TelegramContext";
import { cn } from "@/lib/utils/cn";

const items = [
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/earn", label: "Earn", icon: Flame, exact: false },
  { href: "/wallet", label: "Wallet", icon: Wallet, exact: false },
  { href: "/plans", label: "Plans", icon: Target, exact: false },
  { href: "/profile", label: "Profile", icon: User, exact: false },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { triggerHaptic } = useTelegram();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-app border-t border-white/[0.06] bg-night/85 backdrop-blur-xl"
    >
      <ul className="grid grid-cols-5 px-1 pb-[max(env(safe-area-inset-bottom),10px)] pt-1.5">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  if (!active) triggerHaptic("light");
                  // Prefetch-free push keeps navigation snappy in the webview.
                  router.prefetch(href);
                }}
                className={cn(
                  "tap flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 transition-colors duration-200",
                  active
                    ? "text-iris-300"
                    : "text-ink-faint hover:text-ink-muted",
                )}
              >
                <Icon
                  className={cn(
                    "h-[22px] w-[22px] transition-all duration-200",
                    active &&
                      "drop-shadow-[0_0_10px_rgba(167,139,250,0.55)] scale-105",
                  )}
                  strokeWidth={active ? 2.4 : 2}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "text-[10px] font-semibold tracking-wide",
                    active && "text-ink-dim",
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
