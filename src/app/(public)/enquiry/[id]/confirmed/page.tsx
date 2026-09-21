import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { runtimeConfig } from "@/lib/config/runtime";

export const metadata: Metadata = { title: "Enquiry sent" };

/** P-07 — enquiry confirmation. */
export default async function EnquiryConfirmedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-[660px] px-[32px] pb-[60px] pt-[36px] max-[1060px]:px-[18px]">
      <Card className="border-[#C9E4D6] bg-chip-success-bg p-[24px]">
        <div className="flex flex-wrap items-center gap-[12px]">
          <Chip tone="success">Enquiry sent</Chip>
          <h1 className="t-heading text-success">The builder has your enquiry</h1>
        </div>
        <p className="t-body mt-[10px] text-body">
          Your reference is <span className="t-mono text-ink">{id}</span>. It is saved to your
          account, and any reply appears there.
        </p>
        {runtimeConfig.isSampleMode ? (
          <p className="t-caption mt-[10px] text-warning">
            Sample mode: nothing was sent to a builder and no notification was delivered.
          </p>
        ) : null}
        <div className="mt-[18px] flex flex-wrap gap-[10px]">
          <ButtonLink href="/account/enquiries">Track my enquiries</ButtonLink>
          <ButtonLink href="/search" variant="secondary">
            Keep looking
          </ButtonLink>
        </div>
      </Card>

      <p className="t-caption mt-[14px] text-muted">
        A builder usually replies through the portal. Kam Ki Lead does not promise a response
        time.
      </p>
    </div>
  );
}
