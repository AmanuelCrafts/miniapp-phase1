"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Telegram profile photo with a graceful initials fallback. Uses a plain
 * <img> so any Telegram CDN host works without image config coupling.
 */
export function Avatar({
  firstName,
  lastName,
  avatarUrl,
  size = "md",
  className,
}: {
  firstName: string;
  lastName?: string | null;
  avatarUrl?: string | null;
  size?: "md" | "lg";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  const initials = `${firstName.charAt(0)}${lastName?.charAt(0) ?? ""}`
    .toUpperCase()
    .slice(0, 2);

  const dimension = size === "lg" ? "h-20 w-20 text-2xl" : "h-11 w-11 text-sm";

  return (
    <div
      className={cn(
        "relative flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-iris-500/50 to-iris-600/30 font-bold text-ink ring-1 ring-white/10",
        dimension,
        className,
      )}
      aria-hidden="true"
    >
      {avatarUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{initials || "B"}</span>
      )}
    </div>
  );
}
