import type {
  LeadRequest,
  LocationNode,
  LeadRequestResponse,
  LeadRequestStatus,
  LeadRequestStatusEntry,
} from "@/lib/domain/types";
import type { AdminActionResult, AdminLeadRequest, AdminTicketMessage } from "@/lib/domain/admin";
import type { StaffRef } from "@/lib/domain/identity";
import { ServiceError, ValidationError } from "@/lib/services/contracts";
import { areaLabel, getLocation } from "@/lib/services/sample/locations";
import { processState } from "@/lib/services/sample/process-state";
import { recordAudit } from "@/lib/services/sample/admin-store";
import { leadRequestBackendConfig, type LeadRequestBackendConfig } from "./config";

/**
 * CR03 — lead requests served by kkl-backend.
 *
 * This is the one part of kkl-web that reads and writes records which outlive
 * the process. Everything here runs on the server: the bearer token, the
 * development-authenticator secret and the backend's address never reach a
 * browser.
 *
 * What is genuinely integrated
 * ----------------------------
 * The record itself. A request filed here is a row in PostgreSQL, readable
 * after kkl-backend restarts, and the database refuses to return one account's
 * rows to another — see kkl-backend/tests/rls.test.mjs.
 *
 * What is still a stand-in, and is labelled as one on screen
 * ----------------------------------------------------------
 * Who is asking. kkl-backend's production authenticator is mobile OTP
 * (architecture §4), which this program's no-live-services boundary forbids,
 * and kkl-web has no sign-in. So there is one sample Seller and one sample
 * staff member, and this module obtains their sessions from kkl-backend's
 * development authenticator. The isolation between accounts is real and
 * tested; the *proof of identity* in front of it is not, and no screen says
 * otherwise.
 *
 * Labels are composed here, from the CR05 location records, because
 * kkl-backend stores areas as stable identifiers and never as display names.
 */

type BackendMessage = {
  id: string;
  visibility: "public" | "internal";
  authorKind: "requester" | "staff";
  authorLabel: string;
  body: string;
  createdAt: string;
};

type BackendHistoryEntry = {
  from: string | null;
  to: LeadRequestStatus;
  reason: string | null;
  actorLabel: string | null;
  at: string;
};

type BackendLeadRequest = {
  id: string;
  reference: string;
  accountId: string;
  areaId: string;
  areaIds: string[];
  location: { cityId: string; stateId: string; countryId: string };
  propertyType: string | null;
  configurations: string[];
  intent: string | null;
  budgetBand: string | null;
  quantity: number | null;
  timing: string | null;
  notes: string | null;
  status: LeadRequestStatus;
  createdAt: string;
  updatedAt: string;
  messages: BackendMessage[];
  history: BackendHistoryEntry[];
};

type Role = "seller" | "staff";

type SessionCache = { seller: string | null; staff: string | null };

/**
 * Tokens are cached per process, not persisted. Losing them costs one extra
 * round trip to the authenticator; storing them would put a credential
 * somewhere it does not need to be.
 */
function sessions(): SessionCache {
  return processState<SessionCache>("kkl.leadRequests.sessions", () => ({
    seller: null,
    staff: null,
  }));
}

const SAMPLE_LABELS: Record<Role, string> = {
  seller: "Sujata Pal · Sen Properties",
  staff: "A. Dutta · Operations",
};

