"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SAMPLE_STAFF } from "@/lib/domain/identity";
import type { LeadRequestStatus } from "@/lib/domain/types";
import { getServices } from "@/lib/services";
import { ValidationError } from "@/lib/services/contracts";

/**
 * CR03 — Request Leads (seller side) and the staff handling of it.
 *
 * What a request is
 * -----------------
 * A Seller describes the area and kind of leads they need and gets a
 * reference they can track. It is not a purchase: no credits move, no contact
 * details are released, and whether an accepted request ever becomes a quote
 * or an order is change-confirmation decision 3 — open.
 *
 * Idempotency
 * -----------
 * Same rule as buying a lead: the form mints a token, the service treats it
 * as an idempotency key, and a double submit or retried POST returns the
 * first request's reference instead of filing a second one.
 *
 * The requester is never a field
 * ------------------------------
 * The service associates the request with the account from the server-side
 * identity — in this build, the single sample Seller. No hidden input names
 * the account, so no form can file a request as somebody else.
 *
 * Persistence
 * -----------
 * The sample service keeps records in process memory so the journey can be
 * reviewed end to end. The client requires permanent storage; that is a
 * kkl-backend dependency (service-contract.md §2.11) and is not claimed here.
 */

export type LeadRequestFormState = {
  readonly status: "idle" | "error";
  readonly errors?: Readonly<Record<string, string>>;
  /** What the person typed, returned on failure so nothing is retyped. */
  readonly values?: Readonly<Record<string, string>>;
};

/** A fresh idempotency key for one visit to the request form. */
export async function newLeadRequestToken(): Promise<string> {
  return randomUUID();
}

export async function createLeadRequest(
  _previous: LeadRequestFormState,
  formData: FormData,
): Promise<LeadRequestFormState> {
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(idempotencyKey)) {
    // A missing or malformed key means the form was not the one we rendered.
    // Proceeding without one would make a replay indistinguishable from a new
    // request, so it is refused rather than retried.
    return {
      status: "error",
      errors: { form: "This request could not be verified as a single submission. Open the form and try again." },
    };
  }

  const areaId = String(formData.get("areaId") ?? "");
  const propertyType = String(formData.get("propertyType") ?? "");
  const intent = String(formData.get("intent") ?? "");
  const budgetBand = String(formData.get("budgetBand") ?? "");
  const quantity = String(formData.get("quantity") ?? "");
  const timing = String(formData.get("timing") ?? "");
  const notes = String(formData.get("notes") ?? "");
  const values: Record<string, string> = {
    areaId,
    propertyType,
    intent,
    budgetBand,
    quantity,
    timing,
    notes,
  };
  const configurations = formData
    .getAll("configuration")
    .map((v) => String(v))
    .filter((v) => v !== "");

  const quantityParsed = quantity.trim() === "" ? null : Number(quantity);

  try {
    const result = await getServices().leadRequests.create({
      idempotencyKey,
      areaIds: areaId === "" ? [] : [areaId],
      propertyType: propertyType || null,
      configurations,
      budgetBand: budgetBand || null,
      intent: intent === "buy" || intent === "rent" ? intent : null,
      quantity: quantityParsed !== null && Number.isFinite(quantityParsed) ? quantityParsed : null,
      timing: timing || null,
      notes: notes.trim() === "" ? null : notes.trim(),
    });

    revalidatePath("/seller/requests");
    revalidatePath("/admin/requests");
    redirect(`/seller/requests/${result.requestId}?created=${result.reference}`);
  } catch (error) {
    if (error instanceof ValidationError) {
      return { status: "error", errors: error.fields, values };
    }
    throw error;
  }
}

// ------------------------------------------------------------- staff side --

export type AdminLeadRequestFormState = {
  readonly error?: string;
  readonly done?: string;
};

const REQUEST_STATUSES: readonly LeadRequestStatus[] = [
  "submitted",
  "under_review",
  "needs_clarification",
  "fulfilled",
  "closed",
];

export async function respondToLeadRequest(
  _previous: AdminLeadRequestFormState,
  formData: FormData,
): Promise<AdminLeadRequestFormState> {
  const requestId = String(formData.get("requestId") ?? "");
  // Same rule as the support console: anything that is not exactly "internal"
  // is a public reply — a staff note shown to the requester would be a leak,
  // a reply shown to staff is not.
  const internal = formData.get("mode") === "internal";

  const result = await getServices().admin.respondToLeadRequest({
    actor: SAMPLE_STAFF,
    requestId,
    body: String(formData.get("body") ?? ""),
    internal,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath(`/admin/requests/${requestId}`);
  revalidatePath("/admin/requests");
  revalidatePath("/seller/requests", "layout");
  return {
    done: internal
      ? "Internal note added. It stays in this console — the requester's own view of the request has no field that could carry it."
      : "Reply sent. It is now on the requester's own view of this request.",
  };
}

export async function setLeadRequestStatus(
  _previous: AdminLeadRequestFormState,
  formData: FormData,
): Promise<AdminLeadRequestFormState> {
  const requestId = String(formData.get("requestId") ?? "");
  const raw = String(formData.get("status") ?? "");
  if (!REQUEST_STATUSES.includes(raw as LeadRequestStatus)) {
    return { error: "That status was not recognised." };
  }

  const result = await getServices().admin.setLeadRequestStatus({
    actor: SAMPLE_STAFF,
    requestId,
    status: raw as LeadRequestStatus,
    note: String(formData.get("note") ?? "") || undefined,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath(`/admin/requests/${requestId}`);
  revalidatePath("/admin/requests");
  revalidatePath("/admin/audit");
  revalidatePath("/seller/requests", "layout");
  return {
    done: "Status updated. The requester sees the new status and the note, if you left one, on their own view of the request.",
  };
}
