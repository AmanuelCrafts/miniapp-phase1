import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import type { PublicUser } from "@/types/auth";

export function HomeHeader({ user }: { user: PublicUser }) {
  return (
    <header className="mb-5 flex items-center justify-between">
      <div>
        <p className="eyebrow">BIRRLY</p>
        <h1 className="mt-1 text-[22px] font-extrabold tracking-tight text-ink">
          Hi, {user.firstName}
        </h1>
      </div>
      <Link
        href="/profile"
        aria-label="Open profile"
        className="tap rounded-full"
      >
        <Avatar
          firstName={user.firstName}
          lastName={user.lastName}
          avatarUrl={user.avatarUrl}
        />
      </Link>
    </header>
  );
}
