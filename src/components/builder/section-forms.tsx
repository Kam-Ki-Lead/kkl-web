"use client";

import { useActionState } from "react";
import {
  saveListingSection,
  type SectionFormState,
} from "@/app/actions/builder-listings";
import {
  NoScriptSaveNotice,
  RestoredDraftNotice,
  SavedSignal,
} from "@/components/builder/unsaved-changes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Select, TextArea, TextInput } from "@/components/ui/field";
import { AreaPicker, type AreaOption } from "@/components/location/area-picker";
import type { ListingDraft, ListingSectionId } from "@/lib/domain/types";

/**
 * The five editable sections of the listing editor (B-08 to B-12).
 *
 * One component rather than five files, because they are the same form with
 * different fields: same save action, same draft-or-continue footer, same
 * previous/next navigation. Splitting them would duplicate that shell five
 * times and let it drift.
 *
 * Every section saves independently and none blocks another. "Save draft" and
 * "Next" post the same fields; the only difference is where they land.
 */

const PROPERTY_TYPES = ["Apartment", "Builder floor", "Villa / row house", "Plot"];
const CONFIGURATIONS = ["1", "2", "3", "4", "5"];
const AMENITIES = [
  "Lift",
  "Power backup",
  "Covered parking",
  "Children's play area",
  "Community hall",
  "Rainwater harvesting",
  "24×7 security",
  "Landscaped garden",
  "Gymnasium",
  "Swimming pool",
];

/**
 * The id the B-15 guard uses to find this form.
 *
 * It is shared rather than passed because the guard wraps the editor from
 * outside — the header mark and the exit dialog are above and below the form in
 * the tree — and a string both sides import cannot drift the way two literals
 * would.
 */
export const SECTION_FORM_ID = "listing-section-form";

export function SectionForm({
  listing,
  section,
  areas,
  previousHref,
  nextHref,
  nextLabel,
}: {
  listing: ListingDraft;
  section: ListingSectionId;
  /** The launch city's area records, from the location service (CR05). */
  areas: readonly AreaOption[];
  previousHref: string | null;
  nextHref: string;
  nextLabel: string;
}) {
  const [state, action, pending] = useActionState<SectionFormState, FormData>(
    saveListingSection,
    { status: "idle" },
  );

  return (
    <form id={SECTION_FORM_ID} action={action} className="flex flex-col gap-[16px]">
      <input type="hidden" name="listingId" value={listing.id} />
      <input type="hidden" name="section" value={section} />
      <SavedSignal savedAt={state.savedAt} />
      <RestoredDraftNotice />

      {state.status === "saved" ? (
        <p
          role="status"
          className="rounded-[8px] bg-chip-success-bg px-[14px] py-[10px] text-[14px] font-semibold text-success"
        >
          Draft saved.
        </p>
      ) : null}

      {section === "basics" ? <BasicsFields listing={listing} /> : null}
      {section === "location" ? <LocationFields listing={listing} areas={areas} /> : null}
      {section === "pricing" ? <PricingFields listing={listing} /> : null}
      {section === "specifications" ? <SpecificationFields listing={listing} /> : null}
      {section === "media" ? <MediaFields listing={listing} /> : null}

      <div className="flex flex-wrap items-center gap-[10px] border-t border-line pt-[16px]">
        {previousHref ? (
          <Button
            type="submit"
            name="next"
            value={previousHref}
            variant="secondary"
            disabled={pending}
          >
            ← Previous section
          </Button>
        ) : null}
        <Button type="submit" name="next" value={nextHref} disabled={pending}>
          {pending ? "Saving…" : nextLabel}
        </Button>
      </div>

      {/* B-15. The dirty mark, the exit dialog and the reload warning are all
          client behaviour; with scripting off none of them exist and nothing
          here pretends they do. What still works is the part that matters
          most: every control above is a submit button, so a section can be
          saved and the editor left without losing anything. */}
      <NoScriptSaveNotice />
    </form>
  );
}

