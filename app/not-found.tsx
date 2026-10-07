import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonStyles } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-iris-500/10 text-iris-300 ring-1 ring-iris-500/25">
        <Compass className="h-6 w-6" aria-hidden="true" />
      </div>
      <h1 className="mt-5 text-lg font-bold tracking-tight text-ink">
        Page not found
      </h1>
      <p className="mt-2 max-w-[30ch] text-[13px] leading-relaxed text-ink-muted">
        That page doesn&apos;t exist. Head back home and keep building your streak.
      </p>
      <Link href="/" className={buttonStyles("secondary", "md", "mt-6")}>
        Back to Home
      </Link>
    </div>
  );
}
