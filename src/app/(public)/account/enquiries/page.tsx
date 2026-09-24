import Link from "next/link";
import type { Metadata } from "next";
import { getServices } from "@/lib/services";
import type { BuyerEnquiry } from "@/lib/domain/types";
import { formatDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { ButtonLink } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/states";

export const metadata: Metadata = { title: "My enquiries" };

export function enquiryStatusChip(status: BuyerEnquiry["status"]): {
  tone: ChipTone;
  label: string;
} {
  switch (status) {
    case "contacted":
      return { tone: "success", label: "Builder responded" };
    case "closed":
      return { tone: "muted", label: "Closed" };
    default:
      // The approved P-13 draws this waiting state in the warning tone
      // (#8A4A08 on its tint), not the neutral brand one.
      return { tone: "warning", label: "Awaiting builder" };
  }
}

/** P-13 — my enquiries. */
export default async function MyEnquiriesPage() {
  const enquiries = await getServices().enquiries.listMine();

  return (
    <div className="mx-auto max-w-[900px] px-[32px] pb-[50px] pt-[28px] max-[1060px]:px-[18px]">
      <h1 className="t-title text-ink">My enquiries</h1>
      <p className="mt-[6px] text-[16px] text-body">
        Every enquiry and site-visit request you have sent, and the builder&rsquo;s replies.
      </p>

      {enquiries.length === 0 ? (
        <div className="mt-[20px]">
          <StateMessage
            title="You have not sent any enquiries yet"
            action={<ButtonLink href="/search" size="sm">Browse properties</ButtonLink>}
          >
            When you enquire about a project or ask for a site visit, it appears here with the
            builder&rsquo;s reply.
          </StateMessage>
        </div>
      ) : (
        <ul className="mt-[20px] flex flex-col gap-[12px]">
          {enquiries.map((enquiry) => {
            const chip = enquiryStatusChip(enquiry.status);
            return (
              <li key={enquiry.id}>
                <Card className="flex flex-wrap items-center justify-between gap-[14px] p-[18px]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-[10px]">
                      <h2 className="t-card-title text-ink">{enquiry.propertyTitle}</h2>
                      <Chip tone={chip.tone}>{chip.label}</Chip>
                    </div>
                    <p className="t-caption mt-[4px] text-muted">
                      {enquiry.locationPath.slice(-2).join(", ")} ·{" "}
                      {enquiry.kind === "site_visit" ? "Site visit requested" : "Enquiry"} ·{" "}
                      {formatDate(enquiry.createdAt)}
                    </p>
                    {enquiry.message ? (
                      <p className="t-caption mt-[6px] truncate text-body">
                        &ldquo;{enquiry.message}&rdquo;
                      </p>
                    ) : null}
                  </div>
                  <Link
                    href={`/account/enquiries/${enquiry.id}`}
                    className="text-[15px] font-semibold text-brand hover:text-brand-deep"
                  >
                    View <span aria-hidden="true">→</span>
                  </Link>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
