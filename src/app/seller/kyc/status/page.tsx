import type { Metadata } from "next";
import { OnboardingShell } from "@/components/seller/onboarding-shell";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { DECISIONS } from "@/lib/config/business-rules";
import { formatDateTime } from "@/lib/format";
import { getServices } from "@/lib/services";
import { profileStoreKind } from "@/lib/services/backend/config";
import type { KycStatus } from "@/lib/domain/types";

export const metadata: Metadata = { title: "Verification status" };

const PANEL: Record<
  KycStatus,
  { chip: string; tone: ChipTone; title: string; body: string }
> = {
  not_submitted: {
    chip: "Not submitted",
    tone: "muted",
    title: "Your documents have not been submitted",
    body: "PAN and Aadhaar are needed before any lead can be purchased. Browsing the marketplace stays available.",
  },
  pending: {
    chip: "In review",
    tone: "warning",
    title: "Your documents are with an administrator",
    body: "Nothing is needed from you while this is in review. You can browse the marketplace; purchasing opens once the account is approved.",
  },
  approved: {
    chip: "Approved",
    tone: "success",
    title: "Your account is verified",
    body: "You can buy leads from the marketplace. Recharge credits first if your balance is low.",
  },
  rejected: {
    chip: "Rejected",
    tone: "danger",
    title: "Your documents were not accepted",
    body: "Re-submitting with the problem fixed sends it back for review. Support can help if the reason is unclear.",
  },
};

/** S-04 — KYC status and the verification timeline. */
export default async function KycStatusPage() {
  if (profileStoreKind() === "backend") {
    return (
      <OnboardingShell step="review">
        <h1 className="t-flow-title text-ink">Verification status</h1>
        <p className="t-body mt-[8px] text-body">
          Verification status is not a field on the profile. This screen does not report one, and
          it does not show a sample timeline.
        </p>
      </OnboardingShell>
    );
  }
  const services = getServices();
  const [account, timeline] = await Promise.all([
    services.sellerAccount.get(),
    services.sellerAccount.kycTimeline(),
  ]);

  const panel = PANEL[account.kycStatus];
  const rejected = account.kycStatus === "rejected";

  return (
    <OnboardingShell step="review">
      <Chip tone={panel.tone}>{panel.chip}</Chip>
      <h1 className="t-flow-title mt-[10px] text-ink">{panel.title}</h1>
      <p className="t-body mt-[8px] text-body">{panel.body}</p>

      {rejected ? (
        <Card className="mt-[16px] border-[#F3C4BF] bg-chip-danger-bg p-[18px]">
          <h2 className="t-card-title text-danger">Why it was rejected</h2>
          <p className="t-body mt-[6px] text-body">
            The Aadhaar upload was not readable. Re-upload both sides in one file, or the
            e-Aadhaar PDF.
          </p>
        </Card>
      ) : null}

      <div className="mt-[18px] flex flex-wrap gap-[10px]">
        {account.kycStatus === "approved" ? (
          <ButtonLink href="/seller/leads">Go to Buy Leads</ButtonLink>
        ) : null}
        {account.kycStatus === "not_submitted" || rejected ? (
          <ButtonLink href="/seller/kyc">
            {rejected ? "Re-submit documents" : "Submit documents"}
          </ButtonLink>
        ) : null}
        {account.kycStatus === "pending" ? (
          <ButtonLink href="/seller/leads">Browse Buy Leads</ButtonLink>
        ) : null}
        <ButtonLink href="/seller/support/new" variant="secondary">
          Contact support
        </ButtonLink>
      </div>

      {/* D-11. No turnaround is stated, because none has been agreed. */}
      <p className="t-caption mt-[12px] text-muted">
        {DECISIONS["D-11"].pendingCopy} — the timeline below shows what has happened, not what
        will happen next or when.
      </p>

      <Card className="mt-[18px] p-[18px]">
        <h2 className="t-card-title text-ink">Verification timeline</h2>
        <ol className="mt-[12px] flex flex-col">
          {timeline.map((entry) => (
            <li
              key={entry.label}
              className="flex flex-wrap items-baseline justify-between gap-[10px] border-b border-line py-[10px] last:border-b-0 last:pb-0"
            >
              <span className="text-[15px] text-ink">{entry.label}</span>
              <span className="t-caption flex-none text-muted">
                {entry.at === null ? "No date — not reached yet" : formatDateTime(entry.at)}
              </span>
            </li>
          ))}
        </ol>
      </Card>

      {/* D-08. The prototype records this question on this screen. */}
      <Card className="mt-[16px] border-[#F3DFB4] bg-[#FFF7E8] p-[18px]">
        <h2 className="t-card-title text-ink">Unresolved</h2>
        <p className="t-body mt-[6px] text-body">
          {DECISIONS["D-08"].question} — whether one person may hold both Broker and Builder roles
          on a single verified account, or needs a separate account and approval for each. No
          policy is stated here (D-08).
        </p>
      </Card>
    </OnboardingShell>
  );
}
