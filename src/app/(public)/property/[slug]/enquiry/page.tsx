import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getServices, ServiceError } from "@/lib/services";
import { EnquiryForm } from "@/components/enquiry/enquiry-form";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Send an enquiry" };

/** P-04 — enquiry form. */
export default async function EnquiryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let property;
  try {
    property = await getServices().properties.getBySlug(slug);
  } catch (error) {
    if (error instanceof ServiceError && error.kind === "not_found") notFound();
    throw error;
  }

  return (
    <div className="mx-auto max-w-[1280px] px-[32px] pb-[40px] pt-[18px] max-[1060px]:px-[18px]">
      <p className="t-caption mb-[14px] text-muted">
        <Link href={`/property/${slug}`} className="font-semibold text-brand hover:text-brand-deep">
          <span aria-hidden="true">← </span>Back
        </Link>{" "}
        · Enquiry
      </p>

      <h1 className="t-title text-ink">Send an enquiry</h1>
      <p className="mt-[4px] text-[16px] text-body">
        {property.title} · {property.locationPath.slice(-2).join(", ")}
      </p>

      <Card className="mt-[18px] max-w-[660px] p-[22px]">
        <EnquiryForm propertyId={property.id} propertySlug={property.slug} kind="enquiry" />
      </Card>
    </div>
  );
}
