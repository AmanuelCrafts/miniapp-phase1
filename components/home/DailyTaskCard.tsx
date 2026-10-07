"use client";

import { Target } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ComingSoonPill } from "@/components/ui/ComingSoon";

/**
 * 🎯 DAILY TASKS — structure ready for the future task system.
 * No completion counts are fabricated.
 */
export function DailyTaskCard() {
  return (
    <section
      aria-label="Daily tasks"
      className="card animate-fade-up p-5 [animation-delay:180ms]"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-flame" aria-hidden="true" />
          <p className="eyebrow">Daily tasks</p>
        </div>
        <ComingSoonPill />
      </div>

      <p className="mt-3.5 text-[13px] leading-relaxed text-ink-muted">
        Complete daily activities to build your streak and earn rewards.
      </p>

      <Button variant="secondary" size="md" className="mt-4 w-full" disabled>
        Start tasks →
      </Button>
    </section>
  );
}
