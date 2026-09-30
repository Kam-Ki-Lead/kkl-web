import type { AdminActionResult } from "@/lib/domain/admin";
import type { VerificationCase } from "@/lib/domain/types";
import type { StaffRef } from "@/lib/domain/identity";
import { ServiceError } from "@/lib/services/contracts";
import { callAs } from "./session";

/**
 * The staff verification queues, served by kkl-backend.
 *
 * THREE LISTS, NOT ONE WITH A FLAG
 * `attention` is waiting on a person, `routine` is with the provider, and
 * `failed` is neither. The backend returns them separately so routine
 * processing cannot fill a staff queue and a case needing attention cannot be
 * lost inside one — a distinction that survives only if nobody has to
 * remember to filter.
 *
 * WHAT THIS ADAPTER WILL NOT DO
 * Send `verified`. The backend refuses it, a constraint refuses it
 * underneath, and passing it through so the screen could show the refusal
 * would be a worse experience than the screen knowing. So the outcome is
 * narrowed here as well, and the reason is reported when somebody tries.
 */

type BackendEvent = {
  at: string;
  outcome: string;
  actorKind: string;
  actorLabel: string;
  note: string | null;
  visibility?: "shared" | "internal";
};

type BackendCase = {
  reference: string;
  action: string;
  outcome: string;
  provider: { label: string; reference: string | null; selected: boolean };
  needsStaffAttention: boolean;
  openedAt: string;
  updatedAt: string;
  decidedAt: string | null;
  expiresAt: string | null;
  events: BackendEvent[];
  accountId?: string;
  requesterLabel?: string | null;
  requesterRole?: string | null;
  policyVersion?: number;
  policy?: {
    version: number;
    required: boolean;
    basis: string;
    decidedBy: string | null;
    internalNote: string;
    confirmed: boolean;
  } | null;
};

function raise(status: number, body: { error?: string }): never {
  throw new ServiceError("unavailable", body.error ?? `The verification service returned ${status}.`);
}

/**
 * The staff shape carries the provenance the customer shape does not: which
 * version of the policy applied, on what basis, and who decided it. That is
 * the first question anybody auditing a verification policy asks.
 */
/**
 * The provenance line the approved screen renders. `basis` stays the bare
 * enum the screen switches on — decorating it with the version turned the
 * label into "unconfirmed assumption" for a rule the client had confirmed,
 * which is the opposite of what an audit needs to read. The version and its
 * confirmation state belong in the note beside it, where they are words
 * rather than a value something compares against.
 */
const provenanceNote = (p: NonNullable<BackendCase["policy"]>): string =>
  `Policy version ${p.version}, ${
    p.confirmed ? "confirmed by the client" : "recorded as an assumption, not yet confirmed"
  }. ${p.internalNote}`;

const toAdminCase = (c: BackendCase): VerificationCase => ({
  reference: c.reference,
  action: c.action as VerificationCase["action"],
  actionLabel: c.action.replace(/_/g, " "),
  outcome: c.outcome as VerificationCase["outcome"],
  requiredBecause: c.policy?.internalNote ?? "",
  policyProvenance: {
    note: c.policy ? provenanceNote(c.policy) : "The policy version behind this case could not be read.",
    basis: c.policy?.basis ?? "unknown",
    decidedBy: c.policy?.decidedBy ?? null,
  },
  provider: {
    label: c.provider.label,
    reference: c.provider.reference,
    isSample: !c.provider.selected,
  },
  needsStaffAttention: c.needsStaffAttention,
  openedAt: c.openedAt,
  updatedAt: c.updatedAt,
  events: c.events.map((e) => ({
    at: e.at,
    outcome: e.outcome as VerificationCase["outcome"],
    actorLabel: e.actorLabel,
    note: e.note,
  })),
});

export const backendAdminVerification = {
  async verificationQueues() {
    const { status, body } = await callAs<{
      attention: BackendCase[]; routine: BackendCase[]; failed: BackendCase[];
      providerErrors: unknown[];
    }>("staff", "/v1/verification/queues");
    if (status !== 200) raise(status, body);
    return {
      attention: body.attention.map(toAdminCase),
      routine: body.routine.map(toAdminCase),
    };
  },

  async getVerificationCase(reference: string) {
    const { status, body } = await callAs<BackendCase>(
      "staff", `/v1/verification/cases/${encodeURIComponent(reference)}?view=staff`);
    if (status === 404) return null;
    if (status !== 200) raise(status, body);
    return toAdminCase(body);
  },

  async decideVerificationCase(input: {
    actor: StaffRef;
    reference: string;
    outcome: "verified" | "failed" | "needs_review" | "expired";
    reason: string;
  }): Promise<AdminActionResult> {
    // Refused here as well as at the backend and at the database. Three
    // places for one rule is not belt and braces: this one exists so the
    // screen can say why without a round trip, and the other two exist so
    // that a different client cannot do it at all.
    if (input.outcome === "verified") {
      return {
        ok: false,
        error:
          "A verification cannot be marked as passed by hand. Whether anybody may approve one "
          + "with no provider result has not been decided, and until it is, nothing in this "
          + "system can award a verified outcome. Record the case as needing more information, "
          + "failed, or escalated.",
      };
    }
    const { status, body } = await callAs<BackendCase & { error?: string }>(
      "staff", `/v1/verification/cases/${encodeURIComponent(input.reference)}/decision`, {
        method: "POST",
        // `actor` is not sent: kkl-backend reads the acting account from the
        // session, and an actor in a request body is a claim anybody could
        // make.
        body: { outcome: input.outcome, reason: input.reason },
      });
    if (status !== 200) {
      return { ok: false, error: body.error ?? "That decision was not accepted." };
    }
    return { ok: true, auditId: `${input.reference}:${input.outcome}` };
  },
};
