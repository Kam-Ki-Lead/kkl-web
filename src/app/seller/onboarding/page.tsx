import type { Metadata } from "next";
import { OnboardingShell } from "@/components/seller/onboarding-shell";
import { BusinessDetailsForm } from "@/components/seller/business-details-form";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "Your business" };

/** S-02 — business details. */
export default async function SellerOnboardingPage() {
  const account = await getServices().sellerAccount.get();

  return (
    <OnboardingShell step="business">
      <h1 className="t-flow-title text-ink">Your business</h1>
      <p className="t-body mt-[8px] text-body">
        This appears on invoices and helps us route leads in the areas you actually work.
      </p>
      <div className="mt-[20px]">
        <BusinessDetailsForm account={account} />
      </div>
    </OnboardingShell>
  );
}