function BasicsFields({ listing }: { listing: ListingDraft }) {
  return (
    <>
      <Field id="title" label="Project name">
        <TextInput id="title" name="title" defaultValue={listing.title} />
      </Field>

      <Field
        id="propertyType"
        label="Property type"
        helper="The search field is confirmed; this value list is a design proposal awaiting client confirmation (D-09)."
      >
        <Select
          id="propertyType"
          name="propertyType"
          defaultValue={listing.propertyType ?? ""}
          aria-describedby="propertyType-helper"
        >
          <option value="">Choose a type</option>
          {PROPERTY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        id="possessionTarget"
        label="Possession target"
        helper="Leave blank for a ready-to-move project."
      >
        <TextInput
          id="possessionTarget"
          name="possessionTarget"
          placeholder="Dec 2028"
          defaultValue={listing.possessionTarget ?? ""}
        />
      </Field>

      <Field id="description" label="Description">
        <TextArea id="description" name="description" rows={5} defaultValue={listing.description} />
      </Field>
    </>
  );
}

function LocationFields({
  listing,
  areas,
}: {
  listing: ListingDraft;
  areas: readonly AreaOption[];
}) {
  return (
    <>
      <Field id="locality" label="Locality">
        {/* Searchable over the location records; the draft stores the record
            id, never a typed name (CR05). */}
        <AreaPicker
          id="locality"
          name="locality"
          areas={areas}
          defaultValue={listing.localityId ?? ""}
          allLabel="Choose a locality"
        />
      </Field>

      <Field
        id="addressLine"
        label="Street address"
        helper="Shown on the listing. A map pin is not collected — map integration is out of scope."
      >
        <TextInput
          id="addressLine"
          name="addressLine"
          defaultValue={listing.addressLine}
          aria-describedby="addressLine-helper"
        />
      </Field>
    </>
  );
}

function PricingFields({ listing }: { listing: ListingDraft }) {
  return (
    <>
      <input type="hidden" name="configurationsPresent" value="1" />
      <fieldset>
        <legend className="t-label mb-[8px] text-ink">Configurations</legend>
        <div className="flex flex-wrap gap-[8px]">
          {CONFIGURATIONS.map((c) => (
            <label
              key={c}
              className="inline-flex min-h-[40px] cursor-pointer items-center gap-[8px] rounded-full border-[1.5px] border-line bg-white px-[14px] text-[15px] font-semibold text-body has-[:checked]:border-brand has-[:checked]:bg-chip-neutral-bg has-[:checked]:text-brand"
            >
              <input
                type="checkbox"
                name="configurations"
                value={c}
                defaultChecked={listing.configurations.includes(c)}
                className="h-[16px] w-[16px]"
              />
              {c} BHK
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-[14px] max-[560px]:grid-cols-1">
        <Field id="priceMinInr" label="Lowest price (₹)">
          <TextInput
            id="priceMinInr"
            name="priceMinInr"
            inputMode="numeric"
            placeholder="7800000"
            defaultValue={listing.priceMinInr ?? ""}
          />
        </Field>
        <Field id="priceMaxInr" label="Highest price (₹)">
          <TextInput
            id="priceMaxInr"
            name="priceMaxInr"
            inputMode="numeric"
            placeholder="14000000"
            defaultValue={listing.priceMaxInr ?? ""}
          />
        </Field>
      </div>

      <p className="t-caption text-muted">
        Prices are yours to set and are shown to buyers as entered. Kam Ki Lead does not add a
        margin, and the platform&rsquo;s own lead prices are a separate, unresolved decision (D-03).
      </p>
    </>
  );
}

function SpecificationFields({ listing }: { listing: ListingDraft }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-[14px] max-[560px]:grid-cols-1">
        <Field id="areaMin" label="Smallest carpet area">
          <TextInput id="areaMin" name="areaMin" placeholder="985 sq ft" defaultValue={listing.areaMin} />
        </Field>
        <Field id="areaMax" label="Largest carpet area">
          <TextInput id="areaMax" name="areaMax" placeholder="1,420 sq ft" defaultValue={listing.areaMax} />
        </Field>
      </div>

      <Field id="totalUnits" label="Total units">
        <TextInput id="totalUnits" name="totalUnits" inputMode="numeric" defaultValue={listing.totalUnits} />
      </Field>

      <input type="hidden" name="amenitiesPresent" value="1" />
      <fieldset>
        <legend className="t-label mb-[8px] text-body">Amenities</legend>
        <div className="flex flex-wrap gap-[8px]">
          {AMENITIES.map((a) => (
            <label
              key={a}
              className="inline-flex min-h-[40px] cursor-pointer items-center gap-[8px] rounded-full border-[1.5px] border-line bg-white px-[14px] text-[15px] font-semibold text-body has-[:checked]:border-brand has-[:checked]:bg-brand has-[:checked]:text-white"
            >
              <input
                type="checkbox"
                name="amenities"
                value={a}
                defaultChecked={listing.amenities.includes(a)}
                className="h-[16px] w-[16px]"
              />
              {a}
            </label>
          ))}
        </div>
      </fieldset>

      <input type="hidden" name="reraRegisteredPresent" value="1" />
      <label className="flex min-h-[44px] cursor-pointer items-center gap-[10px] rounded-[8px] border border-line px-[12px]">
        <input type="checkbox" name="reraRegistered" defaultChecked={listing.reraRegistered} />
        <span className="text-[15px] text-ink">This project is RERA registered</span>
      </label>

      <Field
        id="reraNumber"
        label="RERA number"
        helper="Shown on the listing when present. Nothing here is checked against a RERA register — that verification is not built."
      >
        <TextInput
          id="reraNumber"
          name="reraNumber"
          defaultValue={listing.reraNumber ?? ""}
          aria-describedby="reraNumber-helper"
        />
      </Field>
    </>
  );
}

/**
 * B-12 media.
 *
 * The count of photographs is recorded; the bytes are not. Media storage needs
 * a location kkl-backend controls, a scan and a retention rule, none of which
 * exist — and accepting a file and dropping it would leave a Builder believing
 * their photographs were uploaded. The screen says so instead.
 */
function MediaFields({ listing }: { listing: ListingDraft }) {
  return (
    <>
      <Card className="bg-tint p-[18px]">
        {/* The approved control is a dashed brand button labelled "Add
            photographs"; the label is that control, since it opens the file
            picker. */}
        <label
          htmlFor="photos"
          className="inline-flex cursor-pointer items-center rounded-[8px] border-[2px] border-dashed border-[#A9B2CE] bg-white px-[22px] py-[15px] text-[15px] font-bold text-brand transition-[background-color,border-color] duration-150 hover:border-brand hover:bg-[#F6F8FD]"
        >
          Add photographs
        </label>
        <p className="mt-[6px] text-[14px] text-muted">
          JPG or PNG, up to 5 MB each. The first photograph becomes the cover.
        </p>
        <input
          id="photos"
          name="photos"
          type="file"
          accept="image/jpeg,image/png"
          multiple
          className="mt-[6px] block w-full cursor-pointer rounded-[8px] border border-dashed border-[#B9C3EC] bg-white px-[13px] py-[11px] text-[15px] text-body file:mr-[12px] file:cursor-pointer file:rounded-[6px] file:border-0 file:bg-chip-neutral-bg file:px-[13px] file:py-[8px] file:text-[14px] file:font-semibold file:text-brand"
        />

        <p className="t-caption mt-[10px] text-warning">
          <strong>Nothing is uploaded yet.</strong> Media storage, virus scanning and a retention
          rule are kkl-backend&rsquo;s and do not exist. To review the editor end to end, record how
          many photographs a listing has below — the count is what the preview and the publish
          check read.
        </p>

        <Field
          id="photoCount"
          label="Photographs on this listing (review stand-in)"
          className="mt-[12px]"
        >
          <TextInput
            id="photoCount"
            name="photoCount"
            inputMode="numeric"
            defaultValue={String(listing.media.length)}
          />
        </Field>
      </Card>

      {listing.media.length === 0 ? (
        <p className="t-body text-body">
          <strong className="text-ink">No photographs yet.</strong> A listing can be saved as a
          draft without them, but it cannot be published without at least one.
        </p>
      ) : (
        <p className="t-body text-body">
          {listing.media.length} {listing.media.length === 1 ? "photograph" : "photographs"} on
          this listing. The portal renders the designed no-image fallback, because no file was
          kept.
        </p>
      )}

      <Field
        id="videoUrl"
        label="Video link (optional)"
        helper="360° walkthroughs are out of scope, so only a standard video link is offered."
      >
        <TextInput
          id="videoUrl"
          name="videoUrl"
          type="url"
          placeholder="https://"
          defaultValue={listing.videoUrl ?? ""}
          aria-describedby="videoUrl-helper"
        />
      </Field>
    </>
  );
}
