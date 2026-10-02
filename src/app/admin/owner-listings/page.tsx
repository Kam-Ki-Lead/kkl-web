import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { OWNER_STATUS } from "@/components/owner/owner-status";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { StateMessage } from "@/components/ui/states";
import { getServices } from "@/lib/services";
import { staffPhotographLabel } from "@/lib/domain/listing-photographs";
import type { OwnerListingStatus } from "@/lib/domain/types";

export const metadata: Metadata = { title: "Owner submissions", robots: { index: false } };

const FILTERS: readonly { label: string; value: string }[] = [
  { label: "Waiting", value: "submitted" },
  { label: "Being reviewed", value: "in_review" },
  { label: "Changes asked for", value: "changes_requested" },
  { label: "Cleared", value: "cleared" },
  { label: "All", value: "all" },
];

const STATUSES: readonly OwnerListingStatus[] = [
  "submitted",
  "in_review",
  "changes_requested",
  "cleared",
  "declined",
  "withdrawn",
];

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/**
 * CR02 — the owner-submission queue.
 *
 * Separate from Property review, which is about listings that are already live
 * or have been reported. These have never been live, and under the confirmed
 * owner decision they do not become live by being accepted here: the outcome of
 * a review is recorded, and publication waits on the owner policy.
 *
 * Drafts are not in this queue. A draft is the owner's private working copy and
 * staff have no business reading one before it is sent.
 */
export default async function AdminOwnerListingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = one((await searchParams).status) || "submitted";
  const status = (STATUSES as readonly string[]).includes(raw)
    ? (raw as OwnerListingStatus)
    : undefined;

  const listings = await getServices().admin.listOwnerListings(
    status === undefined ? undefined : { status },
  );

  return (
    <AdminShell
      title="Owner submissions"
      subtitle="Listings individual owners have sent for review"
    >
      <div className="flex flex-wrap gap-[8px]">
        {FILTERS.map((f) => {
          const active = f.value === raw || (f.value === "all" && status === undefined);
          return (
            <Link
              key={f.value}
              href={`/admin/owner-listings?status=${f.value}`}
              aria-current={active ? "true" : undefined}
              className={`flex min-h-[44px] items-center rounded-[8px] border px-[14px] text-[14px] font-semibold ${
                active ? "border-brand bg-chip-neutral-bg text-brand" : "border-line bg-white text-body"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <Card className="mt-[16px] border-[#F3DFB4] bg-[#FFF7E8] p-[16px]">
        <p className="t-body text-body">
          <strong className="text-ink">There is no publish action here.</strong> The confirmed owner
          decision is that a submitted listing never goes live by itself. Clearing one records that
          review found nothing wrong and stops there — whether an owner&rsquo;s listing publishes,
          when, and on what terms is part of the owner policy still to be confirmed with the client.
        </p>
      </Card>

      {listings.length === 0 ? (
        <StateMessage className="mt-[16px]" title="Nothing here">
          No owner submission matches this filter. Drafts owners have not sent do not appear in this
          queue.
        </StateMessage>
      ) : (
        <div className="mt-[16px] flex flex-col gap-[12px]">
          {listings.map((l) => {
            const state = OWNER_STATUS[l.status];
            return (
              <Link key={l.id} href={`/admin/owner-listings/${l.id}`} className="block">
                <Card className="p-[18px] transition-[border-color] duration-150 hover:border-[#B9C3EC]">
                  <div className="flex flex-wrap items-start justify-between gap-[12px]">
                    <div className="min-w-0">
                      <p className="t-caption text-muted">
                        {l.reference} · {l.ownerLabel}
                      </p>
                      <h2 className="t-card-title mt-[2px] text-ink">{l.title}</h2>
                      <p className="t-body mt-[4px] text-body">
                        {l.priceInr === null
                          ? "Price not set"
                          : `₹${l.priceInr.toLocaleString("en-IN")}${l.intent === "rent" ? " / month" : ""}`}
                        {" · "}
                        {l.configuration === null ? "configuration not set" : `${l.configuration} BHK`}
                        {" · "}
                        {staffPhotographLabel(l.photos)}
                      </p>
                      {l.internalNotes.length > 0 ? (
                        <p className="t-caption mt-[2px] text-muted">
                          {l.internalNotes.length} internal note
                          {l.internalNotes.length === 1 ? "" : "s"}
                        </p>
                      ) : null}
                    </div>
                    <Chip tone={state.tone}>{state.label}</Chip>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
