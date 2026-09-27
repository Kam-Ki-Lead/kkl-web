"use server";

import { revalidatePath } from "next/cache";
import { SAMPLE_STAFF } from "@/lib/domain/identity";
import type { GatedAction, VerificationOutcome } from "@/lib/domain/types";
import { getServices } from "@/lib/services";
import { policyFor } from "@/lib/config/verification-policy";

/**
 * CR07 — verification actions.
 *
 * What these do not do
 * --------------------
 * They do not collect an identity document, contact a provider, or assert that
 * any check is legally sufficient. No provider has been selected. `submit` hands
 * the case to a clearly labelled sample service so each outcome can be seen, and
 * every screen that renders a case says which service produced it.
 *
 * The rule that matters most is in the store, not here: a provider result that
 * is unreadable, or a provider that cannot be reached, becomes a case for review.
 * It never becomes a pass. An outage is not an approval.
 */

const ACTIONS: readonly GatedAction[] = [
  "browse_properties",
  "enquire_property",
  "request_leads",
  "purchase_lead",
  "publish_owner_listing",
  "publish_builder_listing",
];

function refresh(): void {
  revalidatePath("/seller/verification");
  revalidatePath("/seller/kyc/status");
  revalidatePath("/admin/verification");
  revalidatePath("/admin/kyc");
}

export type VerificationFormState = { readonly error?: string; readonly done?: string };

export async function startVerification(
  _previous: VerificationFormState,
  formData: FormData,
): Promise<VerificationFormState> {
  const raw = String(formData.get("action") ?? "");
  if (!ACTIONS.includes(raw as GatedAction)) {
    return { error: "That action was not recognised." };
  }
  const action = raw as GatedAction;
  // Refused here as well as in the store. An account that needs no check must
  // not be able to talk itself into a queue by posting a form.
  if (!policyFor(action).required) {
    return {
      error:
        "No verification is required for that action, so there is no case to open. Nothing has changed.",
    };
  }

  const opened = await getServices().verification.start(action);
  refresh();
  return {
    done: `Case ${opened.reference} opened. It is not a decision — it records that a check is needed and tracks it.`,
  };
}

export async function submitVerification(
  _previous: VerificationFormState,
  formData: FormData,
): Promise<VerificationFormState> {
  const reference = String(formData.get("reference") ?? "");
  const updated = await getServices().verification.submit(reference);
  if (updated === null) return { error: "That case could not be found." };
  refresh();

  const said: Record<VerificationOutcome, string> = {
    not_required: "No check was needed.",
    required: "The case is open and has not been sent yet.",
    in_progress: "Sent. The service is processing it.",
    verified: "The check passed.",
    failed: "The check completed and did not pass. Nothing was approved.",
    needs_review:
      "The service could not give a usable answer, so the case is waiting for a person. That is not an approval.",
    expired: "The previous check no longer counts.",
  };
  return { done: said[updated.outcome] };
}

// ------------------------------------------------------------- staff side --

const DECISIONS: readonly VerificationOutcome[] = ["verified", "failed", "needs_review", "expired"];

export async function decideVerification(
  _previous: VerificationFormState,
  formData: FormData,
): Promise<VerificationFormState> {
  const reference = String(formData.get("reference") ?? "");
  const raw = String(formData.get("outcome") ?? "");
  if (!DECISIONS.includes(raw as VerificationOutcome)) {
    return { error: "That decision was not recognised." };
  }

  const result = await getServices().admin.decideVerificationCase({
    actor: SAMPLE_STAFF,
    reference,
    outcome: raw as "verified" | "failed" | "needs_review" | "expired",
    reason: String(formData.get("reason") ?? ""),
  });
  if (!result.ok) return { error: result.error };

  refresh();
  revalidatePath("/admin/audit");
  revalidatePath(`/admin/verification/${reference}`);
  return {
    done:
      "Recorded. The reason is kept with the decision and is in the audit log. Verification is not account status and not listing moderation — none of those changed.",
  };
}
