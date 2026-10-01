import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OwnerReplyForm, OwnerWithdrawForm } from "@/components/owner/owner-listing-actions";
import { OWNER_STATUS, ownerCanEdit } from "@/components/owner/owner-status";
import { ButtonLink } from "@/components/ui/button";
import { Card, InsetPanel, SectionHeader } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { getServices, listingStore } from "@/lib/services";
import { ServiceError } from "@/lib/services/contracts";
import { OWNER_STEPS, stepStates } from "@/lib/services/sample/owner-listing-store";
import { areaLabel } from "@/lib/services/sample/locations";

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


export const metadata: Metadata = { title: "Your property listing", robots: { index: false } };

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/**
 * CR02 — the listing an owner comes back to.
 *
 * This is the page the whole journey has to be able to return to: after a
 * submission, from the list, from a bookmark, after a reload. It shows what
 * state the listing is in, in plain words, what happened to it and when, the
 * thread with the review team, and the way onward — edit the steps, or withdraw.
 *
 * The confirmation after a submission lives here rather than on a separate
 * screen, keyed off `?sent=`. It says the listing is waiting for review and
 * that nothing was published or charged, because that is what happened.
 */
export default async function OwnerListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sent = one((await searchParams).sent);

  let listing;
  try {
    listing = await getServices().ownerListings.getMine(id);
  } catch (error) {
    if (error instanceof ServiceError && error.kind === "not_found") notFound();
    throw error;
  }

  const state = OWNER_STATUS[listing.status];
  const steps = stepStates(listing);
  const done = steps.filter((s) => s.complete).length;
  const editable = ownerCanEdit(listing.status);
  const blockers = editable ? await getServices().ownerListings.blockers(id) : [];

  return (
    <div className="mx-auto max-w-[900px] px-[32px] py-[32px] max-[1060px]:px-[18px]">
      <p className="t-eyebrow text-muted">
        <Link href="/owner/listings" className="hover:text-brand">
          My property listings
        </Link>{" "}
        · {listing.reference}
      </p>
      <h1 className="t-flow-title mt-[4px] text-ink">{listing.title || "Untitled draft"}</h1>

      {sent !== "" ? (
        <Card className="mt-[16px] border-[#BFE0C8] bg-chip-success-bg p-[18px]">
          <h2 className="t-card-title text-success">Sent for review</h2>
          <p className="t-body mt-[6px] max-w-[70ch] text-body">
            Your listing <strong className="text-ink">{sent}</strong> is with the review team. It is{" "}
            <strong className="text-ink">not published</strong> and{" "}
            <strong className="text-ink">nothing has been charged</strong>. You will see the outcome
            on this page, and you can withdraw it while it is still in the queue.
          </p>
          <p className="t-caption mt-[8px] text-muted">
            Whether an owner&rsquo;s listing publishes after review, when, and on what terms is part
            of the owner policy still to be confirmed with the client. Nothing here decides it.
          </p>
        </Card>
      ) : null}

      <div className="mt-[16px] flex flex-wrap items-center gap-[12px]">
        <Chip tone={state.tone}>{state.label}</Chip>
        <p className="t-body min-w-0 text-body">{state.line}</p>
      </div>

      <div className="mt-[18px] flex flex-wrap gap-[10px]">
        {editable ? (
          <ButtonLink href={`/owner/listings/${id}/basics`}>
            {done === 0 ? "Start filling it in" : "Edit the listing"}
          </ButtonLink>
        ) : null}
        {editable && done > 0 ? (
          <ButtonLink href={`/owner/listings/${id}/preview`} variant="secondary">
            Preview and send
          </ButtonLink>
        ) : null}
        <ButtonLink href="/owner/listings" variant="secondary">
          All my listings
        </ButtonLink>
      </div>

      <Card className="mt-[20px] p-[22px]">
        <SectionHeader title="What it says" />
        <dl className="mt-[12px] grid grid-cols-2 gap-[14px] max-[560px]:grid-cols-1">
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
          <Row
            label="Configuration"
            value={listing.configuration === null ? "Not set" : `${listing.configuration} BHK`}
          />
          <Row label="Carpet area" value={listing.carpetArea ? `${listing.carpetArea} sq ft` : "Not set"} />
          <Row
            label="Photographs"
            value={
              listing.photos.length === 0
                ? "None"
                : `${listing.photos.length} chosen · files not stored in this build`
            }
          />
          <Row
            label="Steps complete"
            value={`${done} of ${OWNER_STEPS.length}`}
          />
        </dl>
      </Card>

      {blockers.length > 0 ? (
        <Card className="mt-[16px] border-[#F3DFB4] bg-[#FFF7E8] p-[18px]">
          <h2 className="t-card-title text-ink">Still to fill in</h2>
          <ul className="mt-[8px] flex flex-col gap-[8px]">
            {blockers.map((b) => (
              <li key={`${b.step}-${b.message}`} className="t-body text-body">
                {b.message}{" "}
                <Link
                  href={`/owner/listings/${id}/${b.step}`}
                  className="font-semibold text-brand underline"
                >
                  Step {b.stepNumber}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="mt-[16px] p-[22px]">
        <SectionHeader title="Messages with the review team" />
        {listing.messages.length === 0 ? (
          <p className="t-body mt-[10px] text-muted">Nothing yet.</p>
        ) : (
          <ul className="mt-[12px] flex flex-col gap-[12px]">
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
        {listing.status === "draft" ? (
          <p className="t-caption mt-[12px] text-muted">
            A draft has not been sent, so there is nobody to write to yet.
          </p>
        ) : (
          <div className="mt-[16px] border-t border-line pt-[16px]">
            <OwnerReplyForm listingId={id} />
          </div>
        )}
      </Card>

      <Card className="mt-[16px] p-[22px]">
        <SectionHeader title="What has happened" />
        <ol className="mt-[12px] flex flex-col gap-[10px]">
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

      {listing.status === "submitted" ||
      listing.status === "in_review" ||
      listing.status === "changes_requested" ? (
        <Card className="mt-[16px] p-[22px]">
          <SectionHeader title="Take it back" />
          <p className="t-body mt-[6px] max-w-[70ch] text-body">
            Withdrawing takes the listing out of the queue and puts it back in your hands, with
            every field exactly as it is. Nothing is deleted and nothing was charged.
          </p>
          <div className="mt-[14px]">
            <OwnerWithdrawForm listingId={id} />
          </div>
        </Card>
      ) : null}

      <p className="t-caption mt-[20px] max-w-[70ch] text-muted">
        {listingStore() === "backend" ? (
          <>
            This draft is stored. Saving it does not publish it, and a file name is not kept as a
            photograph. Posting a property costs nothing in this build, and what it costs in the
            product is part of the owner policy still to be confirmed.
          </>
        ) : (
          <>
            In this review build your drafts are kept for the session only — durable storage for owner
            listings is a kkl-backend dependency and is not claimed here. Posting a property costs
            nothing in this build, and what it costs in the product is part of the owner policy still to
            be confirmed.
          </>
        )}
      </p>
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
