import type {
  LeadRequest,
  LeadRequestResponse,
  LeadRequestStatus,
  LeadRequestStatusEntry,
} from "@/lib/domain/types";
import type { AdminLeadRequest, AdminTicketMessage } from "@/lib/domain/admin";
import type { StaffRef } from "@/lib/domain/identity";
import { ValidationError } from "@/lib/services/contracts";
import { processState } from "./process-state";
import { areaLabel, getLocation } from "./locations";

/**
 * CR03 — the sample lead-request store.
 *
 * WHAT THIS IS
 * ------------
 * Process memory for a review session, behind the same service contract a
 * durable implementation would fill. It exists so the Request Leads journey —
 * create, reference, track, Admin handling — can be used and checked end to
 * end in this build.
 *
 * WHAT IT IS NOT
 * --------------
 * It is not the permanent storage the client requires. Records here die with
 * the server process and are shared by every browser that touches it — there
 * is one sample Seller and no sign-in. The confirmation document is explicit
 * that a process-memory store does not satisfy the requirement; the durable
 * records and endpoints kkl-backend must provide are documented in
 * docs/phase-2/service-contract.md §2.12, and persistence is not claimed until
 * records survive a restart and are retrieved with appropriate account access.
 *
 * The separation that matters *is* real here, because it is structural:
 * internal notes live on the Admin view only, and the Seller-facing projection
 * has no field that could carry one.
 */

/** The one sample Seller — the service identity every request is associated with. */
const SAMPLE_REQUESTER = "Sujata Pal · Sen Properties";

/**
 * The stored record is the Admin view, mutable: the domain types are readonly
 * because nothing outside a store should rewrite them, and this module is the
 * store. Every read projects back to the readonly shapes.
 */
type StoredRequest = Omit<
  AdminLeadRequest,
  "status" | "updatedAt" | "responses" | "history" | "internalNotes"
> & {
  status: LeadRequestStatus;
  updatedAt: string;
  responses: LeadRequestResponse[];
  history: LeadRequestStatusEntry[];
  internalNotes: AdminTicketMessage[];
};

type LeadRequestState = {
  requests: StoredRequest[];
  /** Idempotency: key → what it created. A replay returns the same reference. */
  createTokens: Map<string, { requestId: string; reference: string }>;
  nextReference: number;
};

function seed(): LeadRequestState {
  const at = "2026-09-24T09:40:00.000Z";
  return {
    createTokens: new Map(),
    nextReference: 1043,
    requests: [
      {
        id: "lr-seed-1",
        reference: "LR-1042",
        status: "under_review",
        areaIds: ["rajarhat"],
        areaLabels: [areaLabel("rajarhat")],
        propertyType: "Apartment",
        configurations: ["2", "3"],
        budgetBand: "₹60L – ₹80L",
        intent: "buy",
        quantity: 5,
        timing: "Over the next month",
        notes: "First-time buyers preferred; working pairs visiting on weekends.",
        createdAt: at,
        updatedAt: "2026-09-25T11:15:00.000Z",
        responses: [
          {
            id: "lrr-1",
            authorLabel: "Kam Ki Lead team",
            body: "We are checking the qualified pipeline for Rajarhat against this requirement and will update this request.",
            at: "2026-09-25T11:15:00.000Z",
          },
        ],
        history: [
          { status: "submitted", at, note: null },
          { status: "under_review", at: "2026-09-25T11:15:00.000Z", note: null },
        ],
        requesterLabel: SAMPLE_REQUESTER,
        internalNotes: [
          {
            id: "lrin-1",
            authorLabel: "Intake team",
            body: "Two qualifying Rajarhat leads are in the qualification call queue; check again after Thursday's run.",
            sentAt: "2026-09-25T11:10:00.000Z",
            internal: true,
            fromUser: false,
          },
        ],
      },
    ],
  };
}

const store = () => processState("sample.lead-requests", seed);

const now = () => new Date().toISOString();

/** The Seller-facing projection: no requester label, no internal notes. */
function toSellerView(request: StoredRequest): LeadRequest {
  return {
    id: request.id,
    reference: request.reference,
    status: request.status,
    areaIds: request.areaIds,
    areaLabels: request.areaLabels,
    propertyType: request.propertyType,
    configurations: request.configurations,
    budgetBand: request.budgetBand,
    intent: request.intent,
    quantity: request.quantity,
    timing: request.timing,
    notes: request.notes,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    responses: request.responses,
    history: request.history,
  };
}

