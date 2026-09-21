import type { Metadata } from "next";
import { RoleLanding } from "@/components/layout/role-landing";
import { DECISIONS } from "@/lib/config/business-rules";

export const metadata: Metadata = { title: "For builders" };

/** P-17 — for builders. */
export default function ForBuildersPage() {
  return (
    <RoleLanding
      eyebrow="For builders & developers"
      title="Publish your projects and hear from buyers directly"
      intro="List your developments on the Kolkata portal, receive buyer enquiries as they arrive, and buy additional qualified leads with credits when you want more reach."
      steps={[
        {
          heading: "Register and verify",
          body: "Create an account with your mobile number, then submit PAN and Aadhaar for verification by our team.",
        },
        {
          heading: "Subscribe",
          body: "An active monthly subscription activates the account and lets you publish listings.",
        },
        {
          heading: "Publish and respond",
          body: "Add your projects with photographs, pricing and specifications, then act on enquiries from your dashboard.",
        },
      ]}
      requirements={[
        "A mobile number we can verify by one-time code",
        "PAN and Aadhaar for verification",
        "Project details: configurations, pricing, specifications and location",
        "Photographs you hold the rights to publish",
      ]}
      pending={[
        { label: "Subscription price and billing cycle", copy: DECISIONS["D-01"].pendingCopy },
        {
          label: "What happens to published listings when a subscription expires",
          copy: DECISIONS["D-02"].pendingCopy,
        },
        {
          label: "Whether enquiries on your own listings show buyer contact details",
          copy: DECISIONS["D-05"].pendingCopy,
        },
        { label: "Which company documents are required", copy: DECISIONS["D-15"].pendingCopy },
      ]}
      ctaLabel="Start builder registration"
      ctaHref="/auth?intent=builder"
    />
  );
}
