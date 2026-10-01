"use server";

import { revalidatePath } from "next/cache";
import { profileStoreKind } from "@/lib/services/backend/config";
import { addToShortlist, removeFromShortlist } from "@/lib/services/backend/buyer-records";
import { isPublishedListingId } from "@/lib/services/backend/shortlist-contract";
import { ServiceError } from "@/lib/services/contracts";

export type ShortlistActionState = {
  readonly status: "idle" | "done" | "error";
  readonly message?: string;
};

function refreshShortlist() {
  revalidatePath("/account/shortlist");
  revalidatePath("/", "layout");
}

export async function addShortlistAction(
  _previous: ShortlistActionState,
  formData: FormData,
): Promise<ShortlistActionState> {
  const listingId = String(formData.get("listingId") ?? "");
  if (!isPublishedListingId(listingId)) {
    return {
      status: "error",
      message: "A catalogue sample is not a published listing, so it was not shortlisted.",
    };
  }
  if (profileStoreKind() !== "backend") {
    return { status: "error", message: "The shortlist is not connected on this server." };
  }
  try {
    const outcome = await addToShortlist(listingId);
    refreshShortlist();
    return {
      status: "done",
      message: outcome === "already" ? "Already on the shortlist." : "Saved to the shortlist.",
    };
  } catch (error) {
    if (error instanceof ServiceError) return { status: "error", message: error.message };
    throw error;
  }
}

export async function removeShortlistAction(
  _previous: ShortlistActionState,
  formData: FormData,
): Promise<ShortlistActionState> {
  const listingId = String(formData.get("listingId") ?? "");
  if (!isPublishedListingId(listingId)) {
    return { status: "error", message: "That id is not a listing on the shortlist." };
  }
  if (profileStoreKind() !== "backend") {
    return { status: "error", message: "The shortlist is not connected on this server." };
  }
  try {
    const outcome = await removeFromShortlist(listingId);
    refreshShortlist();
    return {
      status: "done",
      message: outcome.removed ? "Removed from the shortlist." : "That property was not on the shortlist.",
    };
  } catch (error) {
    if (error instanceof ServiceError) return { status: "error", message: error.message };
    throw error;
  }
}
