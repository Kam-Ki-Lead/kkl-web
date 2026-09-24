import type { Metadata } from "next";
import { OnboardingShell } from "@/components/seller/onboarding-shell";
import { KycForm } from "@/components/seller/kyc-form";
import { runtimeConfig } from "@/lib/config/runtime";

export const metadata: Metadata = { title: "Verify your identity" };

/** S-03 — KYC submission. */
export default function SellerKycPage() {
  return (
    <OnboardingShell step="kyc">
      <h1 className="t-flow-title text-ink">Verify your identity</h1>
      <p className="t-body mt-[8px] text-body">
        PAN and Aadhaar are required by the platform before any lead can be purchased. Documents
        are reviewed by an administrator.
      </p>
      <div className="mt-[20px]">
        <KycForm isSample={runtimeConfig.isSampleMode} />
      </div>
    </OnboardingShell>
  );
}
