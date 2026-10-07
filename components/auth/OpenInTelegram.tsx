"use client";

import { Send } from "lucide-react";
import { BirrlyLogo } from "@/components/auth/BirrlyLogo";

const steps = [
  { n: "1", text: "Open Telegram on your phone" },
  { n: "2", text: "Find the BIRRLY bot" },
  { n: "3", text: "Tap Start to launch the app" },
];

/** Shown in normal browsers — polished, never broken-looking. */
export function OpenInTelegram() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="animate-fade-up">
        <BirrlyLogo size={56} />
      </div>

      <p className="mt-4 text-lg font-extrabold tracking-tight text-ink">
        BIRRLY
      </p>

      <div className="card mt-7 w-full max-w-sm animate-fade-up p-6 [animation-delay:120ms]">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-iris-500/15 text-iris-300 ring-1 ring-iris-500/25">
            <Send className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-base font-bold tracking-tight text-ink">
            Open BIRRLY inside Telegram
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
            BIRRLY is a Telegram Mini App. Launch it from the bot to build
            streaks, level up your VIP, and earn rewards.
          </p>
        </div>

        <ol className="mt-6 space-y-2.5">
          {steps.map((step) => (
            <li
              key={step.n}
              className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.03] px-3.5 py-3"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-iris-500/15 text-[11px] font-bold text-iris-300">
                {step.n}
              </span>
              <span className="text-[13px] font-medium text-ink-dim">
                {step.text}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.2em] text-ink-faint">
        Telegram Mini App
      </p>
    </div>
  );
}