async function issueSession(config: LeadRequestBackendConfig, role: Role): Promise<string> {
  const response = await fetch(`${config.baseUrl}/v1/dev/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-kkl-dev-secret": config.devAuthSecret },
    body: JSON.stringify({
      externalRef: role === "seller" ? config.sellerRef : config.staffRef,
      displayName: SAMPLE_LABELS[role],
      role,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new ServiceError(
      "unavailable",
      `kkl-backend refused a ${role} session (HTTP ${response.status}). Check ` +
        "KKL_LEAD_REQUESTS_BASE_URL and KKL_LEAD_REQUESTS_DEV_SECRET.",
    );
  }
  const body = (await response.json()) as { token: string };
  return body.token;
}

async function tokenFor(config: LeadRequestBackendConfig, role: Role): Promise<string> {
  const cache = sessions();
  const existing = cache[role];
  if (existing !== null) return existing;
  const token = await issueSession(config, role);
  cache[role] = token;
  return token;
}

type CallOptions = {
  method?: string;
  body?: unknown;
  /** 404 is a real answer for some reads; the caller says so rather than throwing. */
  allowNotFound?: boolean;
};

/**
 * One request to kkl-backend, with one retry when the cached session has
 * expired or been revoked. Nothing else is retried: a failed write must not be
 * replayed blindly, and every write here carries an idempotency key or is
 * naturally additive.
 */
async function call<T>(
  role: Role,
  path: string,
  { method = "GET", body, allowNotFound = false }: CallOptions = {},
): Promise<T | null> {
  const config = leadRequestBackendConfig();

  const attempt = async (token: string) =>
    fetch(`${config.baseUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });

  let response: Response;
  try {
    response = await attempt(await tokenFor(config, role));
    if (response.status === 401) {
      sessions()[role] = null;
      response = await attempt(await tokenFor(config, role));
    }
  } catch (cause) {
    // The cause is logged, not surfaced: it carries the backend's address.
    console.error("[kkl-web] lead-request service unreachable", cause);
    throw new ServiceError(
      "unavailable",
      "The lead-request service could not be reached. Nothing was saved. Try again in a moment.",
    );
  }

  if (response.status === 204) return null;
  if (response.status === 404 && allowNotFound) return null;

  const payload = (await response.json().catch(() => null)) as
    | (Record<string, unknown> & { error?: string; field?: string })
    | null;

  if (response.ok) return payload as T;

  if (response.status === 422) {
    const field = typeof payload?.field === "string" ? payload.field : "form";
    throw new ValidationError({ [fieldName(field)]: payload?.error ?? "This value was not accepted." });
  }
  if (response.status === 403) throw new ServiceError("forbidden", payload?.error ?? "Not permitted.");
  if (response.status === 404) throw new ServiceError("not_found", "That request could not be found.");
  if (response.status === 401) {
    throw new ServiceError("unauthenticated", "The lead-request service did not accept this session.");
  }
  throw new ServiceError(
    "unavailable",
    `The lead-request service returned HTTP ${response.status}.`,
  );
}

/**
 * kkl-backend names its own fields; the request form names its own. These must
 * agree or a rejected submission renders nothing at all — the form looks up
 * `errors.areas`, and an error filed under `areaIds` is simply never shown.
 */
function fieldName(backendField: string): string {
  const map: Record<string, string> = {
    areaIds: "areas",
    areaId: "areas",
    "location.cityId": "areas",
    "location.stateId": "areas",
    "location.countryId": "areas",
    idempotencyKey: "form",
    reason: "note",
  };
  return map[backendField] ?? backendField;
}

// ------------------------------------------------------------ projections --

function toResponses(messages: BackendMessage[]): LeadRequestResponse[] {
  // Public only. The backend's policies already withhold internal notes from a
  // requester's session; this is the second lock, not the only one.
  return messages
    .filter((m) => m.visibility === "public")
    .map((m) => ({ id: m.id, authorLabel: m.authorLabel, body: m.body, at: m.createdAt }));
}

function toHistory(history: BackendHistoryEntry[], createdAt: string): LeadRequestStatusEntry[] {
  return [
    { status: "submitted" as LeadRequestStatus, at: createdAt, note: null },
    ...history.map((h) => ({ status: h.to, at: h.at, note: h.reason })),
  ];
}

function toLeadRequest(record: BackendLeadRequest): LeadRequest {
  const areaIds = record.areaIds ?? [record.areaId];
  return {
    id: record.id,
    reference: record.reference,
    status: record.status,
    areaIds,
    areaLabels: areaIds.map((id) => areaLabel(id)),
    propertyType: record.propertyType,
    configurations: record.configurations ?? [],
    budgetBand: record.budgetBand,
    intent: record.intent === "buy" || record.intent === "rent" ? record.intent : null,
    quantity: record.quantity,
    timing: record.timing,
    notes: record.notes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    responses: toResponses(record.messages ?? []),
    history: toHistory(record.history ?? [], record.createdAt),
  };
}

function toInternalNotes(messages: BackendMessage[]): AdminTicketMessage[] {
  return messages
    .filter((m) => m.visibility === "internal")
    .map((m) => ({
      id: m.id,
      authorLabel: m.authorLabel,
      body: m.body,
      sentAt: m.createdAt,
      internal: true,
      fromUser: m.authorKind === "requester",
    }));
}

