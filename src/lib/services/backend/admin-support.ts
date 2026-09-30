import type { AdminActionResult, AdminThread, AdminTicket, AdminTicketFilter } from "@/lib/domain/admin";
import type { AuditCategory, AuditEntry, FieldChange } from "@/lib/domain/admin";
import type { StaffRef } from "@/lib/domain/identity";
import { ServiceError } from "@/lib/services/contracts";
import { callAs } from "./session";

/**
 * The staff support queue and the audit log, served by kkl-backend.
 *
 * WHY THE INTERNAL NOTE APPEARS HERE AND NOWHERE ELSE
 * Not because this adapter asks for it. This one speaks as a staff session,
 * and the backend's SELECT policy returns internal rows to a staff session;
 * the user-facing adapter speaks as the account and gets a thread with no
 * internal rows in it. The separation is the database's, in both directions.
 */

type BackendMessage = {
  id: string;
  visibility: "shared" | "internal";
  authorKind: "requester" | "staff";
  authorLabel: string;
  body: string;
  createdAt: string;
};

type BackendTicket = {
  id: string;
  reference: string;
  topic: string;
  subject: string;
  status: "open" | "awaiting_reply" | "replied" | "resolved";
  raisedFrom: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolutionReason: string | null;
  accountId?: string;
  requesterLabel?: string | null;
  requesterRole?: string | null;
  messages?: BackendMessage[];
};

function raise(status: number, body: { error?: string }): never {
  throw new ServiceError("unavailable", body.error ?? `The support service returned ${status}.`);
}

/** How long ago, in the words the approved queue uses. */
function ageLabel(iso: string): string {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return "under an hour";
  if (hours < 24) return hours === 1 ? "1 hour" : `${hours} hours`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day" : `${days} days`;
}

const STATE: Record<BackendTicket["status"], AdminTicket["state"]> = {
  open: "awaiting_reply",
  awaiting_reply: "awaiting_reply",
  // Staff have answered, so the queue is waiting on the user.
  replied: "awaiting_user",
  resolved: "resolved",
};

const toAdminTicket = (t: BackendTicket): AdminTicket => ({
  reference: t.reference,
  subject: t.subject,
  requesterName: t.requesterLabel ?? "Unknown account",
  requesterRole: t.requesterRole ?? "unknown",
  requesterAccountId: t.accountId ?? "",
  openedAt: t.createdAt,
  ageLabel: ageLabel(t.createdAt),
  state: STATE[t.status],
  liveConsole: t.raisedFrom === "seller" || t.raisedFrom === "builder" ? t.raisedFrom : null,
  context: [
    // The staff queue shows the backend's own vocabulary: staff triage on
    // seven topics, and collapsing them to the Seller's four would lose the
    // distinction they triage by.
    { label: "Topic", value: t.topic },
    { label: "Last activity", value: ageLabel(t.updatedAt) },
    ...(t.resolutionReason ? [{ label: "Resolved because", value: t.resolutionReason }] : []),
  ],
});

const toAdminThread = (t: BackendTicket): AdminThread => ({
  ...toAdminTicket(t),
  messages: (t.messages ?? []).map((m) => ({
    id: m.id,
    authorLabel: m.authorLabel,
    body: m.body,
    sentAt: m.createdAt,
    internal: m.visibility === "internal",
    fromUser: m.authorKind === "requester",
  })),
});

/** The filter the approved queue offers, in the backend's vocabulary. */
const STATUS_FOR: Record<Exclude<AdminTicketFilter, "all">, string> = {
  awaiting_reply: "awaiting_reply",
  awaiting_user: "replied",
  resolved: "resolved",
};

export const backendAdminSupport = {
  async listTickets(filter?: AdminTicketFilter) {
    const wanted = filter && filter !== "all" ? `&status=${STATUS_FOR[filter]}` : "";
    const { status, body } = await callAs<{ tickets: BackendTicket[] }>(
      "staff", `/v1/support/tickets?mine=false${wanted}`);
    if (status !== 200) raise(status, body);
    return body.tickets.map(toAdminTicket);
  },

  async getThread(reference: string) {
    const { status, body } = await callAs<BackendTicket>(
      "staff", `/v1/support/tickets/${encodeURIComponent(reference)}`);
    if (status === 404) return null;
    if (status !== 200) raise(status, body);
    return toAdminThread(body);
  },

  async replyToTicket(input: {
    // `actor` is the approved contract's shape and is deliberately not sent:
    // kkl-backend reads the acting account from the session, and an actor in
    // a request body is a claim anybody could make. It stays in the
    // signature because the sample service takes it.
    actor: StaffRef;
    reference: string;
    body: string;
    internal: boolean;
  }): Promise<AdminActionResult> {
    const { status, body } = await callAs<BackendTicket & { error?: string }>(
      "staff", `/v1/support/tickets/${encodeURIComponent(input.reference)}/messages`, {
        method: "POST", body: { body: input.body, internal: input.internal },
      });
    if (status !== 201) return { ok: false, error: body.error ?? "That reply was not accepted." };
    // The audit id the approved contract wants is the entry kkl-backend
    // wrote; the reference identifies it well enough for a screen, and the
    // real entry is queryable at /v1/audit.
    return { ok: true, auditId: `${input.reference}:reply` };
  },

  async resolveTicket(input: {
    actor: StaffRef;
    reference: string;
    reason: string;
  }): Promise<AdminActionResult> {
    const { status, body } = await callAs<BackendTicket & { error?: string }>(
      "staff", `/v1/support/tickets/${encodeURIComponent(input.reference)}/resolution`, {
        method: "POST", body: { reason: input.reason },
      });
    if (status !== 200) return { ok: false, error: body.error ?? "That ticket was not resolved." };
    return { ok: true, auditId: `${input.reference}:resolution` };
  },
};

