import { cn } from "@/lib/utils/cn";

/** BIRRLY diamond mark — violet gradient with a soft glow. */
export function BirrlyLogo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="BIRRLY"
      className={cn("drop-shadow-[0_0_18px_rgba(139,92,246,0.45)]")}
    >
      <defs>
        <linearGradient id="birrly-gem" x1="12" y1="6" x2="52" y2="58">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="55%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#5B21B6" />
        </linearGradient>
        <linearGradient id="birrly-facet" x1="32" y1="18" x2="32" y2="46">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path
        d="M20 8h24l12 16-24 32L8 24 20 8Z"
        fill="url(#birrly-gem)"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M20 8l12 16 12-16" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      <path d="M8 24h48" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <path d="M32 24v32" stroke="url(#birrly-facet)" strokeWidth="1.5" />
    </svg>
  );
}
