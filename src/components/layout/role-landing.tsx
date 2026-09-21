import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { PendingRule } from "@/components/ui/states";

/** Shared shell for P-17 (for builders) and P-18 (for brokers). */
export function RoleLanding({
  eyebrow,
  title,
  intro,
  steps,
  requirements,
  pending,
  ctaLabel,
  ctaHref,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  steps: ReadonlyArray<{ heading: string; body: string }>;
  requirements: readonly string[];
  /** Commercial terms the client has not settled — shown as pending, never invented. */
  pending: ReadonlyArray<{ label: string; copy: string }>;
  ctaLabel: string;
  ctaHref: string;
}): ReactNode {
  return (
    <div className="mx-auto max-w-[900px] px-[32px] pb-[60px] pt-[30px] max-[1060px]:px-[18px]">
      <p className="t-eyebrow text-brand">{eyebrow}</p>
      <h1 className="t-title mt-[6px] text-ink">{title}</h1>
      <p className="t-body mt-[8px] max-w-[70ch] text-body">{intro}</p>

      <ol className="mt-[22px] grid grid-cols-3 gap-[14px] max-[900px]:grid-cols-1">
        {steps.map((step, i) => (
          <li key={step.heading}>
            <Card className="h-full p-[18px]">
              <span className="t-mono text-[11px] tracking-[0.12em] text-muted">
                STEP {i + 1}
              </span>
              <h2 className="t-card-title mt-[6px] text-ink">{step.heading}</h2>
              <p className="t-caption mt-[6px] text-body">{step.body}</p>
            </Card>
          </li>
        ))}
      </ol>

      <Card className="mt-[18px] p-[20px]">
        <h2 className="t-card-title text-ink">What you will need</h2>
        <ul className="mt-[10px] flex flex-col gap-[7px]">
          {requirements.map((r) => (
            <li key={r} className="flex gap-[9px] text-[15px] text-body">
              <span aria-hidden="true" className="flex-none font-bold text-success">
                ✓
              </span>
              {r}
            </li>
          ))}
        </ul>
      </Card>

      {pending.length > 0 ? (
        <Card className="mt-[14px] p-[20px]">
          <h2 className="t-card-title text-ink">Not yet confirmed</h2>
          <p className="t-caption mt-[4px] text-muted">
            These are commercial terms the client has still to set. We do not publish a figure
            before it is agreed.
          </p>
          <ul className="mt-[12px] flex flex-col gap-[10px]">
            {pending.map((p) => (
              <li key={p.label}>
                <p className="t-label text-ink">{p.label}</p>
                <p className="t-caption mt-[3px] text-body">
                  <PendingRule>{p.copy}</PendingRule>
                </p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="mt-[20px]">
        <ButtonLink href={ctaHref}>{ctaLabel}</ButtonLink>
      </div>
    </div>
  );
}
