import type { Metadata } from "next";
import { BuilderShell } from "@/components/builder/builder-shell";
import { BuilderSampleNotice } from "@/components/builder/sample-notice";
import { BuilderProfileForm } from "@/components/builder/profile-form";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DECISIONS } from "@/lib/config/business-rules";
import { getServices } from "@/lib/services";
import { runtimeConfig } from "@/lib/config/runtime";
import type { BuilderSubscriptionState, KycStatus } from "@/lib/domain/types";

export const metadata: Metadata = { title: "Profile & settings" };

const VERIFICATION: Record<KycStatus, string> = {
  approved: "Approved",
  pending: "In review",
  rejected: "Rejected",
  not_submitted: "Not submitted",
};

/* The same labels the rail footer carries. */
const SUBSCRIPTION: Record<BuilderSubscriptionState, string> = {
  none: "No subscription",
  active: "Active",
  due: "Renewal due",
  grace: "In grace",
  expired: "Expired",
};

/** B-24 — company details, alerts and account status. */
export default async function BuilderProfilePage() {
  const account = await getServices().builder.account.get();
  const verification = VERIFICATION[account.kycStatus];
  const subscription = SUBSCRIPTION[account.subscription.state];

  return (
    <BuilderShell title="Profile & settings" subtitle="Company details, alerts and account status">
      <div className="grid max-w-[1000px] grid-cols-[minmax(0,1fr)_320px] gap-[18px] max-[1060px]:grid-cols-1">
        <div className="flex flex-col gap-[16px]">
          <BuilderProfileForm account={account} isSample={runtimeConfig.isSampleMode} />

          <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[18px]">
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
          {/* The approved B-24 account-status panel: verification and
              subscription as 12px-label / 16px-600 tiles, then the two
              15px/700 actions. */}
          <Card className="p-[20px]">
            <h2 className="t-card-title text-ink">Account status</h2>
            <div className="mt-[12px] grid grid-cols-2 gap-[12px] max-[619px]:grid-cols-1">
              <div className="rounded-[8px] bg-tint px-[15px] py-[13px]">
                <p className="text-[12px] text-muted">Verification</p>
                <p className="mt-[3px] text-[16px] font-semibold text-ink">{verification}</p>
              </div>
              <div className="rounded-[8px] bg-tint px-[15px] py-[13px]">
                <p className="text-[12px] text-muted">Subscription</p>
                <p className="mt-[3px] text-[16px] font-semibold text-ink">{subscription}</p>
              </div>
            </div>
            <div className="mt-[14px] flex flex-wrap gap-[12px]">
              <ButtonLink href="/builder/verification" variant="secondaryBrand" size="action">
                Verification
              </ButtonLink>
              <ButtonLink href="/builder/subscription" variant="secondaryBrand" size="action">
                Subscription
              </ButtonLink>
            </div>
          </Card>

          {/* No approved counterpart on B-24: the suspension state is an
              impl addition, recorded in visual-differences.md. */}
          <Card className="p-[18px]">
            <h2 className="t-card-title text-ink">Suspension</h2>
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
