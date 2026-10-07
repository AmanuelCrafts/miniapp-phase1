import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("card p-4", className)}>{children}</div>;
}

/** Standard section header row: icon + uppercase label + optional right slot. */
export function SectionLabel({
  icon,
  children,
  right,
}: {
  icon?: ReactNode;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="eyebrow flex items-center gap-1.5">
        {icon}
        {children}
      </span>
      {right}
    </div>
  );
}
