import type { SupportService } from "@/lib/services/contracts";
import { ServiceError, ValidationError } from "@/lib/services/contracts";
import type { SupportThread, SupportTicket } from "@/lib/domain/types";
import type { TicketTopic } from "@/lib/domain/support-topics";
import { callAs, type BackendRole } from "./session";

/**
 * Support tickets, served by kkl-backend.
 *
 * WHAT MOVES
 * The ticket, its thread, and the status. Durable, account-scoped, and
 * readable after a restart by a process that did not write it.
 *
 * WHAT THIS ADAPTER CANNOT DO EVEN BY MISTAKE
 * Show an internal note. The backend's SELECT policy returns internal rows to
 * staff sessions only, and this adapter speaks as the account that owns the
 * ticket — so there is nothing in the response to filter, and a bug here
 * could not expose one.
 *
 * WHAT A REPLY DOES NOT CLAIM
 * Nothing is emailed. A staff reply creates a notification record and a
 * delivery job; the job fails closed with the provider dependency named
 * (Q-7). The screens say a message was recorded, never that it was sent.
 */

/**
 * The screens' four approved topics, and kkl-backend's seven slugs.
 *
 * Mapped rather than reconciled. The approved list (S-23) is what a Seller
 * reads and is not engineering's to change; the backend's vocabulary is
 * wider because staff triage on it. A topic the screens have no word for
 * comes back as "Something else" rather than leaking a slug into a label.
 */
const TOPIC_TO_BACKEND: Record<TicketTopic, string> = {
  "Lead quality": "leads",
  "Payment or credits": "billing",
  KYC: "verification",
  "Something else": "other",
};

const TOPIC_FROM_BACKEND: Record<string, TicketTopic> = {
  leads: "Lead quality",
  billing: "Payment or credits",
  verification: "KYC",
  other: "Something else",
  listings: "Something else",
  account: "Something else",
  technical: "Something else",
};

const toBackendTopic = (topic: string): string =>
  TOPIC_TO_BACKEND[topic as TicketTopic]
  // An unknown topic is sent as `other` rather than refused: the screens
  // cannot produce one, and a 422 would be the wrong thing to show if they
  // somehow did.
  ?? "other";

const fromBackendTopic = (topic: string): TicketTopic =>
  TOPIC_FROM_BACKEND[topic] ?? "Something else";

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
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolutionReason: string | null;
  messages?: BackendMessage[];
};

const toTicket = (t: BackendTicket): SupportTicket => ({
  id: t.id,
  reference: t.reference,
  subject: t.subject,
  status: t.status === "open" ? "awaiting_reply" : t.status,
  topic: fromBackendTopic(t.topic),
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
});

const toThread = (t: BackendTicket): SupportThread => ({
  ...toTicket(t),
  messages: (t.messages ?? []).map((m) => ({
    id: m.id,
    author: m.authorKind === "requester" ? "you" : "support",
    authorLabel: m.authorLabel,
    body: m.body,
    sentAt: m.createdAt,
  })),
});

function raise(status: number, body: { error?: string; field?: string }): never {
  if (status === 422) {
    throw new ValidationError({ [body.field ?? "form"]: body.error ?? "This value was not accepted." });
  }
  if (status === 404) throw new ServiceError("not_found", "That ticket could not be found.");
  throw new ServiceError("unavailable", body.error ?? `The support service returned ${status}.`);
}

export function backendSupport(role: BackendRole): SupportService {
  return {
    async listTickets() {
      const { status, body } = await callAs<{ tickets: BackendTicket[] }>(role, "/v1/support/tickets");
      if (status !== 200) raise(status, body);
      return body.tickets.map(toTicket);
    },

    async getThread(reference) {
      const { status, body } = await callAs<BackendTicket>(
        role, `/v1/support/tickets/${encodeURIComponent(reference)}`);
      if (status === 404) return null;
      if (status !== 200) raise(status, body);
      return toThread(body);
    },

    async createTicket(input) {
      const { status, body } = await callAs<BackendTicket>(role, "/v1/support/tickets", {
        method: "POST",
        body: {
          topic: toBackendTopic(input.topic),
          subject: input.subject,
          body: input.body,
          raisedFrom: role,
        },
      });
      if (status !== 201) raise(status, body);
      return toTicket(body);
    },

    async reply(input) {
      const { status, body } = await callAs<BackendTicket>(
        role, `/v1/support/tickets/${encodeURIComponent(input.reference)}/messages`, {
          // `internal` is deliberately not passed through from a user-facing
          // service. This adapter speaks as the account; an internal note is
          // staff's, and the backend would refuse one anyway.
          method: "POST", body: { body: input.body },
        });
      if (status !== 201) raise(status, body);
      return toThread(body);
    },

    async resolve(reference) {
      // A requester closing their own ticket is not a staff resolution: the
      // backend requires staff and a reason, so this reports the refusal
      // rather than inventing a reason on somebody's behalf.
      const { status, body } = await callAs<BackendTicket>(
        role, `/v1/support/tickets/${encodeURIComponent(reference)}/resolution`, {
          method: "POST", body: {},
        });
      if (status === 404) throw new ServiceError("not_found", `No ticket ${reference}.`);
      if (status !== 200) {
        throw new ServiceError("unavailable",
          body.error ?? "Only the support team can resolve a ticket. Reply to ask them to close it.");
      }
      return toThread(body);
    },
  };
}
