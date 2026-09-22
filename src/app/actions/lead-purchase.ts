"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServices } from "@/lib/services";
import type { PurchaseOutcome } from "@/lib/services/contracts";

/**
 * Buying a lead (S-09 → S-10 / S-11).
 *
 * Idempotency
 * -----------
 * The confirm screen mints a token and puts it in a hidden field. The service
 * treats it as an idempotency key, so a double-click, a retried request or a
 * reloaded POST resolves to the purchase already made instead of spending
 * credits twice. The token is per-visit to the confirm screen, not per-lead:
 * two deliberate attempts on the same lead are two different intentions, and the
 * second one is refused because the lead is sold, not because the key matched.
 *
 * What this is not
 * ----------------
 * This is not the transaction. In sample mode the "deduction" moves a number in
 * process memory. The real operation — deduct and release in one database
 * transaction, keyed by this token, so a failed deduction releases nothing —
 * belongs to kkl-backend. This action only carries the request and renders
 * whichever outcome comes back.
 *
 * Every outcome is a designed screen. None of them is a thrown error, because
 * "insufficient credits" and "already sold" are ordinary things that happen and
 * the Seller needs a next step, not a stack trace.
 */

const OUTCOME_COOKIE = "kkl_purchase_outcome";

export type PurchaseFormState = {
  readonly error?: string;
};

export async function purchaseLead(
  _previous: PurchaseFormState,
  formData: FormData,
): Promise<PurchaseFormState> {
  const leadId = String(formData.get("leadId") ?? "");
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");

  if (!leadId) return { error: "That lead could not be identified. Open it again from the marketplace." };
  if (!/^[0-9a-f-]{36}$/.test(idempotencyKey)) {
    // A missing or malformed key means the form was not the one we rendered.
    // Proceeding without one would make a replay indistinguishable from a new
    // purchase, so it is refused rather than retried.
    return {
      error: "This purchase could not be verified as a single attempt. Open the lead and try again.",
    };
  }

  const outcome = await getServices().leadMarket.purchase({ leadId, idempotencyKey });

  // The outcome is held in a short-lived httpOnly cookie rather than a query
  // string: it decides which of the designed result screens renders, and a URL
  // the Seller can edit must not be able to claim a purchase that did not
  // happen. The result screen reads it once.
  const jar = await cookies();
  jar.set(OUTCOME_COOKIE, JSON.stringify({ leadId, kind: outcome.kind }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  redirect(`/seller/leads/${leadId}/result`);
}

export type StoredOutcome = { readonly leadId: string; readonly kind: PurchaseOutcome["kind"] };

/** The outcome the result screen should render, if this browser has one. */
export async function readPurchaseOutcome(leadId: string): Promise<StoredOutcome | null> {
  const raw = (await cookies()).get(OUTCOME_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredOutcome;
    return parsed.leadId === leadId ? parsed : null;
  } catch {
    return null;
  }
}

/** A fresh idempotency key for one visit to the confirm screen. */
export async function newPurchaseToken(): Promise<string> {
  return randomUUID();
}
