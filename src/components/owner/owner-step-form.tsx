"use client";

import { useActionState, useId, useState } from "react";
import { saveOwnerStep, type OwnerStepFormState } from "@/app/actions/owner-listings";
import {
  NoScriptSaveNotice,
  RestoredDraftNotice,
  SavedSignal,
} from "@/components/builder/unsaved-changes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Select, TextArea, TextInput } from "@/components/ui/field";
import { AreaPicker, type AreaOption } from "@/components/location/area-picker";
import { photographRecordLabel } from "@/lib/domain/listing-photographs";
import type { OwnerListing, OwnerListingStepId } from "@/lib/domain/types";

/**
 * CR02 — the five editable steps of the owner's posting journey.
 *
 * One component rather than five files: the same form with different fields,
 * the same save action, the same previous/next footer. Splitting them would
 * duplicate that shell five times and let it drift.
 *
 * Every step saves on its own and none blocks another. "Save draft" and the
 * next button post the same fields; the only difference is where they land.
 */

/** The id the unsaved-changes guard uses to find this form. Shared, not passed,
 *  because the guard wraps the editor from outside and two literals would drift. */
export const OWNER_STEP_FORM_ID = "owner-step-form";

const PROPERTY_TYPES: readonly { value: string; label: string }[] = [
  { value: "apartment", label: "Apartment" },
  { value: "villa", label: "Villa / independent house" },
  { value: "plot", label: "Plot" },
  { value: "commercial", label: "Commercial" },
];

const CONFIGURATIONS = ["1", "2", "3", "4+"];

const FURNISHING: readonly { value: string; label: string }[] = [
  { value: "unfurnished", label: "Unfurnished" },
  { value: "semi", label: "Semi-furnished" },
  { value: "furnished", label: "Fully furnished" },
];

export function OwnerStepForm({
  listing,
  step,
  areas,
  previousHref,
  nextHref,
  nextLabel,
  keepsPhotographNames = true,
}: {
  listing: OwnerListing;
  step: OwnerListingStepId;
  /** The launch city's area records, from the location service (CR05). */
  areas: readonly AreaOption[];
  previousHref: string | null;
  nextHref: string;
  nextLabel: string;
  /**
   * Sample drafts remember chosen file names in process memory. A backend
   * draft can record the selected file's name, type and size. That row is
   * declared metadata: the bytes are not uploaded, and it does not complete
   * the photograph step.
   */
  keepsPhotographNames?: boolean;
}) {
  const [state, action, pending] = useActionState<OwnerStepFormState, FormData>(saveOwnerStep, {
    status: "idle",
  });
  const errors = state.errors ?? {};

  return (
    <form id={OWNER_STEP_FORM_ID} action={action} className="flex flex-col gap-[16px]">
      <input type="hidden" name="listingId" value={listing.id} />
      <input type="hidden" name="step" value={step} />
      <SavedSignal savedAt={state.savedAt} />
      <RestoredDraftNotice />

      {errors.form ? (
        <p
          role="alert"
          className="rounded-[8px] border border-[#F3C4BF] bg-chip-danger-bg px-[14px] py-[10px] text-[14px] font-semibold text-danger"
        >
          {errors.form}
        </p>
      ) : null}

      {state.status === "saved" ? (
        <p
          role="status"
          className="rounded-[8px] bg-chip-success-bg px-[14px] py-[10px] text-[14px] font-semibold text-success"
        >
          Draft saved. Nothing has been sent or published.
        </p>
      ) : null}

      {step === "basics" ? <BasicsFields listing={listing} errors={errors} /> : null}
      {step === "location" ? <LocationFields listing={listing} areas={areas} errors={errors} /> : null}
      {step === "pricing" ? <PricingFields listing={listing} errors={errors} /> : null}
      {step === "photos" ? (
        <PhotoFields listing={listing} errors={errors} keepsPhotographNames={keepsPhotographNames} />
      ) : null}
      {step === "contact" ? <ContactFields listing={listing} errors={errors} /> : null}

      <div className="flex flex-wrap items-center gap-[10px] border-t border-line pt-[16px]">
        {previousHref ? (
          <Button type="submit" name="next" value={previousHref} variant="secondary" disabled={pending}>
            ← Previous step
          </Button>
        ) : null}
        <Button type="submit" name="next" value={nextHref} disabled={pending}>
          {pending ? "Saving…" : nextLabel}
        </Button>
      </div>

      {/* The dirty mark, the exit dialog and the reload warning are all client
          behaviour; with scripting off none of them exist and nothing here
          pretends they do. What still works is what an owner would actually
          lose work to: every control above is a submit button, so moving
          through the steps saves on the way. */}
      <NoScriptSaveNotice />
    </form>
  );
}

