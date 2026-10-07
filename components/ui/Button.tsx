import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "tap inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-iris-500 to-iris-600 text-white shadow-glow hover:from-iris-400 hover:to-iris-500",
  secondary:
    "border border-white/[0.09] bg-white/[0.05] text-ink hover:bg-white/[0.09]",
  ghost: "text-ink-muted hover:text-ink hover:bg-white/[0.05]",
  danger:
    "border border-red-400/25 bg-red-400/10 text-red-300 hover:bg-red-400/15",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-xs",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-sm",
};

export function buttonStyles(
  variant: Variant = "primary",
  size: Size = "md",
  className?: string,
): string {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}) {
  return (
    <button className={buttonStyles(variant, size, className)} {...props}>
      {children}
    </button>
  );
}
