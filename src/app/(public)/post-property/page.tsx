import type { Metadata } from "next";
import Link from "next/link";
import { RoleLanding } from "@/components/layout/role-landing";
import { OWNER_STATUS } from "@/components/owner/owner-status";
import { StartListingButton } from "@/components/owner/start-listing-button";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DECISIONS } from "@/lib/config/business-rules";
import { getServices } from "@/lib/services";

/**
 * Per-account data is not static data.
 *
 * With KKL_LISTINGS=backend this page reads a person's own records over the
 * network at request time. Collected as a static page it prerendered once at
 * build — which Next refuses outright for a no-store fetch, and which would be
 * wrong even if it did not. The sibling list page carries the same line for
 * the same reason.
 */
export const dynamic = "force-dynamic";


export const metadata: Metadata = { title: "Post your property" };

/**
 * CR02 — the individual owner's entry point.
 *
 * This page used to be a disabled skeleton: the right fields, over the real
 * location records, with submission deliberately not connected, because the
 * owner policy was unconfirmed and there was nothing honest for a submit button
 * to do.
 *
 * One part of that policy is now confirmed: an owner saves drafts and submits;
 * a submission enters a moderation queue; nothing publishes by itself and
 * nothing is charged. That is enough to build the journey, so the journey is
 * built — `/owner/listings`, six steps, a preview and a send.
 *
 * What is still open is what happens *after* review: whether an owner's listing
 * publishes, when, on what terms, at what cost, and whether verification gates
 * it. The written specification proposes third-party verification before
 * publication; the call says KYC is compliance-based and mostly unnecessary.
 * This page takes neither side, and nothing downstream of it publishes, charges
 * or awards a verification.
 */
export default async function PostPropertyPage() {
  // Anything the owner already has, so the entry point is also a way back in.
  const listings = await getServices().ownerListings.listMine();

  return (
    <>
      <RoleLanding
        eyebrow="For individual owners"
        title="Post your property"
        intro="Sell or let out your own property, in your own name. This is a different journey from a broker buying leads or a builder managing a project — one listing, yours, posted directly. There is no subscription and nothing to buy."
        steps={[
          {
            heading: "Fill in the listing",
            body: "Six short steps: what the property is, where it is, the price and configuration, photographs, and how buyers should reach you. Save and come back whenever you like.",
          },
          {
            heading: "Preview it",
            body: "See what the listing says, and what is still missing. Each gap links to the step that owns it.",
          },
          {
            heading: "Send it for review",
            body: "It goes to the review team. It does not go live by itself, nothing is charged, and you can withdraw it at any point while it is in the queue.",
          },
        ]}
        requirements={[
          "The property's locality, configuration and expected price",
          "Photographs of the property",
          "A name and a contact preference buyers will see",
        ]}
        pending={[
          {
            label: "Whether a cleared listing is published, when, and on what terms",
            copy: DECISIONS["D-18"].pendingCopy,
          },
          { label: "What posting costs, if anything", copy: DECISIONS["D-18"].pendingCopy },
          {
            label: "Whether verification is required before publication",
            copy:
              "The written specification proposes it; the call says it is mostly unnecessary — unresolved",
          },
          { label: "Whether owners can post rentals at launch", copy: DECISIONS["D-18"].pendingCopy },
        ]}
        ctaLabel="Start a listing"
        ctaHref="#start"
      />

      <div
        id="start"
        className="mx-auto max-w-[900px] scroll-mt-[20px] px-[32px] pb-[60px] max-[1060px]:px-[18px]"
      >
        <Card className="p-[22px]">
          <h2 className="t-card-title text-ink">
            {listings.length === 0 ? "Start your listing" : "Your listings"}
          </h2>

          {listings.length === 0 ? (
            <>
              <p className="t-body mt-[6px] max-w-[70ch] text-body">
                Nothing is published by starting, and nothing is charged. A draft is yours alone
                until you send it.
              </p>
              <div className="mt-[16px]">
                <StartListingButton label="Start a listing" />
              </div>
            </>
          ) : (
            <>
              <ul className="mt-[12px] flex flex-col gap-[10px]">
                {listings.slice(0, 4).map((l) => {
                  const state = OWNER_STATUS[l.status];
                  return (
                    <li
                      key={l.id}
                      className="flex flex-wrap items-center justify-between gap-[10px] rounded-[8px] border border-line bg-white px-[14px] py-[12px]"
                    >
                      <Link href={`/owner/listings/${l.id}`} className="min-w-0">
                        <span className="t-caption block text-muted">{l.reference}</span>
                        <span className="t-label block text-ink">{l.title}</span>
                        <span className="t-caption block text-muted">
                          {l.priceLabel} · {l.locationLabel}
                          {l.stepsComplete < l.stepsTotal
                            ? ` · ${l.stepsComplete} of ${l.stepsTotal} steps filled in`
                            : ""}
                        </span>
                      </Link>
                      <Chip tone={state.tone}>{state.label}</Chip>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-[16px] flex flex-wrap gap-[10px]">
                <ButtonLink href="/owner/listings">All my listings</ButtonLink>
                <StartListingButton label="Start another listing" variant="secondary" />
              </div>
            </>
          )}

          <p className="t-caption mt-[16px] max-w-[70ch] text-muted">
            In this review build there is no sign-in, so every listing here belongs to the one sample
            owner, and drafts are kept for the session only — durable storage for owner listings is a
            kkl-backend dependency and is not claimed. Photographs you choose are recorded by name;
            the files themselves are not stored anywhere.
          </p>
        </Card>
      </div>
    </>
  );
}
