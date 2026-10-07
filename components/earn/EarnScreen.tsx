import { Flame, Gift, ListChecks, Trophy } from "lucide-react";
import { ComingSoonPanel, RoadmapRow } from "@/components/ui/ComingSoon";

/** 🔥 EARN — structure for the future task/reward engine. */
export function EarnScreen() {
  return (
    <div className="space-y-4">
      <section className="card animate-fade-up border-flame/15 bg-gradient-to-br from-flame/[0.08] to-transparent p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-flame/15 text-flame ring-1 ring-flame/25">
          <Flame className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-xl font-extrabold tracking-tight text-ink">
          Build your streak
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
          Complete daily activities and earn rewards. The earn engine arrives
          with the next release.
        </p>
        <span className="pill-soon mt-4">Coming soon</span>
      </section>

      <ComingSoonPanel
        icon={<ListChecks className="h-6 w-6" aria-hidden="true" />}
        title="Daily tasks"
        message="A fresh set of activities every day — the fastest way to grow your streak."
      />

      <div className="card animate-fade-up p-4 [animation-delay:120ms]">
        <p className="eyebrow mb-3">On the roadmap</p>
        <div className="space-y-2">
          <RoadmapRow
            icon={<Trophy className="h-4 w-4" aria-hidden="true" />}
            label="Streak bonuses"
          />
          <RoadmapRow
            icon={<Gift className="h-4 w-4" aria-hidden="true" />}
            label="Achievements"
            status="later"
          />
        </div>
      </div>
    </div>
  );
}
