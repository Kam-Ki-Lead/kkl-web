"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SAMPLE_STAFF } from "@/lib/domain/identity";
import type { OwnerListingBlocker, OwnerListingStepId } from "@/lib/domain/types";
import { getServices } from "@/lib/services";
import { ValidationError } from "@/lib/services/contracts";

/**
 * CR02 — the individual owner's posting journey, and the staff handling of it.
 *
 * What submission does, and what it does not
 * ------------------------------------------
 * `submitListing` moves a completed draft into the owner-submission queue.
 * That is all it does. It does not publish the listing, it does not charge the
 * owner, and it does not award any verification. Those are governed by the
 * owner policy that is still open (D-10, D-18), and the confirmed instruction
 * for this journey is that nothing goes live by itself. The confirmation
 * screen says exactly that, in those words, rather than "your property is now
 * listed".
 *
 * The owner is never a field
 * --------------------------
 * The service associates the account from the server-side identity — in this
 * build, the single sample owner. No hidden input names the account, so no
 * form can post a listing as somebody else.
 *
 * Idempotency
 * -----------
 * Starting a draft and submitting one each carry a token minted by the page.
 * A double click or a retried POST returns what the first one produced rather
 * than creating a second draft or queueing the listing twice.
 *
 * Persistence
 * -----------
 * With KKL_LISTINGS=backend the draft is stored by kkl-backend and survives a
 * frontend restart. Saving a step does not publish it, and sending it for
 * review does not publish it either. A file name is not stored as a
 * photograph: object storage is not configured, and this action does not
 * create a media row to stand in for the file.
 * With the sample store, drafts stay in process memory.
 */

function revalidateOwner(id?: string) {
  revalidatePath("/owner/listings");
  revalidatePath("/post-property");
  if (id) {
    revalidatePath(`/owner/listings/${id}`, "layout");
    revalidatePath(`/admin/owner-listings/${id}`);
  }
  revalidatePath("/admin/owner-listings");
}

/** A fresh token for one visit to a page that can create or submit. */
export async function newOwnerToken(): Promise<string> {
  return randomUUID();
}

export async function startOwnerListing(formData: FormData): Promise<void> {
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  // A missing or malformed key means the form was not the one we rendered.
  // Without one, a double submit would be indistinguishable from two
  // deliberate drafts, so it is refused rather than guessed at.
  const key = /^[0-9a-f-]{36}$/.test(idempotencyKey) ? idempotencyKey : randomUUID();
  const listing = await getServices().ownerListings.startDraft({ idempotencyKey: key });
  revalidateOwner(listing.id);
  redirect(`/owner/listings/${listing.id}/basics`);
}

export type OwnerStepFormState = {
  readonly status: "idle" | "saved";
  readonly errors?: Readonly<Record<string, string>>;
  /**
   * Changes on every successful save. The unsaved-changes mark clears when a
   * save lands, and "saved" alone cannot say that — two consecutive saves
   * return an identical object and the second would look like no change.
   */
  readonly savedAt?: number;
};

const STEP_IDS: readonly OwnerListingStepId[] = [
  "basics",
  "location",
  "pricing",
  "photos",
  "contact",
  "preview",
];

/**
 * Saves one step.
 *
 * Deliberately permissive about *absence*: a draft saves with any step
 * incomplete, because an owner filling in what they know first is the normal
 * case. What the listing needs before it can be submitted is checked
 * separately, on the preview, where it can be shown as a list of things to fix
 * with a link to each.
 */
export async function saveOwnerStep(
  _previous: OwnerStepFormState,
  formData: FormData,
): Promise<OwnerStepFormState> {
  const listingId = String(formData.get("listingId") ?? "");
  const step = String(formData.get("step") ?? "") as OwnerListingStepId;
  if (!STEP_IDS.includes(step)) {
    return { status: "idle", errors: { form: "That step was not recognised." } };
  }

  const values: Record<string, string | string[]> = {};
  for (const key of new Set(formData.keys())) {
    // `next` is navigation, not a field. It is validated below rather than
    // stored, because a redirect target taken from a form is an open redirect
    // unless it is checked.
    if (key === "listingId" || key === "step" || key === "next" || key === "$ACTION_ID") continue;
    const all = formData.getAll(key).map((v) => (typeof v === "string" ? v : v.name));
    values[key] = all.length > 1 ? all : (all[0] ?? "");
  }

  try {
    await getServices().ownerListings.saveStep({ listingId, step, values });
  } catch (error) {
    if (error instanceof ValidationError) return { status: "idle", errors: error.fields };
    throw error;
  }

  revalidateOwner(listingId);

  // Where the button said to go. Checked against this listing's own paths, not
  // merely "starts with a slash": a form value that can redirect anywhere is an
  // open redirect, and "//evil.example" starts with a slash.
  const next = String(formData.get("next") ?? "");
  const allowed = [
    `/owner/listings/${listingId}`,
    ...STEP_IDS.map((s) => `/owner/listings/${listingId}/${s}`),
  ];
  if (allowed.includes(next)) redirect(next);

  return { status: "saved", savedAt: Date.now() };
}

