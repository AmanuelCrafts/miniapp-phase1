"use client";

import { useEffect } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Details stay in server/console logs — never shown to users.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/25">
        <TriangleAlert className="h-6 w-6" aria-hidden="true" />
      </div>
      <h1 className="mt-5 text-lg font-bold tracking-tight text-ink">
        Something went wrong.
      </h1>
      <p className="mt-2 max-w-[30ch] text-[13px] leading-relaxed text-ink-muted">
        We hit an unexpected snag. Please try again in a moment.
      </p>
      <Button variant="secondary" size="md" className="mt-6" onClick={reset}>
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Try again
      </Button>
    </div>
  );
}