type Errors = Readonly<Record<string, string>>;

function BasicsFields({ listing, errors }: { listing: OwnerListing; errors: Errors }) {
  return (
    <>
      <Field
        id="title"
        label="What are you listing?"
        helper="How buyers will see it in a list — for example “2 BHK in Salt Lake Sector II”."
        error={errors.title}
      >
        <TextInput id="title" name="title" defaultValue={listing.title} invalid={Boolean(errors.title)} />
      </Field>

      <fieldset className="flex flex-col gap-[6px]">
        <legend className="t-label text-body">Are you selling or letting it out?</legend>
        <div className="flex flex-wrap gap-[10px]">
          {(
            [
              { value: "sell", label: "Selling" },
              { value: "rent", label: "Letting out" },
            ] as const
          ).map((o) => (
            <label
              key={o.value}
              className="flex min-h-[44px] cursor-pointer items-center gap-[8px] rounded-[8px] border-[1.5px] border-control-border bg-white px-[14px] text-[15px] text-ink has-[:checked]:border-brand has-[:checked]:bg-chip-neutral-bg"
            >
              <input
                type="radio"
                name="intent"
                value={o.value}
                defaultChecked={listing.intent === o.value}
              />
              {o.label}
            </label>
          ))}
        </div>
        <p className="t-caption text-muted">
          Whether owners may post rentals at launch is part of the owner policy still to be
          confirmed. Both are shown so the client can see the journey either way.
        </p>
      </fieldset>

      <Field id="propertyType" label="Property type" error={errors.propertyType}>
        <Select id="propertyType" name="propertyType" defaultValue={listing.propertyType ?? ""}>
          <option value="">Choose a type</option>
          {PROPERTY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        id="description"
        label="Anything a buyer should know"
        helper="Optional. Facing, floor, what is nearby, why you are selling — whatever you would say on a call."
        error={errors.description}
      >
        <TextArea
          id="description"
          name="description"
          rows={5}
          defaultValue={listing.description}
          invalid={Boolean(errors.description)}
        />
      </Field>
    </>
  );
}

function LocationFields({
  listing,
  areas,
  errors,
}: {
  listing: OwnerListing;
  areas: readonly AreaOption[];
  errors: Errors;
}) {
  return (
    <>
      <Field
        id="locality"
        label="Locality"
        helper="Start typing to search localities across Kolkata. The same records search, listings and lead filters use."
        error={errors.locality}
      >
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
        label="Block, street or landmark"
        helper="Optional, and not shown publicly while the owner policy on contact and address visibility is open. It helps the team place the property."
        error={errors.addressLine}
      >
        <TextInput
          id="addressLine"
          name="addressLine"
          defaultValue={listing.addressLine}
          invalid={Boolean(errors.addressLine)}
        />
      </Field>
    </>
  );
}

function PricingFields({ listing, errors }: { listing: OwnerListing; errors: Errors }) {
  const renting = listing.intent === "rent";
  return (
    <>
      <Field id="configuration" label="Configuration" error={errors.configuration}>
        <Select id="configuration" name="configuration" defaultValue={listing.configuration ?? ""}>
          <option value="">Choose</option>
          {CONFIGURATIONS.map((c) => (
            <option key={c} value={c}>
              {c} BHK
            </option>
          ))}
        </Select>
      </Field>

      <Field
        id="price"
        label={renting ? "Monthly rent (₹)" : "Price you expect (₹)"}
        helper={
          renting
            ? "What you would ask per month. KKL does not set or check this."
            : "What you would ask. KKL does not set or check this, and nothing is charged to list."
        }
        error={errors.price}
      >
        <TextInput
          id="price"
          name="price"
          inputMode="numeric"
          placeholder={renting ? "e.g. 28000" : "e.g. 7200000"}
          defaultValue={listing.priceInr === null ? "" : String(listing.priceInr)}
          invalid={Boolean(errors.price)}
        />
      </Field>

      <Field id="carpetArea" label="Carpet area (sq ft)" error={errors.carpetArea}>
        <TextInput
          id="carpetArea"
          name="carpetArea"
          inputMode="numeric"
          placeholder="e.g. 985"
          defaultValue={listing.carpetArea}
          invalid={Boolean(errors.carpetArea)}
        />
      </Field>

      <Field id="floorLabel" label="Floor" helper="Optional — for example “4th of 6”.">
        <TextInput id="floorLabel" name="floorLabel" defaultValue={listing.floorLabel} />
      </Field>

      <Field id="furnishing" label="Furnishing">
        <Select id="furnishing" name="furnishing" defaultValue={listing.furnishing ?? ""}>
          <option value="">Not saying</option>
          {FURNISHING.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field id="availableFrom" label="Available from" helper="Optional — “Immediately”, “March 2027”.">
        <TextInput id="availableFrom" name="availableFrom" defaultValue={listing.availableFrom} />
      </Field>
    </>
  );
}

/**
 * The photographs step.
 *
 * The file picker lists names in this browser. It does not upload the file.
 * A sample draft can remember those names in process memory. A backend draft
 * can record the selected file's name, type and size. That row is declared
 * metadata: object storage is not configured, so the bytes are not accepted
 * and the row does not satisfy the photograph requirement.
 */
function PhotoFields({
  listing,
  errors,
  keepsPhotographNames,
}: {
  listing: OwnerListing;
  errors: Errors;
  keepsPhotographNames: boolean;
}) {
  const [chosen, setChosen] = useState<{ name: string; size: string; bytes?: number; type?: string }[]>(
    keepsPhotographNames
      ? listing.photos.map((p) => ({ name: p.fileName, size: p.sizeLabel }))
      : [],
  );
  const inputId = useId();

  return (
    <>
      <Card className="bg-tint p-[18px]">
        <label
          htmlFor={inputId}
          className="inline-flex min-h-[44px] cursor-pointer items-center rounded-[8px] border-[2px] border-dashed border-control-border bg-white px-[22px] py-[12px] text-[15px] font-bold text-brand hover:border-brand hover:bg-chip-neutral-bg"
        >
          Choose photographs
        </label>
        <p className="t-caption mt-[6px] text-muted">
          {keepsPhotographNames
            ? "JPG or PNG. The first one becomes the cover. Up to twelve."
            : "JPG, PNG or WebP. Up to twelve. A file selected here is not uploaded."}
        </p>
        <input
          id={inputId}
          type="file"
          accept={keepsPhotographNames ? "image/jpeg,image/png" : "image/jpeg,image/png,image/webp"}
          multiple
          className="mt-[8px] block w-full cursor-pointer rounded-[8px] border border-dashed border-control-border bg-white px-[13px] py-[11px] text-[15px] text-body file:mr-[12px] file:cursor-pointer file:rounded-[6px] file:border-0 file:bg-chip-neutral-bg file:px-[13px] file:py-[8px] file:text-[14px] file:font-semibold file:text-brand"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            setChosen(
              files.slice(0, 12).map((f) => ({
                name: f.name,
                size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
                bytes: f.size,
                type: f.type,
              })),
            );
          }}
        />

        <p className="t-caption mt-[12px] rounded-[8px] border border-[#F3DFB4] bg-[#FFF7E8] px-[13px] py-[10px] text-body">
          {keepsPhotographNames ? (
            <>
              <strong className="text-ink">These files are not uploaded.</strong> The names below are
              recorded so the listing, the preview and the review team show the right number of
              photographs, but the images themselves are not stored anywhere in this build. Media
              storage belongs to kkl-backend and does not exist yet.
            </>
          ) : (
            <>
              <strong className="text-ink">These files are not uploaded.</strong> A file you select
              stays in this browser until you save. Saving records its name, type and size as a
              declared file. Object storage is not configured, so the file cannot be accepted, and
              a declared record does not satisfy the photograph requirement. The rest of this draft
              still saves.
            </>
          )}
        </p>
      </Card>

      {errors.photos ? (
        <p role="alert" className="t-caption text-danger">
          {errors.photos}
        </p>
      ) : null}

      {!keepsPhotographNames && listing.photos.length > 0 ? (
        <ul className="flex flex-col gap-[8px]">
          {listing.photos.map((photo) => (
            <li
              key={photo.id}
              className="flex flex-wrap items-center justify-between gap-[10px] rounded-[8px] border border-line bg-white px-[13px] py-[10px]"
            >
              <span className="min-w-0 break-words text-[15px] text-ink">
                {photo.fileName}
                <span className="t-caption ml-[8px] text-muted">
                  {photo.sizeLabel} · {photographRecordLabel(photo)}
                </span>
              </span>
              <button
                type="submit"
                name="removePhotoId"
                value={photo.id}
                className="min-h-[44px] rounded-[8px] border border-line px-[13px] text-[14px] font-semibold text-body hover:border-brand-mist"
              >
                Remove record
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {chosen.length === 0 && (keepsPhotographNames || listing.photos.length === 0) ? (
        <p className="t-body text-muted">No photographs on this listing yet.</p>
      ) : chosen.length > 0 ? (
        <ul className="flex flex-col gap-[8px]">
          {chosen.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex flex-wrap items-center justify-between gap-[10px] rounded-[8px] border border-line bg-white px-[13px] py-[10px]"
            >
              <span className="min-w-0 break-words text-[15px] text-ink">
                {keepsPhotographNames && i === 0 ? <strong>Cover · </strong> : null}
                {f.name}
                <span className="t-caption ml-[8px] text-muted">
                  {f.size} · {keepsPhotographNames ? "not stored" : "selected here, not saved"}
                </span>
              </span>
              <button
                type="button"
                className="min-h-[44px] rounded-[8px] border border-line px-[13px] text-[14px] font-semibold text-body hover:border-brand-mist"
                onClick={() => setChosen((prev) => prev.filter((_, at) => at !== i))}
              >
                Remove
              </button>
              {keepsPhotographNames ? (
                <>
                  <input type="hidden" name="photoNames" value={f.name} />
                  <input type="hidden" name="photoSizes" value={f.size} />
                </>
              ) : (
                <>
                  <input type="hidden" name="photoFileName" value={f.name} />
                  <input type="hidden" name="photoByteSize" value={String(f.bytes ?? "")} />
                  <input type="hidden" name="photoContentType" value={f.type ?? ""} />
                </>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {keepsPhotographNames ? (
        // With scripting off the list above cannot be built from the file input,
        // so the sample draft still needs a way to say how many names it holds.
        <noscript>
          <Field
            id="photoNamesFallback"
            label="Photograph file names, one per line (without JavaScript)"
            helper="The file picker above cannot list what you chose without scripting. Type the file names so the listing records the right number."
          >
            <TextArea id="photoNamesFallback" name="photoNames" rows={4} />
          </Field>
        </noscript>
      ) : (
        <noscript>
          <p className="t-caption text-body">
            Without JavaScript a file cannot be selected here. Typing a name would not upload a
            photograph and is not recorded. The other steps of this draft still save.
          </p>
        </noscript>
      )}
    </>
  );
}

function ContactFields({ listing, errors }: { listing: OwnerListing; errors: Errors }) {
  return (
    <>
      <Field
        id="contactName"
        label="Name buyers will see"
        helper="Your own name, or how you want to be addressed."
        error={errors.contactName}
      >
        <TextInput
          id="contactName"
          name="contactName"
          defaultValue={listing.contactName}
          invalid={Boolean(errors.contactName)}
        />
      </Field>

      <fieldset className="flex flex-col gap-[6px]">
        <legend className="t-label text-body">How should buyers contact you?</legend>
        <div className="flex flex-wrap gap-[10px]">
          {(
            [
              { value: "phone", label: "Phone call" },
              { value: "whatsapp", label: "WhatsApp" },
              { value: "either", label: "Either" },
            ] as const
          ).map((o) => (
            <label
              key={o.value}
              className="flex min-h-[44px] cursor-pointer items-center gap-[8px] rounded-[8px] border-[1.5px] border-control-border bg-white px-[14px] text-[15px] text-ink has-[:checked]:border-brand has-[:checked]:bg-chip-neutral-bg"
            >
              <input
                type="radio"
                name="contactPreference"
                value={o.value}
                defaultChecked={listing.contactPreference === o.value}
              />
              {o.label}
            </label>
          ))}
        </div>
        <p className="t-caption text-muted">
          Your preference is shown on the listing. Your number itself is not collected here and is
          not shown on this screen — how and when an owner&rsquo;s number reaches a buyer is part of
          the owner policy still to be confirmed.
        </p>
      </fieldset>
    </>
  );
}
