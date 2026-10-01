import type { Metadata } from "next";
import { OnboardingShell } from "@/components/seller/onboarding-shell";
import { BusinessDetailsForm } from "@/components/seller/business-details-form";
import { getServices } from "@/lib/services";
import { profileStoreKind } from "@/lib/services/backend/config";
import { BUSINESS_NOT_ON_PROFILE } from "@/lib/services/backend/seller-profile-reading";
import type { SellerAccount } from "@/lib/domain/types";

export const metadata: Metadata = { title: "Your business" };

/** S-02 — business details. */
export default async function SellerOnboardingPage() {
  const fromProfile = profileStoreKind() === "backend";
  const stored = await getServices().sellerAccount.get();
  const account: SellerAccount = fromProfile
    ? { ...stored, agencyName: "", businessType: "individual_broker", areas: [], gstin: null }
    : stored;

  return (
    <OnboardingShell step="business">
      <h1 className="t-flow-title text-ink">Your business</h1>
      <p className="t-body mt-[8px] text-body">
        {fromProfile
          ? BUSINESS_NOT_ON_PROFILE
          : "This appears on invoices and helps us route leads in the areas you actually work."}
      </p>
      <div className="mt-[20px]">
        <BusinessDetailsForm account={account} />
      </div>
    </OnboardingShell>
  );
}
