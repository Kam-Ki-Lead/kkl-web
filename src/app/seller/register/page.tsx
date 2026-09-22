import type { Metadata } from "next";
import { OnboardingShell } from "@/components/seller/onboarding-shell";
import { SellerRegisterForm } from "@/components/seller/seller-register-form";
import { runtimeConfig } from "@/lib/config/runtime";

export const metadata: Metadata = { title: "Register as a broker" };

/**
 * S-01 — seller registration.
 *
 * The mobile number is the login; there is no password, because whether sellers
 * also set one is an open question and inventing a password field would commit
 * to an answer.
 */
export default function SellerRegisterPage() {
  return (
    <OnboardingShell step="register">
      <h1 className="t-title text-ink">Register as a broker</h1>
      <p className="t-body mt-[8px] text-body">
        Your mobile number is your login. After registration you submit PAN and Aadhaar for
        verification; an administrator approves the account before you can buy leads.
      </p>
      <div className="mt-[20px]">
        <SellerRegisterForm isSample={runtimeConfig.isSampleMode} />
      </div>
    </OnboardingShell>
  );
}
