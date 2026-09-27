import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OwnerEditorShell } from "@/components/owner/owner-editor-shell";
import { OwnerStepForm, OWNER_STEP_FORM_ID } from "@/components/owner/owner-step-form";
import { OwnerPreview } from "@/components/owner/owner-preview";
import { OWNER_STATUS, ownerCanEdit } from "@/components/owner/owner-status";
import { AccessPanel } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { newOwnerToken } from "@/app/actions/owner-listings";
import { getServices } from "@/lib/services";
import { ServiceError } from "@/lib/services/contracts";
import { OWNER_STEPS, stepStates } from "@/lib/services/sample/owner-listing-store";
import type { OwnerListingStepId } from "@/lib/domain/types";

export const metadata: Metadata = { title: "Post your property", robots: { index: false } };

const STEP_IDS = OWNER_STEPS.map((s) => s.id);

function isStep(raw: string): raw is OwnerListingStepId {
  return (STEP_IDS as readonly string[]).includes(raw);
}

/**
 * CR02 — one step of the owner's posting journey.
 *
 * Every step is its own URL, so Back and Forward work, a step can be
 * bookmarked, and a reload puts the owner back where they were rather than at
 * the beginning.
 *
 * A listing that is with the review team is not editable, and this page says so
 * rather than rendering a form whose saves would be refused.
 */
export default async function OwnerStepPage({
  params,
}: {
  params: Promise<{ id: string; step: string }>;
}) {
  const { id, step } = await params;
  if (!isStep(step)) notFound();

  const services = getServices();
  let listing;
  try {
    listing = await services.ownerListings.getMine(id);
  } catch (error) {
    // Missing and not-yours are the same answer, so ownership cannot be probed.
    if (error instanceof ServiceError && error.kind === "not_found") notFound();
    throw error;
  }

  const steps = stepStates(listing);
  const index = STEP_IDS.indexOf(step);
  const previous = index > 0 ? `/owner/listings/${id}/${STEP_IDS[index - 1]}` : null;
  const next =
    index < STEP_IDS.length - 1
      ? `/owner/listings/${id}/${STEP_IDS[index + 1]}`
      : `/owner/listings/${id}`;
  const nextLabel = index < STEP_IDS.length - 1 ? "Save and continue →" : "Save and finish";

  if (!ownerCanEdit(listing.status)) {
    const state = OWNER_STATUS[listing.status];
    return (
      <div className="mx-auto max-w-[900px] px-[32px] py-[32px] max-[1060px]:px-[18px]">
        <AccessPanel
          tone="restricted"
          chipLabel={state.label}
          title="This listing cannot be edited right now"
          actions={
            <>
              <ButtonLink href={`/owner/listings/${id}`}>Back to the listing</ButtonLink>
              <ButtonLink href="/owner/listings" variant="secondary">
                All my listings
              </ButtonLink>
            </>
          }
          footnote="Nothing you have entered has been lost. Withdrawing puts the listing back in your hands with every field as it was."
        >
          <p>
            {state.line} You can withdraw it from{" "}
            <Link href={`/owner/listings/${id}`} className="font-semibold text-brand">
              the listing page
            </Link>{" "}
            if you need to change something.
          </p>
        </AccessPanel>
      </div>
    );
  }

  const areas = await services.locations.areaOptions({ cityId: "in-wb-kol" });

  return (
    <OwnerEditorShell
      listingId={id}
      reference={listing.reference}
      listingTitle={listing.title}
      steps={steps}
      current={step}
      formId={step === "preview" ? null : OWNER_STEP_FORM_ID}
    >
      {step === "preview" ? (
        <OwnerPreview
          listing={listing}
          blockers={await services.ownerListings.blockers(id)}
          idempotencyKey={await newOwnerToken()}
        />
      ) : (
        <OwnerStepForm
          listing={listing}
          step={step}
          areas={areas}
          previousHref={previous}
          nextHref={next}
          nextLabel={nextLabel}
        />
      )}
    </OwnerEditorShell>
  );
}
