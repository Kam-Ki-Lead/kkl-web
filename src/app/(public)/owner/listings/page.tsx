import type { Metadata } from "next";
import Link from "next/link";
import { OWNER_STATUS } from "@/components/owner/owner-status";
import { StartListingButton } from "@/components/owner/start-listing-button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { StateMessage } from "@/components/ui/states";
import { getServices, listingStore } from "@/lib/services";
import { ownerCountLine } from "@/lib/listing-counts";

export const metadata: Metadata = { title: "My property listings", robots: { index: false } };

/**
 * Rendered per request, never prerendered.
 *
 * This page reads one account's own listings, which change while the server is
 * running. Left to Next's default it was collected as a static page: it happened
 * to stay correct because every write calls `revalidatePath`, but it depended on
 * that, and it failed a production build outright — the data source is resolved
 * at render time and there is no API client to resolve it to yet. Per-account
 * data is not static data.
 */
export const dynamic = "force-dynamic";

/**
 * CR02 — where an owner finds their own listings again.
 *
 * Drafts and sent listings in one list, newest first, because an owner thinks
 * in terms of "my flat", not "my drafts" and "my submissions". Each row says
 * what state it is in and how much of it is filled in, so an unfinished draft
 * is obviously unfinished rather than looking like a listing that failed.
 */
export default async function OwnerListingsPage() {
  const listings = await getServices().ownerListings.listMine();

  return (
    <div className="mx-auto max-w-[900px] px-[32px] py-[32px] max-[1060px]:px-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-[14px]">
        <div>
          <p className="t-eyebrow text-muted">For individual owners</p>
          <h1 className="t-flow-title mt-[4px] text-ink">My property listings</h1>
          <p className="t-body mt-[6px] max-w-[60ch] text-body">
            Your own property, posted in your own name. Nothing here is published, and posting costs
            nothing in this build.
          </p>
        </div>
        <StartListingButton />
      </div>

      {listings.length === 0 ? (
        <StateMessage
          className="mt-[22px]"
          title="No listings yet"
          action={<StartListingButton label="Start your first listing" />}
        >
          A listing takes six short steps — what the property is, where it is, the price, some
          photographs, and how buyers should reach you. You can save and come back at any point.
        </StateMessage>
      ) : (
        <div className="mt-[22px] flex flex-col gap-[12px]">
          {listings.map((l) => {
            const state = OWNER_STATUS[l.status];
            return (
              <Link key={l.id} href={`/owner/listings/${l.id}`} className="block">
                <Card className="p-[18px] transition-[border-color] duration-150 hover:border-brand-mist">
                  <div className="flex flex-wrap items-start justify-between gap-[12px]">
                    <div className="min-w-0">
                      <p className="t-caption text-muted">{l.reference}</p>
                      <h2 className="t-card-title mt-[2px] text-ink">{l.title}</h2>
                      <p className="t-body mt-[4px] text-body">
                        {l.priceLabel} · {l.locationLabel}
                      </p>
                      <p className="t-caption mt-[2px] text-muted">
                        {l.detailLine}
                        {` · ${ownerCountLine(l.photoCount, l.declaredImageCount, l.enquiryCount)}`}
                        {l.stepsComplete < l.stepsTotal
                          ? ` · ${l.stepsComplete} of ${l.stepsTotal} steps filled in`
                          : ""}
                      </p>
                    </div>
                    <Chip tone={state.tone}>{state.label}</Chip>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <p className="t-caption mt-[22px] max-w-[70ch] text-muted">
        Posting a property is a different journey from buying leads as a broker or managing a
        project as a builder — this account is not a subscription and there are no credits here.{" "}
        {listingStore() === "backend"
          ? "Drafts on this account are stored, and nothing an owner sends is published: submissions go to a review queue, and the publication policy is still to be confirmed with the client. A selected file can be recorded by name and size. That record is not an uploaded photograph."
          : "In this review build listings are kept for the session only, and nothing an owner sends is published: submissions go to a review queue, and the publication policy is still to be confirmed with the client."}
      </p>
    </div>
  );
}
