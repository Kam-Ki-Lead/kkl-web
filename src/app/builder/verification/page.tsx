import type { Metadata } from "next";
import { BuilderOnboardingShell } from "@/components/builder/onboarding-shell";
import { VerificationForm } from "@/components/builder/verification-form";
import { Card } from "@/components/ui/card";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { ButtonLink } from "@/components/ui/button";
import { DECISIONS } from "@/lib/config/business-rules";
import { formatDateTime } from "@/lib/format";
import { getServices } from "@/lib/services";
import { runtimeConfig } from "@/lib/config/runtime";
import type { KycStatus } from "@/lib/domain/types";

export const metadata: Metadata = { title: "Company verification" };

const PANEL: Record<KycStatus, { chip: string; tone: ChipTone; title: string; body: string }> = {
  not_submitted: {
    chip: "Not submitted",
    tone: "muted",
    title: "Your company has not been verified",
    body: "Company documents are needed before any listing can be published. Drafts and the lead marketplace stay available.",
  },
  pending: {
    chip: "In review",
    tone: "warning",
    title: "Your documents are with an administrator",
    body: "Nothing is needed from you while this is in review. You can keep preparing listings and use the lead marketplace.",
  },
  approved: {
    chip: "Approved",
    tone: "success",
    title: "Your company is verified",
    body: "Publishing is unlocked once a subscription is active.",
  },
  rejected: {
    chip: "Rejected",
    tone: "danger",
    title: "Your documents were not accepted",
    body: "Re-submitting with the problem fixed sends it back for review.",
  },
};

/**
 * B-02 — company verification.
 *
 * The approved screen is a **standalone light page**, not a console screen:
 * the same pre-console chrome as B-01, because verification is the gate
 * before the console is earned. An earlier implementation rendered it inside
 * the Builder console shell; that departure was recorded as E-P5 and is
 * corrected here back to the approved layout.
 *
 * The approved screen draws the submission state: title, intro, one upload
 * card per document, the amber not-settled note, and the submit row. The two
 * states it does not draw — documents in review, and an approved account —
 * keep their status panels here in the same approved chrome, with the
 * timeline and the way back to the console that the standalone page does not
 * provide on its own.
 */
export default async function BuilderVerificationPage() {
  const services = getServices().builder;
  const [account, timeline] = await Promise.all([
    services.account.get(),
    services.account.verificationTimeline(),
  ]);

  const panel = PANEL[account.kycStatus];
  const canSubmit = account.kycStatus === "not_submitted" || account.kycStatus === "rejected";

  return (
    <BuilderOnboardingShell step={1}>
      {/* The approved onboarding title steps 24/27/30px with the frame;
          t-flow-title carries all three steps. */}
      <h1 className="t-flow-title text-ink">
        Company verification
      </h1>

      {canSubmit ? (
        <>
          <p className="mt-[8px] text-[16px] leading-[1.6] text-body">
            Builders submit the same PAN and Aadhaar as brokers, plus company documents. An
            administrator reviews them before you can subscribe.
          </p>

          {account.kycStatus === "rejected" ? (
            <div className="mt-[14px] rounded-[8px] bg-chip-danger-bg px-[14px] py-[11px]">
              <p className="text-[14px] font-semibold text-danger">Why it was rejected</p>
              <p className="t-body mt-[2px] text-body">
                The company incorporation document was not readable. Please re-upload a clear scan.
              </p>
            </div>
          ) : null}

          <VerificationForm isSample={runtimeConfig.isSampleMode} />
        </>
      ) : (
        <div className="mt-[20px] flex flex-col gap-[16px]">
          <Card className="p-[22px]">
            <Chip tone={panel.tone}>{panel.chip}</Chip>
            {/* The status panel title is the same role as the seller's KYC
                panel title (S-04), which the approved source sets at the
                console flow-title step. */}
            <h2 className="t-flow-title mt-[10px] text-ink">{panel.title}</h2>
            <p className="t-body mt-[6px] text-body">{panel.body}</p>

            {/* D-11. The timeline shows what happened, never what will. */}
            <p className="t-caption mt-[12px] text-muted">
              {DECISIONS["D-11"].pendingCopy} — the timeline below records what has happened, not
              what will happen next or when.
            </p>
          </Card>

          <Card className="p-[18px]">
            <h2 className="t-card-title text-ink">Timeline</h2>
            <ol className="mt-[10px] flex flex-col">
              {timeline.map((entry) => (
                <li
                  key={entry.label}
                  className="flex flex-wrap items-baseline justify-between gap-[8px] border-b border-line py-[9px] last:border-b-0 last:pb-0"
                >
                  <span className="text-[15px] text-ink">{entry.label}</span>
                  <span className="t-caption flex-none text-muted">
                    {entry.at === null ? "Not reached" : formatDateTime(entry.at)}
                  </span>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[18px]">
            <h2 className="t-card-title text-ink">Which documents?</h2>
            <p className="t-body mt-[6px] text-body">
              The company PAN and the authorised signatory&rsquo;s Aadhaar are required; the
              incorporation certificate and RERA registration are proposed. Which documents a
              Builder must actually submit is not confirmed, so this list may grow.
            </p>
            <p className="t-caption mt-[8px] text-muted">{DECISIONS["D-15"].question} — D-15</p>
          </Card>

          <div className="flex flex-wrap gap-[12px]">
            <ButtonLink href="/builder" variant="secondary">
              Back to your dashboard
            </ButtonLink>
            <ButtonLink href="/builder/restrictions" variant="secondary">
              What each state allows
            </ButtonLink>
          </div>
        </div>
      )}
    </BuilderOnboardingShell>
  );
}
