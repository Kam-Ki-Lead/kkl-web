import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { AccessPanel } from "@/components/ui/states";

export const metadata: Metadata = { title: "Nothing to confirm" };

/**
 * Reached when /enquiry/confirm finds no usable draft. Expired and missing are
 * different situations and say so: one means "you waited too long", the other
 * means "there was nothing here", and confusing them wastes the person's time.
 */
export default async function EnquiryUnavailablePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.reason) ? params.reason[0] : params.reason;
  const expired = raw === "expired";

  return (
    <div className="mx-auto max-w-[660px] px-[32px] pb-[60px] pt-[36px] max-[1060px]:px-[18px]">
      <AccessPanel
        tone="restricted"
        chipLabel={expired ? "Expired" : "Nothing pending"}
        title={
          expired
            ? "That enquiry took too long to confirm"
            : "There is nothing waiting to be confirmed"
        }
        footnote="P-07 · a draft is held for 30 minutes while you verify your number"
        actions={
          <>
            <ButtonLink href="/search">Browse properties</ButtonLink>
            <ButtonLink href="/account/enquiries" variant="secondary">
              My enquiries
            </ButtonLink>
          </>
        }
      >
        {expired
          ? "Drafts are kept for 30 minutes while you verify your number. Yours passed that, so nothing was sent. Starting again from the project takes a moment."
          : "Either this enquiry was already confirmed, or the link was opened without one in progress. Nothing was sent and nothing was charged."}
      </AccessPanel>
    </div>
  );
}
