import type { Metadata } from "next";
import { RoleLanding } from "@/components/layout/role-landing";
import { DECISIONS } from "@/lib/config/business-rules";

export const metadata: Metadata = { title: "For brokers" };

/** P-18 — for brokers. */
export default function ForBrokersPage() {
  return (
    <RoleLanding
      eyebrow="For brokers & agencies"
      title="Buy qualified buyer leads, one buyer per lead"
      intro="Browse leads with their locality, configuration, budget band and intent score visible before you spend anything. Contact details are released after purchase, and a lead is sold to exactly one purchaser."
      steps={[
        {
          heading: "Register and verify",
          body: "Create an account with your mobile number, then submit PAN and Aadhaar for verification by our team.",
        },
        {
          heading: "Add credits",
          body: "Top up your balance. One rupee is one credit.",
        },
        {
          heading: "Buy and download",
          body: "Purchase a lead to release its contact details, then download your purchased leads as CSV.",
        },
      ]}
      requirements={[
        "A mobile number we can verify by one-time code",
        "PAN and Aadhaar for verification",
        "A credit balance before you can purchase",
      ]}
      pending={[
        { label: "What a lead costs", copy: DECISIONS["D-03"].pendingCopy },
        { label: "Credit expiry and renewal", copy: DECISIONS["D-04"].pendingCopy },
        { label: "Refund eligibility", copy: DECISIONS["D-06"].pendingCopy },
        { label: "What an unverified account can see", copy: DECISIONS["D-07"].pendingCopy },
      ]}
      ctaLabel="Start broker registration"
      ctaHref="/auth?intent=broker"
    />
  );
}