export type OwnerSubmitState = {
  readonly error?: string;
  readonly blockers?: readonly OwnerListingBlocker[];
};

export async function submitOwnerListing(
  _previous: OwnerSubmitState,
  formData: FormData,
): Promise<OwnerSubmitState> {
  const listingId = String(formData.get("listingId") ?? "");
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(idempotencyKey)) {
    return {
      error:
        "This submission could not be verified as a single send. Reload the preview and try again.",
    };
  }

  const result = await getServices().ownerListings.submit({ listingId, idempotencyKey });
  if (!result.ok) {
    return {
      error:
        result.blockers.length > 0
          ? "A few things are still missing. Each one links to the step that owns it."
          : "That listing could not be found.",
      blockers: result.blockers,
    };
  }

  revalidateOwner(listingId);
  redirect(`/owner/listings/${listingId}?sent=${encodeURIComponent(result.listing.reference)}`);
}

export type OwnerListingActionState = {
  readonly error?: string;
  readonly done?: string;
  /**
   * What was submitted, echoed back.
   *
   * Not a convenience. A server action's response re-renders the server tree
   * around these forms, and that re-render was observed to remount them: a
   * typed reason vanished and a `<select>` reverted to its first option. The
   * next click then recorded a decision nobody had chosen. Reading the controls
   * back from here means a re-render restores what the person had rather than
   * quietly replacing it.
   */
  readonly values?: Readonly<Record<string, string>>;
};

export async function withdrawOwnerListing(
  _previous: OwnerListingActionState,
  formData: FormData,
): Promise<OwnerListingActionState> {
  const listingId = String(formData.get("listingId") ?? "");
  const reason = String(formData.get("reason") ?? "");
  try {
    await getServices().ownerListings.withdraw({ listingId, reason });
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        error: Object.values(error.fields)[0] ?? "That could not be done.",
        values: { reason },
      };
    }
    throw error;
  }
  revalidateOwner(listingId);
  return {
    done: "Withdrawn. It is out of the review queue and editable again — nothing was published and nothing was charged.",
  };
}

export async function replyOnOwnerListing(
  _previous: OwnerListingActionState,
  formData: FormData,
): Promise<OwnerListingActionState> {
  const listingId = String(formData.get("listingId") ?? "");
  const body = String(formData.get("body") ?? "");
  try {
    await getServices().ownerListings.reply({ listingId, body });
  } catch (error) {
    if (error instanceof ValidationError) {
      // The message comes back with the error, so nothing has to be retyped.
      return { error: Object.values(error.fields)[0] ?? "That could not be sent.", values: { body } };
    }
    throw error;
  }
  revalidateOwner(listingId);
  return { done: "Sent. The review team sees it on this listing." };
}

// ------------------------------------------------------------- staff side --

export async function respondToOwnerListing(
  _previous: OwnerListingActionState,
  formData: FormData,
): Promise<OwnerListingActionState> {
  const listingId = String(formData.get("listingId") ?? "");
  // Same rule as the support console and CR03: anything that is not exactly
  // "internal" is a message to the owner. A staff note shown to an owner is a
  // leak; a message shown to staff is not.
  const internal = formData.get("mode") === "internal";
  const body = String(formData.get("body") ?? "");
  const echo = { mode: internal ? "internal" : "public" };

  const result = await getServices().admin.respondToOwnerListing({
    actor: SAMPLE_STAFF,
    listingId,
    body,
    internal,
  });
  // On failure the text comes back; on success it does not, because it was sent.
  if (!result.ok) return { error: result.error, values: { ...echo, body } };

  revalidateOwner(listingId);
  return {
    done: internal
      ? "Internal note added. It stays in this console — the owner's own view of the listing has no field that could carry it."
      : "Message sent. It is now on the owner's own view of this listing.",
    values: echo,
  };
}

const DECISIONS = ["in_review", "changes_requested", "cleared", "declined"] as const;
type Decision = (typeof DECISIONS)[number];

export async function decideOwnerListing(
  _previous: OwnerListingActionState,
  formData: FormData,
): Promise<OwnerListingActionState> {
  const listingId = String(formData.get("listingId") ?? "");
  const raw = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const echo = { decision: raw, reason };
  if (!DECISIONS.includes(raw as Decision)) {
    return { error: "That decision was not recognised.", values: echo };
  }

  const result = await getServices().admin.decideOwnerListing({
    actor: SAMPLE_STAFF,
    listingId,
    decision: raw as Decision,
    reason,
  });
  // A refused decision keeps both the choice and the reason, so the next
  // attempt is the one the staff member meant rather than the default.
  if (!result.ok) return { error: result.error, values: echo };

  revalidateOwner(listingId);
  revalidatePath("/admin/audit");
  return {
    done:
      raw === "cleared"
        ? "Recorded as cleared. The listing is NOT published — whether an owner's listing publishes, and on what terms, is part of the owner policy still to be confirmed."
        : "Recorded. The owner sees the outcome and the reason on their own view of the listing.",
    values: { decision: raw },
  };
}
