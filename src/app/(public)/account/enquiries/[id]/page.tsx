import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getServices, ServiceError } from "@/lib/services";
import { redirectForAuth } from "@/lib/auth/recover";
import { formatDate } from "@/lib/format";
import { Card, InsetPanel } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ButtonLink } from "@/components/ui/button";
import { enquiryStatusChip } from "../page";

export const metadata: Metadata = { title: "Enquiry" };

/** P-14 — enquiry detail. */
export default async function EnquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let enquiry;
  try {
    enquiry = await getServices().enquiries.getMine(id);
  } catch (error) {
    redirectForAuth(error, `/account/enquiries/${id}`);
    if (error instanceof ServiceError && error.kind === "not_found") notFound();
    throw error;
  }

  const chip = enquiryStatusChip(enquiry.status);

  return (
    <div className="mx-auto max-w-[760px] px-[32px] pb-[50px] pt-[24px] max-[1060px]:px-[18px]">
      <p className="t-caption mb-[14px] text-muted">
        <Link href="/account/enquiries" className="font-semibold text-brand hover:text-brand-deep">
          <span aria-hidden="true">← </span>My enquiries
        </Link>{" "}
        · Enquiry detail
      </p>

      <div className="flex flex-wrap items-center gap-[12px]">
        <h1 className="t-title text-ink">{enquiry.propertyTitle}</h1>
        <Chip tone={chip.tone}>{chip.label}</Chip>
      </div>
      <p className="mt-[4px] text-[16px] text-body">
        {enquiry.locationPath.slice(-2).join(", ")}
      </p>

      <Card className="mt-[18px] p-[20px]">
        <dl className="grid grid-cols-2 gap-[14px] max-[560px]:grid-cols-1">
          <div>
            <dt className="t-caption text-muted">Reference</dt>
            <dd className="t-mono mt-[2px] text-ink">{enquiry.id}</dd>
          </div>
          <div>
            <dt className="t-caption text-muted">Sent</dt>
            <dd className="mt-[2px] text-[15px] text-ink">{formatDate(enquiry.createdAt)}</dd>
          </div>
          <div>
            <dt className="t-caption text-muted">Type</dt>
            <dd className="mt-[2px] text-[15px] text-ink">
              {enquiry.kind === "site_visit" ? "Site-visit request" : "Enquiry"}
            </dd>
          </div>
          <div>
            <dt className="t-caption text-muted">Status</dt>
            <dd className="mt-[2px] text-[15px] text-ink">{chip.label}</dd>
          </div>
        </dl>

        {enquiry.message ? (
          <div className="mt-[18px]">
            <p className="t-caption text-muted">Your message</p>
            <InsetPanel className="mt-[6px]">
              <p className="text-[15px] text-body">{enquiry.message}</p>
            </InsetPanel>
          </div>
        ) : null}
      </Card>

      <Card className="mt-[14px] p-[20px]">
        <h2 className="t-card-title text-ink">Replies</h2>
        <p className="t-caption mt-[6px] text-body">
          {enquiry.status === "contacted"
            ? "The builder has marked this enquiry as contacted. Replies sent through the portal appear here."
            : "No reply yet. Kam Ki Lead does not promise a response time."}
        </p>
      </Card>

      <div className="mt-[16px] flex flex-wrap gap-[10px]">
        <ButtonLink href={`/property/${enquiry.propertyId}`} variant="secondary">
          View the project
        </ButtonLink>
      </div>
    </div>
  );
}