function toAdminLeadRequest(record: BackendLeadRequest): AdminLeadRequest {
  return {
    ...toLeadRequest(record),
    requesterLabel: SAMPLE_LABELS.seller,
    internalNotes: toInternalNotes(record.messages ?? []),
  };
}

// --------------------------------------------------------------- services --

export const backendLeadRequests = {
  async create(input: {
    idempotencyKey: string;
    areaIds: readonly string[];
    propertyType: string | null;
    configurations: readonly string[];
    budgetBand: string | null;
    intent: "buy" | "rent" | null;
    quantity: number | null;
    timing: string | null;
    notes: string | null;
  }): Promise<{ readonly requestId: string; readonly reference: string; readonly duplicate: boolean }> {
    // Validated here, with the same field names and wording as the sample
    // store, so the form behaves identically whichever store is behind it.
    const areaIds = input.areaIds.filter((id) => id !== "");
    const fields: Record<string, string> = {};
    if (areaIds.length === 0) {
      fields.areas = "Choose the area you need leads in.";
    } else if (areaIds.some((id) => getLocation(id) === null)) {
      fields.areas = "Choose an area from the list.";
    }
    if (input.quantity !== null && (!Number.isInteger(input.quantity) || input.quantity < 1)) {
      fields.quantity = "Say how many leads you need, as a whole number.";
    }
    if (Object.keys(fields).length > 0) throw new ValidationError(fields);

    const firstArea = areaIds[0] as string;
    const location = locationOf(firstArea);

    // The backend answers a replayed key with the request it already filed, so
    // "did this create something new?" is answered by comparing counts before
    // and after rather than by trusting the caller's own flag.
    const before = await call<{ requests: BackendLeadRequest[] }>("seller", "/v1/lead-requests");
    const created = await call<BackendLeadRequest>("seller", "/v1/lead-requests", {
      method: "POST",
      body: {
        idempotencyKey: input.idempotencyKey,
        areaIds,
        location,
        propertyType: input.propertyType,
        configurations: [...input.configurations],
        budgetBand: input.budgetBand,
        intent: input.intent,
        quantity: input.quantity,
        timing: input.timing,
        notes: input.notes,
      },
    });
    if (created === null) throw new ServiceError("unavailable", "The request was not filed.");
    const existed = (before?.requests ?? []).some((r) => r.id === created.id);
    return { requestId: created.id, reference: created.reference, duplicate: existed };
  },

  async listMine(): Promise<readonly LeadRequest[]> {
    const page = await call<{ requests: BackendLeadRequest[] }>("seller", "/v1/lead-requests");
    return (page?.requests ?? []).map(toLeadRequest);
  },

  async getMine(id: string): Promise<LeadRequest> {
    const record = await call<BackendLeadRequest>("seller", `/v1/lead-requests/${encodeURIComponent(id)}`, {
      allowNotFound: true,
    });
    if (record === null) {
      // Not found and belongs-to-somebody-else are the same answer on purpose,
      // so ownership cannot be probed by guessing identifiers.
      throw new ServiceError("not_found", "That request could not be found.");
    }
    return toLeadRequest(record);
  },
};

