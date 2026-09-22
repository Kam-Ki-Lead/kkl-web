"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getServices } from "@/lib/services";

/**
 * Enquiry actions (B-16, B-17).
 *
 * `unlockContact` exists only under alternative B. D-05 is open — the
 * account-roles specification says a Builder is notified of enquiries on their
 * own listings and is silent on whether the notification carries contact
 * details, while the development proposal lists paid unlocking. Both are built
 * so the client can compare them; neither is presented as the rule.
 */

export async function markEnquiryRead(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await getServices().builder.enquiries.markRead(id);
  revalidatePath("/builder/enquiries");
  revalidatePath(`/builder/enquiries/${id}`);
  revalidatePath("/builder");
}

export type UnlockFormState = { readonly error?: string };

export async function unlockContact(
  _previous: UnlockFormState,
  formData: FormData,
): Promise<UnlockFormState> {
  const id = String(formData.get("id") ?? "");
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  if (!id) return { error: "That enquiry could not be identified." };
  if (!/^[0-9a-f-]{36}$/.test(idempotencyKey)) {
    return { error: "This request could not be verified as a single attempt. Reload and try again." };
  }

  const outcome = await getServices().builder.enquiries.unlockContact({ id, idempotencyKey });

  revalidatePath(`/builder/enquiries/${id}`);
  revalidatePath("/builder/enquiries");
  revalidatePath("/builder/billing");

  if (outcome.kind === "insufficient_credits") {
    return {
      error: `Unlocking costs ₹${outcome.priceCredits.toLocaleString("en-IN")} and your balance is ₹${outcome.balanceCredits.toLocaleString("en-IN")}. Nothing was deducted.`,
    };
  }
  if (outcome.kind === "not_applicable") {
    return {
      error: "Contact details are already included on this account, so there is nothing to unlock.",
    };
  }
  return {};
}

export async function newUnlockToken(): Promise<string> {
  return randomUUID();
}
