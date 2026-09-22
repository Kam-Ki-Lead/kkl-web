import type { BuyerEnquiry } from "@/lib/domain/types";
import { SAMPLE_PROPERTIES } from "./fixtures";

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
 * 4. It is not partitioned by account, because sample mode has no accounts. Any
 *    caller who knows a reference can read that enquiry through `getByReference`.
 *    Real per-account isolation is kkl-backend's to enforce and is NOT
 *    demonstrated here.
 *
 * None of this is a model for production. Real idempotency belongs in
 * kkl-backend, keyed in the database inside the same transaction that records
 * the enquiry, so a replay cannot produce a second row even across instances.
 */

type StoredEnquiry = BuyerEnquiry & { readonly mobile: string; readonly name: string };

const byToken = new Map<string, string>();
const byReference = new Map<string, StoredEnquiry>();

let sequence = 50_000;

function nextReference(): string {
  sequence += 1;
  return `e-${sequence}`;
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
  const existing = byToken.get(input.idempotencyKey);
  if (existing !== undefined) {
    return { enquiryId: existing, duplicate: true };
  }

  const property = SAMPLE_PROPERTIES.find((p) => p.id === input.propertyId);
  const reference = nextReference();

  byReference.set(reference, {
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
  byToken.set(input.idempotencyKey, reference);

  return { enquiryId: reference, duplicate: false };
}

export function findByReference(reference: string): BuyerEnquiry | null {
  return byReference.get(reference) ?? null;
}

/** Enquiries submitted in this process, newest first. */
export function submittedEnquiries(): readonly BuyerEnquiry[] {
  return [...byReference.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
