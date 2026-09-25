import type { ReactNode } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";

/**
 * The Builder onboarding shell the approved package draws over B-01 and B-02.
 *
 * Deliberately not the console rail — the same call the Seller's onboarding
 * shell makes: verification is the gate before the console is earned, and a
 * rail full of items that go nowhere invites the person away from the one
 * task in front of them. So: the wordmark, the three-step bar the approved
 * screen draws (6px bars, 640px column), and the step.
 *
 * The bar marks reached steps and does not navigate. Static in the approved
 * screen, static here.
 */
const STEPS = ["Register", "Verification", "Subscribe"] as const;

export function BuilderOnboardingShell({
  step,
  children,
}: {
  /** Index into STEPS: 0 = B-01 register, 1 = B-02 verification. */
  step: 0 | 1;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface">
      {/* The approved onboarding chrome uses one padding step for header and
          content alike: 16px / 20px 22px / 24px 28px across the three
          widths. */}
      <header className="flex items-center justify-between gap-[14px] border-b border-line bg-white p-[16px] min-[620px]:max-[1059px]:px-[22px] min-[620px]:max-[1059px]:py-[20px] min-[1060px]:px-[28px] min-[1060px]:py-[24px]">
        <Link href="/" aria-label="Kam Ki Lead — home">
          <Wordmark />
        </Link>
        {/* 15px, as the approved header sets it — not the 13px caption. */}
        <p className="text-[15px] text-muted">Builder registration</p>
      </header>

      <main className="flex justify-center p-[16px] min-[620px]:max-[1059px]:px-[22px] min-[620px]:max-[1059px]:py-[20px] min-[1060px]:px-[28px] min-[1060px]:py-[24px]">
        <div className="w-full max-w-[640px]">
          <nav aria-label="Onboarding progress">
            <ol className="flex gap-[8px]">
              {STEPS.map((label, i) => {
                const state = i < step ? "done" : i === step ? "current" : "todo";
                return (
                  <li key={label} className="flex-1">
                    <span
                      aria-hidden="true"
                      className={`block h-[6px] rounded-full ${
                        state === "todo" ? "bg-line" : "bg-brand"
                      }`}
                    />
                    <span
                      className={`mt-[7px] block text-[13px] font-semibold ${
                        state === "todo" ? "text-muted" : "text-ink"
                      }`}
                    >
                      {label}
                      {state === "current" ? <span className="sr-only"> — current step</span> : null}
                      {state === "done" ? <span className="sr-only"> — completed</span> : null}
                    </span>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="mt-[22px]">{children}</div>
        </div>
      </main>
    </div>
  );
}
