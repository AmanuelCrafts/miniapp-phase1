import { User as UserIcon } from "lucide-react";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { LogoutButton } from "@/components/profile/LogoutButton";
import { formatMonthYear } from "@/lib/utils/format";
import { getCurrentUser } from "@/lib/auth/session";

/** 👤 PROFILE — Telegram identity, account status, logout. */
export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) return null; // layout renders the auth gate

  const rows: Array<{ label: string; value: string }> = [
    {
      label: "Username",
      value: user.username ? `@${user.username}` : "—",
    },
    { label: "Status", value: user.status },
    { label: "Member since", value: formatMonthYear(user.createdAt) || "—" },
  ];

  return (
    <div className="mx-auto w-full max-w-app px-4 pb-6 pt-6">
      <header className="mb-5">
        <p className="eyebrow flex items-center gap-1.5">
          <UserIcon className="h-3.5 w-3.5 text-iris-300" aria-hidden="true" />
          Profile
        </p>
        <h1 className="mt-1 text-[22px] font-extrabold tracking-tight text-ink">
          Account
        </h1>
      </header>

      <div className="space-y-4">
        <ProfileCard user={user} />

        <section
          aria-label="Account details"
          className="card animate-fade-up p-2 [animation-delay:80ms]"
        >
          <ul className="divide-y divide-white/[0.05]">
            {rows.map((row) => (
              <li
                key={row.label}
                className="flex items-center justify-between px-3.5 py-3.5"
              >
                <span className="text-[13px] font-medium text-ink-faint">
                  {row.label}
                </span>
                <span className="text-[13px] font-semibold text-ink-dim">
                  {row.value}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="animate-fade-up [animation-delay:140ms]">
          <LogoutButton />
        </div>

        <p className="pt-2 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-ink-faint">
          BIRRLY · v0.1.0
        </p>
      </div>
    </div>
  );
}
