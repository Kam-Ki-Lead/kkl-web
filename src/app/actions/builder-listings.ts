"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServices } from "@/lib/services";
import type { ListingSectionId } from "@/lib/domain/types";

/**
 * Listing actions (B-07, B-08 to B-15).
 *
 * Publishing is the one operation here that changes what the public portal
 * shows, and it is the only listing rule the source documents actually define:
 * a published listing is visible while the subscription is active. Everything
 * else that could be inferred — moderation before or after publishing (D-10),
 * what happens to live listings on expiry (D-02) — is left to the screens to
 * present as undecided rather than settled quietly in an action.
 *
 * Every refusal is a designed state, returned rather than thrown: an incomplete
 * listing, an unverified account, no subscription, an expired one, a suspended
 * account. A Builder needs the next step, not a stack trace.
 */

/** Everything that changes what the portal shows has to invalidate both. */
function revalidateListing(id?: string) {
  revalidatePath("/builder/properties");
  revalidatePath("/builder");
  if (id) revalidatePath(`/builder/properties/${id}`);
  // The portal reads the same listings; a publish that did not refresh search
  // would make the continuity look broken when it is not.
  revalidatePath("/");
  revalidatePath("/search");
}

export async function createListing(): Promise<void> {
  const listing = await getServices().builder.listings.create();
  revalidateListing();
  redirect(`/builder/properties/${listing.id}/basics`);
}

export type SectionFormState = {
  readonly status: "idle" | "saved";
  readonly errors?: Readonly<Record<string, string>>;
};

/**
 * Saves one section of the editor.
 *
 * Deliberately permissive: a draft can be saved with any section incomplete,
 * which is the point of an editor split into six. What a listing needs before
 * it can be *published* is checked separately, on the preview section, where it
 * can be shown as a list of things to fix.
 */
export async function saveListingSection(
  _previous: SectionFormState,
  formData: FormData,
): Promise<SectionFormState> {
  const id = String(formData.get("listingId") ?? "");
  const section = String(formData.get("section") ?? "") as ListingSectionId;
  if (!id || !section) {
    return { status: "idle", errors: { form: "That listing could not be identified." } };
  }

  const values: Record<string, string | readonly string[] | boolean | null> = {};
  for (const [key, raw] of formData.entries()) {
    if (key === "listingId" || key === "section" || key === "next") continue;
    if (key === "configurations" || key === "amenities") continue;
    values[key] = typeof raw === "string" ? raw : null;
  }
  // Multi-value fields have to be read as a group, not overwritten one at a time.
  const configurations = formData.getAll("configurations").map(String);
  if (formData.has("configurationsPresent")) values.configurations = configurations;
  const amenities = formData.getAll("amenities").map(String);
  if (formData.has("amenitiesPresent")) values.amenities = amenities;
  if (formData.has("reraRegisteredPresent")) {
    values.reraRegistered = formData.get("reraRegistered") === "on";
  }

  await getServices().builder.listings.saveSection({ id, section, values });
  revalidateListing(id);

  const next = String(formData.get("next") ?? "");
  if (next.startsWith("/builder/")) redirect(next);
  return { status: "saved" };
}

export type PublishFormState = {
  readonly error?: string;
};

export async function publishListing(
  _previous: PublishFormState,
  formData: FormData,
): Promise<PublishFormState> {
  const id = String(formData.get("listingId") ?? "");
  if (!id) return { error: "That listing could not be identified." };

  const outcome = await getServices().builder.listings.publish(id);
  revalidateListing(id);

  if (outcome.kind === "ok") redirect(`/builder/properties?published=${id}`);
  return { error: refusal(outcome.reason) };
}

export async function unpublishListing(formData: FormData): Promise<void> {
  const id = String(formData.get("listingId") ?? "");
  if (!id) return;
  await getServices().builder.listings.unpublish(id);
  revalidateListing(id);
}

export async function republishListing(formData: FormData): Promise<void> {
  const id = String(formData.get("listingId") ?? "");
  if (!id) return;
  await getServices().builder.listings.publish(id);
  revalidateListing(id);
}

export async function deleteListing(formData: FormData): Promise<void> {
  const id = String(formData.get("listingId") ?? "");
  if (!id) return;
  await getServices().builder.listings.remove(id);
  revalidateListing(id);
  redirect("/builder/properties");
}

function refusal(reason: string): string {
  switch (reason) {
    case "not_verified":
      return "Publishing opens once an administrator approves your company documents.";
    case "no_subscription":
      return "An active subscription is needed to publish a listing.";
    case "subscription_expired":
      return "Your subscription has lapsed, so publishing is locked until it is reactivated.";
    case "account_suspended":
      return "Publishing is paused while this account is suspended.";
    default:
      return "This listing is missing something it needs before it can go live.";
  }
}
