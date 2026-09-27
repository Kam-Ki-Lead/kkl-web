import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import {
  OwnerListingDecisionForm,
  OwnerListingReplyForm,
} from "@/components/admin/owner-listing-forms";
import { OWNER_STATUS } from "@/components/owner/owner-status";
import { Card, InsetPanel, SectionHeader } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { getServices } from "@/lib/services";
import { areaLabel } from "@/lib/services/sample/locations";

export const metadata: Metadata = { title: "Owner submission", robots: { index: false } };

/**
 * CR02 — one owner submission, staff side.
 *
 * The same record the owner sees, plus who sent it and the internal notes. The
 * two message streams are rendered in separate blocks with separate headings:
 * a reviewer skimming this page should not have to check a badge to tell what
 * the owner can read.
 */
export default async function AdminOwnerListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getServices().admin.getOwnerListing(id);
  if (listing === null) notFound();

  const state = OWNER_STATUS[listing.status];

  return (
    <AdminShell title={listing.title || "Untitled listing"} subtitle={`${listing.reference} · owner submission`}>
      <div className="flex flex-wrap items-center gap-[12px]">
        <Chip tone={state.tone}>{state.label}</Chip>
        <p className="t-body min-w-0 text-body">Requested by {listing.ownerLabel}</p>
        <Link href="/admin/owner-listings" className="t-caption font-semibold text-brand">
          Back to the queue
        </Link>
      </div>

      <Card className="mt-[16px] p-[22px]">
        <SectionHeader title="The listing" />
        <dl className="mt-[12px] grid grid-cols-3 gap-[14px] max-[760px]:grid-cols-2 max-[480px]:grid-cols-1">
          <Row label="Intent" value={listing.intent === null ? "Not set" : listing.intent === "rent" ? "Letting out" : "Selling"} />
          <Row label="Property type" value={listing.propertyType ?? "Not set"} />
          <Row
            label="Configuration"
            value={listing.configuration === null ? "Not set" : `${listing.configuration} BHK`}
          />
          <Row
            label={listing.intent === "rent" ? "Monthly rent" : "Price"}
            value={
              listing.priceInr === null
                ? "Not set"
                : `₹${listing.priceInr.toLocaleString("en-IN")}${listing.intent === "rent" ? " / month" : ""}`
            }
          />
          <Row
            label="Locality"
            value={listing.localityId === null ? "Not set" : areaLabel(listing.localityId)}
          />
          <Row label="Address line" value={listing.addressLine || "Not given"} />
          <Row label="Carpet area" value={listing.carpetArea ? `${listing.carpetArea} sq ft` : "Not set"} />
          <Row label="Floor" value={listing.floorLabel || "Not set"} />
          <Row label="Furnishing" value={listing.furnishing ?? "Not set"} />
          <Row label="Available from" value={listing.availableFrom || "Not set"} />
          <Row
            label="Contact preference"
            value={
              listing.contactPreference === null
                ? "Not set"
                : { phone: "Phone call", whatsapp: "WhatsApp", either: "Either" }[
                    listing.contactPreference
                  ]
            }
          />
          <Row label="Shown as" value={listing.contactName || "Not set"} />
        </dl>
        {listing.description ? (
          <p className="t-body mt-[14px] border-t border-line pt-[14px] text-body">
            {listing.description}
          </p>
        ) : null}
      </Card>

      <Card className="mt-[16px] p-[22px]">
        <SectionHeader
          title="Photographs"
          subtitle={
            listing.photos.length === 0
              ? "None on this listing"
              : `${listing.photos.length} chosen by the owner`
          }
        />
        {listing.photos.length === 0 ? null : (
          <ul className="flex flex-col gap-[6px]">
            {listing.photos.map((p, i) => (
              <li key={p.id} className="t-body text-body">
                {i === 0 ? <strong className="text-ink">Cover · </strong> : null}
                {p.fileName} <span className="t-caption text-muted">({p.sizeLabel})</span>
              </li>
            ))}
          </ul>
        )}
        <p className="t-caption mt-[10px] rounded-[8px] border border-[#F3DFB4] bg-[#FFF7E8] px-[13px] py-[10px] text-body">
          <strong className="text-ink">There are no images to look at.</strong> This build records
          which files an owner chose so the counts are right, but the files themselves were never
          stored — media storage, virus scanning and a retention rule belong to kkl-backend and do
          not exist yet. A real review of the photographs is not possible here.
        </p>
      </Card>

      <div className="mt-[16px] grid grid-cols-2 gap-[16px] max-[900px]:grid-cols-1">
        <Card className="p-[22px]">
          <SectionHeader title="Thread with the owner" subtitle="The owner reads this" />
          {listing.messages.length === 0 ? (
            <p className="t-body text-muted">Nothing yet.</p>
          ) : (
            <ul className="flex flex-col gap-[12px]">
              {listing.messages.map((m) => (
                <li key={m.id}>
                  <InsetPanel>
                    <p className="t-caption text-muted">
                      {m.authorLabel} · {m.at}
                    </p>
                    <p className="t-body mt-[4px] text-ink">{m.body}</p>
                  </InsetPanel>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="border-[#D4DBF3] bg-tint p-[22px]">
          <SectionHeader title="Internal notes" subtitle="Staff only — never shown to the owner" />
          {listing.internalNotes.length === 0 ? (
            <p className="t-body text-muted">Nothing yet.</p>
          ) : (
            <ul className="flex flex-col gap-[12px]">
              {listing.internalNotes.map((n) => (
                <li key={n.id} className="rounded-[8px] border border-line bg-white p-[13px]">
                  <p className="t-caption text-muted">
                    {n.authorLabel} · {n.sentAt}
                  </p>
                  <p className="t-body mt-[4px] text-ink">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-[16px] p-[22px]">
        <SectionHeader title="Write" />
        <OwnerListingReplyForm listingId={id} />
      </Card>

      <Card className="mt-[16px] p-[22px]">
        <SectionHeader title="Record a decision" />
        <OwnerListingDecisionForm listingId={id} />
      </Card>

      <Card className="mt-[16px] p-[22px]">
        <SectionHeader title="History" />
        <ol className="flex flex-col gap-[10px]">
          {listing.events.map((e, i) => {
            const s = OWNER_STATUS[e.status];
            return (
              <li key={`${e.at}-${i}`} className="border-l-[2px] border-line pl-[12px]">
                <p className="t-label text-ink">{s.label}</p>
                <p className="t-caption text-muted">
                  {e.actorLabel} · {e.at}
                </p>
                {e.note ? <p className="t-body mt-[2px] text-body">{e.note}</p> : null}
              </li>
            );
          })}
        </ol>
      </Card>
    </AdminShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="t-caption text-muted">{label}</dt>
      <dd className="t-body mt-[2px] break-words text-ink">{value}</dd>
    </div>
  );
}
