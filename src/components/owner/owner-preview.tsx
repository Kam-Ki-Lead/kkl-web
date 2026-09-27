"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitOwnerListing, type OwnerSubmitState } from "@/app/actions/owner-listings";
import { Button } from "@/components/ui/button";
import { Card, InsetPanel } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import type { OwnerListing, OwnerListingBlocker } from "@/lib/domain/types";

/**
 * CR02 — the last step: what the listing says, and the send.
 *
 * Two things this screen is careful about.
 *
 * The first is what submission means. The confirmed instruction is that an
 * owner's listing never publishes by itself: it goes to a queue. So the button
 * says "Send for review", not "Publish", and the line under it says nothing
 * goes live and nothing is charged. A button labelled "Publish" that files
 * something in a queue would be the clearest possible way to mislead an owner.
 *
 * The second is the photographs. The preview shows how many there are and
 * says, in place of each one, that the file was not stored. Rendering a grey
 * box that looks like a loading image, or a stock photograph, would both read
 * as "my photos are in there".
 */
export function OwnerPreview({
  listing,
  blockers,
  idempotencyKey,
}: {
  listing: OwnerListing;
  blockers: readonly OwnerListingBlocker[];
  /** Minted per page visit, so a double click sends once. */
  idempotencyKey: string;
}) {
  const [state, action, pending] = useActionState<OwnerSubmitState, FormData>(
    submitOwnerListing,
    {},
  );
  // Blockers from the server action are fresher than the ones the page rendered
  // with: a field saved in another tab can close one between render and submit.
  const outstanding = state.blockers ?? blockers;

  return (
    <div className="flex flex-col gap-[18px]">
      <InsetPanel>
        <dl className="grid grid-cols-2 gap-[14px] max-[560px]:grid-cols-1">
          <Row label="Listing" value={listing.title || "Not filled in"} />
          <Row
            label={listing.intent === "rent" ? "Monthly rent" : "Price"}
            value={
              listing.priceInr === null
                ? "Not filled in"
                : `₹${listing.priceInr.toLocaleString("en-IN")}${listing.intent === "rent" ? " / month" : ""}`
            }
          />
          <Row
            label="Configuration"
            value={listing.configuration === null ? "Not filled in" : `${listing.configuration} BHK`}
          />
          <Row label="Carpet area" value={listing.carpetArea ? `${listing.carpetArea} sq ft` : "Not filled in"} />
          <Row label="Floor" value={listing.floorLabel || "Not filled in"} />
          <Row label="Available from" value={listing.availableFrom || "Not filled in"} />
          <Row
            label="How buyers reach you"
            value={
              listing.contactPreference === null
                ? "Not filled in"
                : { phone: "Phone call", whatsapp: "WhatsApp", either: "Either" }[
                    listing.contactPreference
                  ]
            }
          />
          <Row label="Shown as" value={listing.contactName || "Not filled in"} />
        </dl>
        {listing.description ? (
          <p className="t-body mt-[14px] border-t border-line pt-[14px] text-body">
            {listing.description}
          </p>
        ) : null}
      </InsetPanel>

      <Card className="bg-tint p-[18px]">
        <h3 className="t-card-title text-ink">
          Photographs{" "}
          <span className="t-caption font-normal text-muted">
            {listing.photos.length === 0 ? "none added" : `${listing.photos.length} added`}
          </span>
        </h3>
        {listing.photos.length === 0 ? (
          <p className="t-caption mt-[6px] text-muted">
            A listing needs at least one photograph before it can be sent.
          </p>
        ) : (
          <>
            <ul className="mt-[10px] flex flex-col gap-[6px]">
              {listing.photos.map((p, i) => (
                <li key={p.id} className="t-body text-body">
                  {i === 0 ? <strong className="text-ink">Cover · </strong> : null}
                  {p.fileName}{" "}
                  <span className="t-caption text-muted">({p.sizeLabel})</span>
                </li>
              ))}
            </ul>
            <p className="t-caption mt-[10px] rounded-[8px] border border-[#F3DFB4] bg-[#FFF7E8] px-[13px] py-[10px] text-body">
              <strong className="text-ink">The images themselves were not stored.</strong> This
              build records which files you chose so the listing and the review team show the right
              number of photographs. Media storage belongs to kkl-backend and does not exist yet, so
              there is nothing to show you here.
            </p>
          </>
        )}
      </Card>

      {outstanding.length > 0 ? (
        <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[18px]">
          <h3 className="t-card-title text-ink">Before you can send it</h3>
          <ul className="mt-[8px] flex flex-col gap-[8px]">
            {outstanding.map((b) => (
              <li key={`${b.step}-${b.message}`} className="t-body text-body">
                {b.message}{" "}
                <Link
                  href={`/owner/listings/${listing.id}/${b.step}`}
                  className="font-semibold text-brand underline"
                >
                  Step {b.stepNumber}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {state.error && outstanding.length === 0 ? (
        <p role="alert" className="t-body font-semibold text-danger">
          {state.error}
        </p>
      ) : null}

      <form action={action} className="border-t border-line pt-[16px]">
        <input type="hidden" name="listingId" value={listing.id} />
        {/* One key per page visit. A double click, or a retried POST, returns
            the listing that the first send queued instead of queueing it twice. */}
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <div className="flex flex-wrap items-center gap-[12px]">
          <Button type="submit" disabled={pending || outstanding.length > 0}>
            {pending ? "Sending…" : "Send for review"}
          </Button>
          <Chip tone="muted">Nothing publishes and nothing is charged</Chip>
        </div>
        <p className="t-caption mt-[10px] max-w-[70ch] text-muted">
          Sending puts the listing in the review team&rsquo;s queue. It does not go live on the
          portal: whether an owner&rsquo;s listing publishes, when, and on what terms is part of the
          owner policy still to be confirmed with the client. You can withdraw it at any point
          while it is in the queue.
        </p>
      </form>
    </div>
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
