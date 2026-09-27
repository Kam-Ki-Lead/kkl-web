import type { Metadata } from "next";
import { runtimeConfig } from "@/lib/config/runtime";
import { pendingVerificationMobile } from "@/app/actions/enquiry";
import { OtpForm } from "@/components/auth/otp-form";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Sign in" };

/** P-06 — mobile OTP sign-in / register. */
export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

  const rawNext = one(params.next);
  // Only same-site paths are ever followed after verification.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/account";

  // The number comes from the server-held draft, never from the URL: putting a
  // mobile number in a query string leaks it into history, logs and referrers.
  const mobile = (await pendingVerificationMobile()) ?? "";

  return (
    <div className="mx-auto max-w-[520px] px-[32px] pb-[60px] pt-[36px] max-[1060px]:px-[18px]">
      <h1 className="t-title text-ink">Sign in or register</h1>
      <p className="mt-[6px] text-[16px] text-body">
        Free for buyers. A mobile number and a one-time code — no password.
      </p>

      <Card className="mt-[18px] p-[22px]">
        <OtpForm presetMobile={mobile} next={next} isSample={runtimeConfig.isSampleMode} />
      </Card>

      <p className="t-caption mt-[14px] text-muted">
        A buyer account tracks your own enquiries and shortlist. It never gives access to
        Buy Leads or to another account&rsquo;s data.
      </p>
    </div>
  );
}
