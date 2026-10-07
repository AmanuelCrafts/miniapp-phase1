import type { ReactNode } from "react";
import { Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Small "COMING SOON" pill. */
export function ComingSoonPill({ className }: { className?: string }) {
  return (
    <span className={cn("pill-soon", className)}>
      <Clock className="h-3 w-3" aria-hidden="true" />
      Soon
    </span>
  );
}

/**
 * Polished placeholder panel for features that are not built yet.
 * Communicates intent without fabricating data.
 */
export function ComingSoonPanel({
  icon,
  title,
  message,
  children,
}: {
  icon: ReactNode;
  title: string;
  message: string;
  children?: ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-iris-500/15 text-iris-300 ring-1 ring-iris-500/25">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-ink">{title}</h3>
            <ComingSoonPill />
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
            {message}
          </p>
        </div>
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

/** Roadmap row used inside coming-soon screens. */
export function RoadmapRow({
  icon,
  label,
  status = "soon",
}: {
  icon: ReactNode;
  label: string;
  status?: "soon" | "later";
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.03] px-3.5 py-3">
      <span className="text-ink-faint" aria-hidden="true">
        {icon}
      </span>
      <span className="flex-1 text-[13px] font-medium text-ink-dim">
        {label}
      </span>
      <span className="pill-soon !py-0.5">{status === "soon" ? "Soon" : "Later"}</span>
    </div>
  );
}

/** Designed empty state (e.g. no transactions). */
export function EmptyState({
  icon,
  title,
  message,
}: {
  icon?: ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/[0.09] px-6 py-8 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.04] text-ink-faint">
        {icon ?? <Sparkles className="h-5 w-5" aria-hidden="true" />}
      </div>
      <p className="eyebrow">{title}</p>
      <p className="mt-1.5 max-w-[26ch] text-[13px] leading-relaxed text-ink-muted">
        {message}
      </p>
    </div>
  );
}
