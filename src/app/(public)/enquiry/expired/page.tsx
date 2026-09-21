import type { Metadata } from "next";
import { NothingToVerify } from "@/components/auth/otp-form";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Nothing to confirm" };

/** Reached when /enquiry/confirm finds no pending draft — an expired or reused link. */
export default function EnquiryExpiredPage() {
  return (
    <div className="mx-auto max-w-[660px] px-[32px] pb-[60px] pt-[36px] max-[1060px]:px-[18px]">
      <NothingToVerify />
      <div className="mt-[16px] flex justify-center gap-[10px]">
        <ButtonLink href="/search">Browse properties</ButtonLink>
        <ButtonLink href="/account/enquiries" variant="secondary">
          My enquiries
        </ButtonLink>
      </div>
    </div>
  );
}
