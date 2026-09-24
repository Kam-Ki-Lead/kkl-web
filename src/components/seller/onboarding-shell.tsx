import type { ReactNode } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";

/**
 * The onboarding shell for S-01 to S-04.
 *
 * Deliberately not the dashboard rail. There is nothing to navigate to yet —
 * the console's screens are all gated behind the verification this flow is for,
 * and a rail full of items that go nowhere invites the person to leave the one
 * task in front of them. So: the wordmark, a four-step progress bar, and the
 * step.
 *
 * The bar marks completed and current steps and does not link backwards from
 * step 3 to step 1. Re-entering an earlier step after documents are submitted is
 * a different operation from filling it the first time, and it is not built.
 */

export type OnboardingStep = "register" | "business" | "kyc" | "review";

const STEPS: readonly { key: OnboardingStep; label: string }[] = [
  { key: "register", label: "Register" },
  { key: "business", label: "Business" },
  { key: "kyc", label: "KYC" },
  { key: "review", label: "Review" },
];

export function OnboardingShell({
  step,
  children,
}: {
  step: OnboardingStep;
  children: ReactNode;
}) {
  const index = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-surface">
      <header className="flex items-center justify-between gap-[14px] border-b border-line bg-white px-[32px] py-[16px] max-[1060px]:px-[16px]">
        <Link href="/" aria-label="Kam Ki Lead — home">
          <Wordmark />
        </Link>
        <p className="text-[15px] text-muted">Broker &amp; agency registration</p>
      </header>

      <main className="mx-auto max-w-[620px] px-[32px] py-[32px] max-[1060px]:px-[16px]">
        <nav aria-label="Registration progress">
          <ol className="flex gap-[10px]">
            {STEPS.map((s, i) => {
              const state = i < index ? "done" : i === index ? "current" : "todo";
              return (
                <li key={s.key} className="flex-1">
                  <span
                    aria-hidden="true"
                    className={`block h-[4px] rounded-full ${
                      state === "todo" ? "bg-line" : "bg-brand"
                    }`}
                  />
                  <span
                    className={`t-label mt-[7px] block text-[13px] ${
                      state === "todo" ? "text-muted" : "text-ink"
                    }`}
                  >
                    {s.label}
                    {state === "current" ? <span className="sr-only"> — current step</span> : null}
                    {state === "done" ? <span className="sr-only"> — completed</span> : null}
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="mt-[26px]">{children}</div>
      </main>
    </div>
  );
}
