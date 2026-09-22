import type { BuyerEnquiry } from "@/lib/domain/types";
import { SAMPLE_PROPERTIES } from "./fixtures";
import { processState } from "./process-state";

/**
 * In-process store for enquiries submitted during a review session.
 *
 * WHAT THIS IS
 * ------------
 * A `Map` held in the Node process that serves the app. It exists so the sample
 * mode can demonstrate real idempotency — submitting the same token twice returns
 * the first enquiry rather than recording a second — and so a confirmation screen
 * can show the enquiry that was actually recorded.
 *
 * LIMITATIONS, stated rather than discovered later
 * ------------------------------------------------
 * 1. It is memory only. Restarting the server loses every submitted enquiry.
 * 2. It is per-process. Two server instances (or a serverless deployment where
 *    each request may hit a different instance) would not share it, so the
 *    idempotency guarantee would not hold across them.
 * 3. It has no eviction. Fine for a review session; it would grow without bound
 *    under sustained use.
 * 4. It is not partitioned by account, because sample mode has no accounts. What
 *    keeps one browser out of another's enquiry is that the confirmation screen
 *    is addressed by the submission token — an unguessable value only the
 *    browser that created the draft ever held — and not by the human reference,
 *    which is sequential and would be trivially enumerable. That is obscurity
 *    plus an httpOnly cookie, not authorization. Real per-account isolation is
 *    kkl-backend's to enforce and is NOT demonstrated here.
 *
 * None of this is a model for production. Real idempotency belongs in
 * kkl-backend, keyed in the database inside the same transaction that records
 * the enquiry, so a replay cannot produce a second row even across instances.
 */

type StoredEnquiry = BuyerEnquiry & { readonly mobile: string; readonly name: string };

/**
 * Process-scoped, not module-scoped.
 *
 * Route handlers, pages and server actions are bundled separately, so a
 * module-scope `let` here can be instantiated more than once per server — and
 * the idempotency guarantee would then hold only within whichever bundle
 * happened to serve the request. See process-state.ts.
 */
const state = processState("enquiry", () => ({
  byToken: new Map<string, string>(),
  byReference: new Map<string, StoredEnquiry>(),
  sequence: 50_000,
}));

function nextReference(): string {
  state.sequence += 1;
  return `e-${state.sequence}`;
}

export type SubmitInput = {
  idempotencyKey: string;
  propertyId: string;
  kind: "enquiry" | "site_visit";
  name: string;
  mobile: string;
  message?: string;
  preferredDate?: string;
};

/**
 * Records an enquiry, or returns the existing one for a token already used.
 *
 * The reference is a fresh sequence value, never derived from the payload — two
 * people enquiring about the same property must get two references.
 */
export function submit(input: SubmitInput): { enquiryId: string; duplicate: boolean } {
  const existing = state.byToken.get(input.idempotencyKey);
  if (existing !== undefined) {
    return { enquiryId: existing, duplicate: true };
  }

  const property = SAMPLE_PROPERTIES.find((p) => p.id === input.propertyId);
  const reference = nextReference();

  state.byReference.set(reference, {
    id: reference,
    propertyId: input.propertyId,
    propertyTitle: property?.title ?? "Unknown project",
    locationPath: property?.locationPath ?? [],
    kind: input.kind,
    status: "open",
    message: input.message ?? null,
    createdAt: new Date().toISOString(),
    name: input.name,
    mobile: input.mobile,
  });
  state.byToken.set(input.idempotencyKey, reference);

  return { enquiryId: reference, duplicate: false };
}

/**
 * Lookup by human reference, for the account's own enquiry list and detail.
 *
 * Only ever reached through a screen that is already scoped to an account. It is
 * not what the public confirmation URL resolves — see `findByReceipt`.
 */
export function findByReference(reference: string): BuyerEnquiry | null {
  return state.byReference.get(reference) ?? null;
}

/**
 * The enquiry a submission token receipt refers to.
 *
 * Deliberately not `findByReference`. References are sequential, so looking one
 * up from the URL would let anyone walk the list by counting. The token is
 * random and was only ever held in the submitting browser's httpOnly draft
 * cookie.
 */
export function findByReceipt(token: string): BuyerEnquiry | null {
  const reference = state.byToken.get(token);
  return reference === undefined ? null : (state.byReference.get(reference) ?? null);
}

/** Enquiries submitted in this process, newest first. */
export function submittedEnquiries(): readonly BuyerEnquiry[] {
  return [...state.byReference.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
