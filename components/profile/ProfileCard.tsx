import { BadgeCheck } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import type { PublicUser } from "@/types/auth";

export function ProfileCard({ user }: { user: PublicUser }) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <section aria-label="Profile" className="card animate-fade-up p-5">
      <div className="flex items-center gap-4">
        <Avatar
          firstName={user.firstName}
          lastName={user.lastName}
          avatarUrl={user.avatarUrl}
          size="lg"
        />
        <div className="min-w-0">
          <h2 className="truncate text-lg font-extrabold tracking-tight text-ink">
            {fullName || "BIRRLY user"}
          </h2>
          <p className="mt-0.5 truncate text-[13px] font-medium text-ink-muted">
            {user.username ? `@${user.username}` : "No username"}
          </p>
          <p className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-mint">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Telegram account
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span
          className={
            user.status === "ACTIVE" ? "pill-active" : "pill bg-red-400/10 text-red-300"
          }
        >
          {user.status}
        </span>
      </div>
    </section>
  );
}
