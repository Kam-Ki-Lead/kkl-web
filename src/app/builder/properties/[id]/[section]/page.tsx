import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BuilderShell } from "@/components/builder/builder-shell";
import { EditorShell } from "@/components/builder/editor-shell";
import { SectionForm, SECTION_FORM_ID } from "@/components/builder/section-forms";
import { PublishForm } from "@/components/builder/publish-form";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { PropertyImage } from "@/components/property/property-image";
import { DECISIONS } from "@/lib/config/business-rules";
import { formatPriceRange } from "@/lib/format";
import { getServices } from "@/lib/services";
import type { ListingSectionId } from "@/lib/domain/types";

export const metadata: Metadata = { title: "Listing editor" };

const ORDER: readonly ListingSectionId[] = [
  "basics",
  "location",
  "pricing",
  "specifications",
  "media",
  "preview",
];

/**
 * B-08 to B-13, and B-15 when the listing already exists.
 *
 * One route for all six sections. They share a shell, a save action and a
 * navigation model; six near-identical files would only give six places for
 * those to drift apart.
 */
export default async function ListingSectionPage({
  params,
}: {
  params: Promise<{ id: string; section: string }>;
}) {
  const { id, section: raw } = await params;
  if (!ORDER.includes(raw as ListingSectionId)) notFound();
  const section = raw as ListingSectionId;

  const services = getServices().builder;
  const [listing, sections, account] = await Promise.all([
    services.listings.get(id),
    services.listings.sections(id),
    services.account.get(),
  ]);
  if (!listing) notFound();

  const index = ORDER.indexOf(section);
  const previous = index > 0 ? `/builder/properties/${id}/${ORDER[index - 1]}` : null;
  const next = index < ORDER.length - 1 ? `/builder/properties/${id}/${ORDER[index + 1]}` : null;
  const editing = listing.status !== "draft";

  return (
    <BuilderShell
      title={editing ? "Edit listing" : "New listing"}
      subtitle={
        section === "preview"
          ? "Preview and publish"
          : editing
            ? "Changes are saved as a draft until you publish"
            : "Six sections — save a draft any time"
      }
    >
      <EditorShell
        listingId={id}
        listingTitle={listing.title}
        sections={sections}
        current={section}
        editing={editing}
        formId={section === "preview" ? null : SECTION_FORM_ID}
      >
        {section === "preview" ? (
          <PreviewSection listingId={id} listing={listing} previousHref={previous} account={account} />
        ) : (
          <SectionForm
            listing={listing}
            section={section}
            previousHref={previous}
            nextHref={next ?? `/builder/properties/${id}/preview`}
            nextLabel={`Next: ${sections[index + 1]?.label ?? "Preview"}`}
          />
        )}
      </EditorShell>
    </BuilderShell>
  );
}

async function PreviewSection({
  listingId,
  listing,
  previousHref,
  account,
}: {
  listingId: string;
  listing: NonNullable<Awaited<ReturnType<ReturnType<typeof getServices>["builder"]["listings"]["get"]>>>;
  previousHref: string | null;
  account: Awaited<ReturnType<ReturnType<typeof getServices>["builder"]["account"]["get"]>>;
}) {
  const blockers = await getServices().builder.listings.publishBlockers(listingId);
  const price = formatPriceRange({ minInr: listing.priceMinInr, maxInr: listing.priceMaxInr });

  const accountBlocked =
    account.accountStatus === "suspended"
      ? "This account is suspended, so publishing is paused."
      : account.kycStatus !== "approved"
        ? "Publishing opens once an administrator approves your company documents."
        : account.subscription.state === "none"
          ? "An active subscription is needed to publish."
          : account.subscription.state === "expired"
            ? "Your subscription has lapsed, so publishing is locked until it is reactivated."
            : null;

  return (
    <div className="flex flex-col gap-[18px]">
      {blockers.length > 0 ? (
        <Card className="border-[#F3C4BF] bg-chip-danger-bg p-[18px]">
          <h3 className="t-card-title text-danger">This listing cannot be published yet</h3>
          <ul className="mt-[8px] flex flex-col gap-[4px]">
            {blockers.map((blocker) => (
              <li key={`${blocker.section}-${blocker.message}`} className="t-body text-body">
                {blocker.message} —{" "}
                <Link
                  href={`/builder/properties/${listingId}/${blocker.section}`}
                  className="font-semibold text-brand underline underline-offset-2"
                >
                  section {blocker.sectionNumber}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {accountBlocked ? (
        <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[18px]">
          <h3 className="t-card-title text-warning">Publishing is not available</h3>
          <p className="t-body mt-[6px] text-body">{accountBlocked}</p>
          <p className="t-caption mt-[8px] text-muted">
            Your work is saved as a draft and nothing is lost.
          </p>
        </Card>
      ) : null}

      <div>
        <p className="t-eyebrow text-muted">Buyer preview — how this looks on the portal</p>
        <Card className="mt-[8px] overflow-hidden">
          <PropertyImage
            media={listing.media[0] ?? null}
            ratio="16 / 9"
            label={
              listing.media.length > 0
                ? `${listing.title || "This project"} — no file was kept in sample mode`
                : "No cover photo"
            }
          />
          <div className="p-[18px]">
            <p className="t-card-title text-ink">{price ?? "Price on request"}</p>
            <h3 className="t-heading mt-[2px] text-ink">{listing.title || "Untitled project"}</h3>
            <p className="t-caption mt-[1px] text-muted">
              {listing.locality
                ? `${listing.locality}${listing.locality.startsWith("Action Area") ? ", New Town" : ", Kolkata"}`
                : "Location not entered"}
            </p>
            <p className="mt-[6px] text-[15px] text-body">
              {listing.configurations.length > 0
                ? `${listing.configurations.join(", ")} BHK`
                : "Configuration not entered"}
              {listing.propertyType ? ` · ${listing.propertyType}` : ""}
            </p>
            {listing.possessionTarget ? (
              <p className="t-caption mt-[4px] text-muted">
                ◐ Possession {listing.possessionTarget}
              </p>
            ) : null}
            {listing.amenities.length > 0 ? (
              <div className="mt-[10px] flex flex-wrap gap-[6px]">
                {listing.amenities.slice(0, 4).map((a) => (
                  <Chip key={a} tone="muted">
                    {a}
                  </Chip>
                ))}
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <PublishForm
        listingId={listingId}
        canPublish={blockers.length === 0 && accountBlocked === null}
        previousHref={previousHref}
        alreadyPublished={listing.status === "published"}
      />

      {/* D-10. Publishing here goes straight to the portal; whether a real one
          would be reviewed first is not decided, and the screen says so rather
          than implying a moderation step that nobody has agreed to staff. */}
      <p className="t-caption text-muted">
        {DECISIONS["D-10"].question} — D-10. This build publishes straight to the portal. Whether
        a listing is reviewed before or after it goes live is undecided, so no review step is
        shown and none is implied.
      </p>
    </div>
  );
}
