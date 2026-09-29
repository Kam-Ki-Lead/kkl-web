import type { BuyerEnquiry, EnquiryStatus } from "@/lib/domain/types";
import type { EnquiryService } from "@/lib/services/contracts";
import { ServiceError, ValidationError } from "@/lib/services/contracts";
import { SAMPLE_PROPERTIES } from "@/lib/services/sample/fixtures";
import { callAs } from "./session";

/**
 * Buyer enquiries and site-visit requests, served by kkl-backend.
 *
 * WHAT MOVES, AND WHAT DOES NOT
 * The record moves: a durable row with its own reference, scoped to the
 * account that filed it, readable after a restart, invisible to anybody else.
 *
 * The *property* does not. Nothing publishes (Q-3), so every property on the
 * public portal is still a kkl-web sample record. An enquiry therefore names
 * the portal's own identifier rather than a backend listing, and kkl-backend
 * records it as `pending_backend_property`: stored, and honestly unrouted. An
 * enquiry about a backend listing routes to its owner, and there is a test
 * for that; there is simply no way for a buyer to reach one yet.
 *
 * WHAT IS NOT SENT
 * Nothing here promises delivery. No notification is dispatched, because no
 * channel is configured (Q-7), and the confirmation screen says an enquiry
 * was recorded rather than that anyone was told.
 */

type BackendEnquiry = {
  id: string;
  reference: string;
  kind: "enquiry" | "visit_request";
  status: "new" | "acknowledged" | "in_progress" | "closed";
  listingId: string | null;
  subjectRef: string | null;
  subjectLabel: string | null;
  message?: string | null;
  createdAt: string;
  routing: "routed" | "unrouted" | "pending_backend_property";
  duplicate?: boolean;
};

/** kkl-backend tracks four states; the Buyer's screens show three. */
const STATUS: Record<BackendEnquiry["status"], EnquiryStatus> = {
  new: "open",
  acknowledged: "contacted",
  in_progress: "contacted",
  closed: "closed",
};

/**
 * The subject's title comes from wherever the subject lives. Today that is
 * the portal's own records, because nothing publishes — so an enquiry about
 * "ivy-court-action-area-i" is shown as "Ivy Court, Action Area I" by asking
 * the portal, not by kkl-backend storing a copy of a name it does not own.
 * When properties move to the backend, the label comes with them.
 */
function portalProperty(ref: string | null) {
  if (!ref) return null;
  // The form posts the property's id; a link or a saved search may carry its
  // slug. Both are the portal's own identifiers, and either should find it.
  return SAMPLE_PROPERTIES.find((p) => p.id === ref || p.slug === ref) ?? null;
}

const toBuyerEnquiry = (e: BackendEnquiry): BuyerEnquiry => {
  const portal = portalProperty(e.subjectRef);
  return {
  id: e.id,
  propertyId: e.subjectRef ?? e.listingId ?? "",
  propertyTitle: portal?.title ?? e.subjectLabel ?? "That property",
  locationPath: portal?.locationPath ?? [],
  kind: e.kind === "visit_request" ? "site_visit" : "enquiry",
  status: STATUS[e.status] ?? "open",
  message: e.message ?? null,
  createdAt: e.createdAt,
  };
};

function raise(status: number, body: { error?: string; field?: string }): never {
  if (status === 422) {
    const field = { subjectRef: "propertyId", preferredSlot: "preferredDate" }[body.field ?? ""]
      ?? body.field ?? "form";
    throw new ValidationError({ [field]: body.error ?? "This value was not accepted." });
  }
  if (status === 404) throw new ServiceError("not_found", "That enquiry could not be found.");
  throw new ServiceError("unavailable", body.error ?? `Enquiry service returned ${status}.`);
}

export const backendEnquiries: EnquiryService = {
  async submitEnquiry(input) {
    const { status, body } = await callAs<BackendEnquiry>("buyer", "/v1/enquiries", {
      method: "POST",
      body: {
        kind: input.kind === "site_visit" ? "visit_request" : "enquiry",
        // The portal's identifier, because the portal's properties are not
        // backend records yet. kkl-backend stores it as the subject and marks
        // the enquiry unrouted rather than inventing a recipient.
        subjectRef: input.propertyId,
        subjectLabel: input.propertyId,
        message: input.message ?? null,
        preferredSlot: input.preferredDate ?? null,
        idempotencyKey: input.idempotencyKey,
      },
    });
    // The name and mobile on the form are the buyer's own, and the account
    // already carries them. They are not copied onto the enquiry: a second
    // copy of somebody's number is a second thing to leak.
    if (status !== 201 && status !== 200) raise(status, body);
    return { enquiryId: body.id, duplicate: body.duplicate === true };
  },

  async listMine() {
    const { status, body } = await callAs<{ enquiries: BackendEnquiry[] }>(
      "buyer", "/v1/enquiries?as=buyer");
    if (status !== 200) raise(status, body);
    return body.enquiries.map(toBuyerEnquiry);
  },

  async getMine(id) {
    const { status, body } = await callAs<BackendEnquiry>("buyer", `/v1/enquiries/${id}`);
    if (status !== 200) raise(status, body);
    return toBuyerEnquiry(body);
  },

  /**
   * The confirmation screen addresses an enquiry by the submission token, not
   * by its human reference — a short quotable reference in a URL is a way to
   * read somebody else's enquiry by guessing. The backend scopes every read
   * to the account regardless, so an unguessable identifier is convenience
   * rather than the permission itself.
   */
  async getByReceipt(receipt) {
    if (!/^[0-9a-f-]{36}$/i.test(receipt)) return null;
    const { status, body } = await callAs<BackendEnquiry>("buyer", `/v1/enquiries/${receipt}`);
    if (status === 404) return null;
    if (status !== 200) raise(status, body);
    return toBuyerEnquiry(body);
  },
};
