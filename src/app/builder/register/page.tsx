import type { Metadata } from "next";
import { BuilderOnboardingShell } from "@/components/builder/onboarding-shell";
import { BuilderRegisterForm } from "@/components/builder/register-form";
import { runtimeConfig } from "@/lib/config/runtime";

export const metadata: Metadata = { title: "Register as a builder" };

/**
 * B-01 — builder registration.
 *
 * The approved package draws B-01 and B-02 inside one onboarding chrome —
 * wordmark header, three-step bar, centred 640px column — not the console
 * rail: there is nothing to navigate to yet, and a rail full of items that go
 * nowhere invites the person away from the one task in front of them. The
 * chrome is shared (`BuilderOnboardingShell`); this is step 0. The E-P5
 * correction restored the same chrome on B-02.
 */
export default function BuilderRegisterPage() {
  return (
    <BuilderOnboardingShell step={0}>
      <h1 className="t-flow-title text-ink max-[619px]:text-[24px] min-[620px]:max-[1059px]:text-[27px]">
        Register as a builder
      </h1>
      <p className="mt-[8px] text-[16px] leading-[1.6] text-body">
        Your mobile number is your login. After registration you submit company documents for
        verification; an administrator approves the account before you can publish a listing.
      </p>
      <div className="mt-[20px]">
        <BuilderRegisterForm isSample={runtimeConfig.isSampleMode} />
      </div>
    </BuilderOnboardingShell>
  );
}