export const backendAdminLeadRequests = {
  async listLeadRequests(filter?: {
    status?: LeadRequestStatus;
    areaId?: string;
  }): Promise<readonly AdminLeadRequest[]> {
    const query = new URLSearchParams();
    if (filter?.status) query.set("status", filter.status);
    if (filter?.areaId) query.set("areaId", filter.areaId);
    const suffix = query.size > 0 ? `?${query.toString()}` : "";
    const page = await call<{ requests: BackendLeadRequest[] }>("staff", `/v1/lead-requests${suffix}`);
    return (page?.requests ?? []).map(toAdminLeadRequest);
  },

  async getLeadRequest(id: string): Promise<AdminLeadRequest | null> {
    const record = await call<BackendLeadRequest>("staff", `/v1/lead-requests/${encodeURIComponent(id)}`, {
      allowNotFound: true,
    });
    return record === null ? null : toAdminLeadRequest(record);
  },

  async respondToLeadRequest(input: {
    actor: StaffRef;
    requestId: string;
    body: string;
    internal: boolean;
  }): Promise<AdminActionResult> {
    if (input.body.trim() === "") {
      return { ok: false, error: "Write the reply before sending it." };
    }
    try {
      const updated = await call<BackendLeadRequest>(
        "staff",
        `/v1/lead-requests/${encodeURIComponent(input.requestId)}/messages`,
        {
          method: "POST",
          body: {
            body: input.body,
            visibility: input.internal ? "internal" : "public",
            authorLabel: `${input.actor.name} · ${input.actor.team}`,
          },
        },
      );
      if (updated === null) return { ok: false, error: "That request could not be found." };
      // Same rule as ticket replies: the message on the record is the record,
      // so there is no separate audit entry.
      return { ok: true, auditId: "—" };
    } catch (error) {
      return { ok: false, error: describe(error) };
    }
  },

  async setLeadRequestStatus(input: {
    actor: StaffRef;
    requestId: string;
    status: LeadRequestStatus;
    note?: string;
  }): Promise<AdminActionResult> {
    // kkl-backend requires a reason on every status change and writes it to
    // history. The Admin form calls it a note and allows it to be empty, so
    // the refusal is made here rather than arriving as a field error on a
    // field the form does not show.
    const reason = (input.note ?? "").trim();
    if (reason === "") {
      return {
        ok: false,
        error: "Record why the status is changing. The reason is stored with the change and the requester sees it.",
      };
    }
    try {
      // Read the status before the move, so the audit entry records what
      // actually changed rather than what was asked for.
      const before = await call<BackendLeadRequest>(
        "staff",
        `/v1/lead-requests/${encodeURIComponent(input.requestId)}`,
        { allowNotFound: true },
      );
      if (before === null) return { ok: false, error: "That request could not be found." };

      const updated = await call<BackendLeadRequest>(
        "staff",
        `/v1/lead-requests/${encodeURIComponent(input.requestId)}/status`,
        {
          method: "POST",
          body: { to: input.status, reason, actorLabel: `${input.actor.name} · ${input.actor.team}` },
        },
      );
      if (updated === null) return { ok: false, error: "That request could not be found." };
      if (before.status === updated.status) return { ok: true, auditId: "—" };

      // Two records of the same change, and they are not redundant. The
      // durable one is kkl-backend's lead_request_history row, written in the
      // same transaction as the status. This second one is the Admin console's
      // own append-only log, which spans every staff action across the
      // product and is still a sample store — kkl-backend has no audit domain
      // yet. When it does, this line goes away, not the history.
      const auditId = recordAudit({
        actor: input.actor,
        category: "support",
        action: "Lead request status changed",
        subject: input.requestId,
        subjectLabel: `Lead request ${updated.reference}`,
        reason,
        changes: [{ field: "status", before: before.status, after: updated.status }],
      });
      return { ok: true, auditId };
    } catch (error) {
      return { ok: false, error: describe(error) };
    }
  },
};

function describe(error: unknown): string {
  if (error instanceof ValidationError) return Object.values(error.fields)[0] ?? error.message;
  if (error instanceof ServiceError) return error.message;
  return "The lead-request service could not complete that action.";
}

/**
 * The city/state/country an area belongs to, from the CR05 records. kkl-backend
 * stores the whole path so a later query can filter at any level without
 * kkl-web's tables being the only place the hierarchy exists.
 */
function locationOf(areaId: string): { cityId: string; stateId: string; countryId: string } {
  const path = ancestryOf(areaId);
  if (path === null) {
    throw new ValidationError({ areas: "Choose an area from the list." });
  }
  return path;
}

function ancestryOf(areaId: string): { cityId: string; stateId: string; countryId: string } | null {
  let node = getLocation(areaId);
  if (node === null) return null;
  const found: Partial<Record<LocationNode["level"], string>> = {};
  // Walk up rather than assuming a depth: an area may be a locality or a
  // sub-locality, and CR05 says the hierarchy extends past Kolkata later.
  const seen = new Set<string>();
  while (node !== null && !seen.has(node.id)) {
    seen.add(node.id);
    found[node.level] = node.id;
    node = node.parentId === null ? null : getLocation(node.parentId);
  }
  const { city, state, country } = found;
  if (city === undefined || state === undefined || country === undefined) return null;
  return { cityId: city, stateId: state, countryId: country };
}
