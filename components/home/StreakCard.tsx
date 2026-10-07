import { Flame } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * 🔥 DAILY STREAK — gamified like Duolingo but original to BIRRLY.
 *
 * The component is built for future real data: pass `currentStreak` and
 * `completedDays` once the streak system exists. Until then it renders the
 * honest zero-state (no fabricated streaks).
 */

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;

export interface StreakWeek {
  /** Completed day indexes, Monday = 0. */
  completedDays: number[];
  /** Index of today, Monday = 0. */
  todayIndex: number;
}

export function StreakCard({
  currentStreak = 0,
  week = null,
}: {
  currentStreak?: number | null;
  week?: StreakWeek | null;
}) {
  const hasStreak = typeof currentStreak === "number" && currentStreak > 0;

  return (
    <section
      aria-label="Daily streak"
      className="card animate-fade-up p-5 [animation-delay:120ms]"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame
            className={cn(
              "h-4 w-4",
              hasStreak ? "text-flame animate-flicker" : "text-flame/70",
            )}
            aria-hidden="true"
          />
          <p className="eyebrow">Daily streak</p>
        </div>
      </div>

      <div className="mt-4 flex items-end gap-2">
        <span
          className={cn(
            "text-4xl font-extrabold leading-none tracking-tight",
            hasStreak ? "text-ink" : "text-ink-dim",
          )}
        >
          {hasStreak ? currentStreak : 0}
        </span>
        <span className="pb-0.5 text-xs font-bold uppercase tracking-[0.14em] text-ink-faint">
          day streak
        </span>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5" aria-hidden="true">
        {WEEKDAY_LABELS.map((label, index) => {
          const completed = week?.completedDays.includes(index) ?? false;
          const isToday = week ? index === week.todayIndex : false;
          return (
            <div key={index} className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "text-[10px] font-semibold",
                  isToday ? "text-iris-300" : "text-ink-faint",
                )}
              >
                {label}
              </span>
              <div
                className={cn(
                  "flex h-8 w-full items-center justify-center rounded-lg border text-[11px] font-bold transition-colors",
                  completed
                    ? "border-mint/40 bg-mint/15 text-mint"
                    : isToday
                      ? "border-iris-400/50 bg-iris-500/10 text-iris-300"
                      : "border-white/[0.07] bg-white/[0.02] text-ink-faint",
                )}
              >
                {completed ? "✓" : "○"}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">
        {hasStreak
          ? "Keep it alive — complete today's activities."
          : "Start your streak by completing today's activities."}
      </p>
    </section>
  );
}
