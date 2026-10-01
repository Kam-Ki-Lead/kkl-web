import type { Metadata } from "next";
import { SellerShell } from "@/components/seller/seller-shell";
import { SellerProfileForm } from "@/components/seller/seller-profile-form";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DECISIONS } from "@/lib/config/business-rules";
import { getServices } from "@/lib/services";
import { runtimeConfig } from "@/lib/config/runtime";
import { profileStoreKind } from "@/lib/services/backend/config";
import { readSellerProfile } from "@/lib/services/backend/seller-profile";
import { ServiceError } from "@/lib/services/contracts";
import { SellerSampleNotice } from "@/components/seller/sample-notice";
import { StateMessage } from "@/components/ui/states";

export const metadata: Metadata = { title: "Profile & settings" };

const VERIFICATION = {
  approved: { label: "Approved", tone: "success" as const },
  pending: { label: "In review", tone: "warning" as const },
  rejected: { label: "Rejected", tone: "danger" as const },
  not_submitted: { label: "Not submitted", tone: "muted" as const },
};

/** S-25 — profile, alerts and verification status. */
export default async function SellerProfilePage() {
  const profilesFromBackend = profileStoreKind() === "backend";
  let account;
  if (profilesFromBackend) {
    try {
      account = await readSellerProfile();
    } catch (error) {
      if (error instanceof ServiceError) {
        return (
          <SellerShell title="Profile & settings" subtitle="Account details and alerts">
            <StateMessage title="This profile could not be read">
              {error.message} The sample seller is not shown in its place.
            </StateMessage>
          </SellerShell>
        );
      }
      throw error;
    }
  } else {
    account = await getServices().sellerAccount.get();
  }
  const verification = VERIFICATION[account.kycStatus];

  return (
    <SellerShell title="Profile & settings" subtitle="Account details and alerts">
      <div className="grid max-w-[1000px] grid-cols-[minmax(0,1fr)_320px] gap-[18px] max-[1060px]:grid-cols-1">
        <div className="flex flex-col gap-[16px]">
          <SellerProfileForm
            account={account}
            isSample={runtimeConfig.isSampleMode}
            alertsStored={!profilesFromBackend}
          />

          {/* D-08 and the sign-in question, both open. No password field and no
              role switch is shown, because neither route has been agreed. */}
          <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[18px]">
            <h2 className="t-card-title text-ink">Pending decisions on this screen</h2>
            <ul className="t-body mt-[8px] flex list-disc flex-col gap-[4px] pl-[20px] text-body">
              <li>
                Whether sellers sign in with a one-time code only, or also set a password. No
                password control is shown until that is settled.
              </li>
              <li>
                {DECISIONS["D-08"].question} — no role switch is offered, and holding both roles
                is neither enabled nor ruled out here (D-08).
              </li>
            </ul>
          </Card>
        </div>

        <aside className="flex flex-col gap-[16px]">
          <Card className="p-[18px]">
            <h2 className="t-card-title text-ink">Verification</h2>
            {profilesFromBackend ? (
              <p className="t-body mt-[8px] text-body">
                Verification status is not on the profile. This card does not report one.
              </p>
            ) : (
              <>
                <div className="mt-[8px]">
                  <Chip tone={verification.tone}>{verification.label}</Chip>
                </div>
                <p className="t-body mt-[8px] text-body">PAN and Aadhaar</p>
              </>
            )}
            <ButtonLink
              href="/seller/kyc/status"
              variant="secondaryBrand"
              size="action"
              className="mt-[12px] w-full"
            >
              View status
            </ButtonLink>
          </Card>

          <Card className="p-[18px]">
            <h2 className="t-card-title text-ink">Billing</h2>
            <p className="t-body mt-[6px] text-body">
              The name, address and GSTIN that appear on your invoices.
            </p>
            <ButtonLink
              href="/seller/billing/details"
              variant="secondary"
              className="mt-[12px] w-full"
            >
              Billing information
            </ButtonLink>
          </Card>
        </aside>
      </div>

      <div className="mt-[18px] max-w-[1000px]">
        <SellerSampleNotice />
      </div>
    </SellerShell>
  );
}