export function createRequest(input: {
  idempotencyKey: string;
  areaIds: readonly string[];
  propertyType: string | null;
  configurations: readonly string[];
  budgetBand: string | null;
  intent: "buy" | "rent" | null;
  quantity: number | null;
  timing: string | null;
  notes: string | null;
}): { requestId: string; reference: string; duplicate: boolean } {
  const replayed = store().createTokens.get(input.idempotencyKey);
  if (replayed) return { ...replayed, duplicate: true };

  const fields: Record<string, string> = {};
  const areaIds = input.areaIds.filter((id) => id !== "");
  if (areaIds.length === 0) {
    fields.areas = "Choose the area you need leads in.";
  } else if (areaIds.some((id) => !isAreaId(id))) {
    // An id the location records do not know is not a area the service can
    // route — rejected, not stored as free text.
    fields.areas = "Choose an area from the list.";
  }
  if (input.quantity !== null && (!Number.isInteger(input.quantity) || input.quantity < 1)) {
    fields.quantity = "Say how many leads you need, as a whole number.";
  }
  if (Object.keys(fields).length > 0) throw new ValidationError(fields);

  const at = now();
  const reference = `LR-${store().nextReference++}`;
  const request: StoredRequest = {
    id: `lr-${input.idempotencyKey.slice(0, 8)}`,
    reference,
    status: "submitted",
    areaIds,
    areaLabels: areaIds.map(areaLabel),
    propertyType: input.propertyType,
    configurations: input.configurations,
    budgetBand: input.budgetBand,
    intent: input.intent,
    quantity: input.quantity,
    timing: input.timing,
    notes: input.notes,
    createdAt: at,
    updatedAt: at,
    responses: [],
    history: [{ status: "submitted", at, note: null }],
    requesterLabel: SAMPLE_REQUESTER,
    internalNotes: [],
  };
  store().requests.unshift(request);
  store().createTokens.set(input.idempotencyKey, { requestId: request.id, reference });
  return { requestId: request.id, reference, duplicate: false };
}

function isAreaId(id: string): boolean {
  const node = getLocation(id);
  return node !== null && (node.level === "locality" || node.level === "sub_locality");
}

export function listMine(): readonly LeadRequest[] {
  return store().requests.map(toSellerView);
}

/**
 * The sample has one Seller, so every stored request is theirs. The contract's
 * rule stands regardless: `getMine` must throw `not_found` for another
 * account's request, indistinguishable from one that does not exist.
 */
export function getMine(id: string): LeadRequest | null {
  const found = store().requests.find((r) => r.id === id);
  return found ? toSellerView(found) : null;
}

// ------------------------------------------------------------- admin side --

export function listRequests(filter?: {
  status?: LeadRequestStatus;
  areaId?: string;
}): readonly AdminLeadRequest[] {
  let all = store().requests;
  if (filter?.status) all = all.filter((r) => r.status === filter.status);
  if (filter?.areaId) {
    const areaId = filter.areaId;
    all = all.filter((r) => r.areaIds.some((id) => id === areaId));
  }
  return all;
}

export function getRequest(id: string): AdminLeadRequest | null {
  return store().requests.find((r) => r.id === id) ?? null;
}

export const REQUEST_REPLY_BODY_REQUIRED = "Write something before sending.";

export function respondToRequest(input: {
  actor: StaffRef;
  requestId: string;
  body: string;
  internal: boolean;
}): { ok: true } | { ok: false; error: string } {
  const body = input.body.trim();
  if (body.length === 0) return { ok: false, error: REQUEST_REPLY_BODY_REQUIRED };
  const request = store().requests.find((r) => r.id === input.requestId);
  if (!request) return { ok: false, error: "That request could not be found." };

  const at = now();
  if (input.internal) {
    // Stored on the Admin view and nowhere else: no Seller-facing projection
    // reads `internalNotes`, and `LeadRequest` has no field that could carry one.
    request.internalNotes.push({
      id: `lrin-${request.internalNotes.length + 1}-${request.id}`,
      authorLabel: `${input.actor.name} · ${input.actor.team}`,
      body,
      sentAt: at,
      internal: true,
      fromUser: false,
    });
  } else {
    const response: LeadRequestResponse = {
      id: `lrr-${request.responses.length + 1}-${request.id}`,
      authorLabel: "Kam Ki Lead team",
      body,
      at,
    };
    request.responses.push(response);
  }
  request.updatedAt = at;
  return { ok: true };
}

export function setRequestStatus(input: {
  actor: StaffRef;
  requestId: string;
  status: LeadRequestStatus;
  note?: string;
}): { ok: true } | { ok: false; error: string } {
  const request = store().requests.find((r) => r.id === input.requestId);
  if (!request) return { ok: false, error: "That request could not be found." };
  if (request.status === input.status) return { ok: true };

  const at = now();
  request.status = input.status;
  request.updatedAt = at;
  // Appended, never overwritten: the record shows how it arrived where it is.
  request.history.push({
    status: input.status,
    at,
    note: input.note?.trim() || null,
  });
  return { ok: true };
}

export function resetLeadRequestsForReview(): void {
  const fresh = seed();
  const current = store();
  current.requests = fresh.requests;
  current.createTokens = fresh.createTokens;
  current.nextReference = fresh.nextReference;
}
