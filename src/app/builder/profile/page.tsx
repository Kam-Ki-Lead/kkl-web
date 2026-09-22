import type { Metadata } from "next";
import { BuilderShell } from "@/components/builder/builder-shell";
import { BuilderSampleNotice } from "@/components/builder/sample-notice";
import { BuilderProfileForm } from "@/components/builder/profile-form";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { DECISIONS } from "@/lib/config/business-rules";
import { getServices } from "@/lib/services";
import { runtimeConfig } from "@/lib/config/runtime";
import type { KycStatus } from "@/lib/domain/types";

export const metadata: Metadata = { title: "Profile & settings" };

const VERIFICATION: Record<KycStatus, { label: string; tone: ChipTone }> = {
  approved: { label: "Approved", tone: "success" },
  pending: { label: "In review", tone: "warning" },
  rejected: { label: "Rejected", tone: "danger" },
  not_submitted: { label: "Not submitted", tone: "muted" },
};

/** B-24 — company details, alerts and account status. */
export default async function BuilderProfilePage() {
  const account = await getServices().builder.account.get();
  const verification = VERIFICATION[account.kycStatus];

  return (
    <BuilderShell title="Profile & settings" subtitle="Company details, alerts and account status">
      <div className="grid max-w-[1000px] grid-cols-[minmax(0,1fr)_320px] gap-[18px] max-[1060px]:grid-cols-1">
        <div className="flex flex-col gap-[16px]">
          <BuilderProfileForm account={account} isSample={runtimeConfig.isSampleMode} />

          <Card className="border-[#F2DFBC] bg-[#FFF9EE] p-[18px]">
            <h2 className="t-card-title text-ink">Pending decisions on this screen</h2>
            <ul className="t-body mt-[8px] flex list-disc flex-col gap-[4px] pl-[20px] text-body">
              <li>
                Whether builders sign in with a one-time code only, or also set a password. No
                password control is shown until that is settled.
              </li>
              <li>
                {DECISIONS["D-08"].question} — no role switch is offered, and holding both Builder
                and Broker roles on one account is neither enabled nor ruled out here (D-08).
              </li>
            </ul>
          </Card>
        </div>

        <aside className="flex flex-col gap-[16px]">
          <Card className="p-[18px]">
            <h2 className="t-card-title text-ink">Verification</h2>
            <div className="mt-[8px]">
              <Chip tone={verification.tone}>{verification.label}</Chip>
            </div>
            <p className="t-body mt-[8px] text-body">Company PAN and incorporation documents</p>
            <ButtonLink href="/builder/verification" variant="secondary" className="mt-[12px] w-full">
              View status
            </ButtonLink>
          </Card>

          <Card className="p-[18px]">
            <h2 className="t-card-title text-ink">Account status</h2>
            <div className="mt-[8px]">
              <Chip tone={account.accountStatus === "active" ? "success" : "danger"}>
                {account.accountStatus === "active" ? "Active" : "Suspended"}
              </Chip>
            </div>
            <p className="t-caption mt-[8px] text-muted">
              Separate from verification and from your subscription. Suspending an account does
              not un-verify it.
            </p>
            <ButtonLink href="/builder/restrictions" variant="secondary" className="mt-[12px] w-full">
              What each state allows
            </ButtonLink>
          </Card>
        </aside>
      </div>

      <div className="mt-[18px] max-w-[1000px]">
        <BuilderSampleNotice />
      </div>
    </BuilderShell>
  );
}