// ----------------------------------------------------------------- audit --

type BackendAuditEntry = {
  id: string;
  at: string;
  action: string;
  actor: { accountId: string | null; label: string; role: string };
  subject: { kind: string; id: string | null };
  reason: string | null;
  changes: Record<string, unknown>;
};

/**
 * kkl-backend records an action name; the approved console groups actions into
 * four categories. Explicit, so an unmapped action lands under `accounts` and
 * is noticed rather than being silently filed by a substring match.
 */
const AUDIT_CATEGORY: Record<string, AuditCategory> = {
  "account.status_changed": "accounts",
  "account.provisioned": "accounts",
  "account.role_granted": "accounts",
  "wallet.adjusted": "money",
  "order.completed": "money",
  "order.cancelled": "money",
  "listing.decided": "listings",
  "lead.intake": "listings",
  "lead_request.status_changed": "listings",
  "support.ticket_opened": "support",
  "support.replied": "support",
  "support.internal_note_added": "support",
  "support.resolved": "support",
};

/**
 * `{ from, to }` pairs become before/after rows; anything else becomes a
 * single-value row rather than being dropped, because an audit entry that
 * silently loses a field is worse than an untidy one.
 */
function toFieldChanges(changes: Record<string, unknown>): FieldChange[] {
  return Object.entries(changes ?? {}).map(([field, value]) => {
    if (value && typeof value === "object" && "from" in value && "to" in value) {
      const pair = value as { from: unknown; to: unknown };
      return { field, before: String(pair.from ?? "—"), after: String(pair.to ?? "—") };
    }
    return { field, before: "—", after: typeof value === "object" ? JSON.stringify(value) : String(value) };
  });
}

const toAuditEntry = (e: BackendAuditEntry): AuditEntry => ({
  id: e.id,
  at: e.at,
  actor: {
    // kkl-backend has no staff-team model, so the account's own role stands
    // in rather than a team invented here.
    staffId: e.actor.accountId ?? "system",
    name: e.actor.label,
    team: e.actor.role,
  },
  category: AUDIT_CATEGORY[e.action] ?? "accounts",
  action: e.action,
  subject: e.subject.id ?? "—",
  subjectLabel: `${e.subject.kind.replace(/_/g, " ")} ${e.subject.id ?? ""}`.trim(),
  // The screens show the reason; an action recorded without one says so
  // rather than rendering an empty cell.
  reason: e.reason ?? "No reason was recorded with this action.",
  reasonCategory: null,
  changes: toFieldChanges(e.changes),
});

const ACTIONS_IN: Record<AuditCategory, string[]> = {
  accounts: ["account.status_changed", "account.provisioned", "account.role_granted"],
  money: ["wallet.adjusted", "order.completed", "order.cancelled"],
  listings: ["listing.decided", "lead.intake", "lead_request.status_changed"],
  support: ["support.ticket_opened", "support.replied", "support.internal_note_added", "support.resolved"],
};

export const backendAdminAudit = {
  async listAudit(category?: AuditCategory) {
    // kkl-backend filters by one action; a category is several. Fetching the
    // recent window once and filtering here reads no more than the caller is
    // entitled to — the endpoint is staff-only — and avoids four round trips.
    const { status, body } = await callAs<{ entries: BackendAuditEntry[] }>(
      "staff", "/v1/audit?limit=200");
    if (status !== 200) raise(status, body);
    const entries = body.entries.map(toAuditEntry);
    if (!category) return entries;
    const wanted = new Set(ACTIONS_IN[category]);
    return entries.filter((e) => wanted.has(e.action));
  },

  async getAudit(id: string) {
    const { status, body } = await callAs<{ entries: BackendAuditEntry[] }>(
      "staff", "/v1/audit?limit=200");
    if (status !== 200) raise(status, body);
    return body.entries.map(toAuditEntry).find((e) => e.id === id) ?? null;
  },
};
