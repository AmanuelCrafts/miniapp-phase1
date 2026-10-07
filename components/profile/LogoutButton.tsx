"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTelegram } from "@/contexts/TelegramContext";

export function LogoutButton() {
  const router = useRouter();
  const { triggerHaptic } = useTelegram();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    if (pending) return;
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
      triggerHaptic("medium");
      router.refresh(); // server re-render → session gone → auth gate
    } catch {
      setPending(false);
    }
  }

  return (
    <Button
      variant="danger"
      size="lg"
      className="w-full"
      onClick={handleLogout}
      disabled={pending}
      aria-busy={pending}
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      {pending ? "Logging out…" : "Log out"}
    </Button>
  );
}
