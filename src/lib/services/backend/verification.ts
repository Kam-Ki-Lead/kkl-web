import type { VerificationService } from "@/lib/services/contracts";
import { ServiceError } from "@/lib/services/contracts";
import type {
  GatedAction, VerificationCase, VerificationEvent, VerificationOutcome, VerificationRequirement,
} from "@/lib/domain/types";
import { policyFor } from "@/lib/config/verification-policy";
import { callAs, type BackendRole } from "./session";

/**
 * Verification cases, served by kkl-backend.
 *
 * WHAT MOVES
 * The case: a durable record that a check was required for one action by one
 * account, judged under one version of the policy, with a reference and a
 * history.
 *
 * WHAT A CUSTOMER RESPONSE DOES NOT CONTAIN
 * The policy provenance — who decided the rule, on what basis, and the
 * internal note behind it — and any internal review note. Not because this
 * adapter strips them: the backend does not put them in a customer response,
 * and the internal events are not returned by its policy. There is nothing
 * here to filter and nothing a bug here could expose.
 *
 * WHAT CANNOT HAPPEN
 * A pass. No provider is selected (Q-4) and staff cannot award one
 * (undecided, and refused by a database constraint), so no case in this
 * build reaches `verified` except through an isolated test fixture. The
 * screens say so rather than showing a case that silently never moves.
 */

type BackendEvent = {
  at: string;
  outcome: VerificationOutcome;
  actorKind: "requester" | "staff" | "provider" | "system";
  actorLabel: string;
  note: string | null;
};

type BackendCase = {
  reference: string;
  action: GatedAction;
  outcome: VerificationOutcome;
  provider: { label: string; reference: string | null; selected: boolean };
  needsStaffAttention: boolean;
  openedAt: string;
  updatedAt: string;
  decidedAt: string | null;
  expiresAt: string | null;
  events: BackendEvent[];
  duplicate?: boolean;
  unavailable?: { reason: string; code: string; question: string };
};

type BackendRequirement = {
  action: GatedAction;
  outcome: VerificationOutcome;
  explanation: string;
  caseReference: string | null;
  blocksAction: boolean;
  verified: boolean;
};

const toEvent = (e: BackendEvent): VerificationEvent => ({
  at: e.at,
  outcome: e.outcome,
  actorLabel: e.actorLabel,
  note: e.note,
});

const toCase = (c: BackendCase): VerificationCase => ({
  reference: c.reference,
  action: c.action,
  actionLabel: policyFor(c.action)?.label ?? c.action,
  outcome: c.outcome,
  // The customer-facing sentence comes from the policy the screens already
  // hold; the backend sends the same text, and taking it from one place
  // keeps the wording identical wherever it appears.
  requiredBecause: policyFor(c.action)?.explanation ?? "",
  /**
   * Provenance is staff-facing and the backend does not send it to a
   * customer. The approved type requires the field, so it carries the
   * honest answer rather than a copy of the rule's internals: this response
   * did not include it.
   */
  policyProvenance: {
    note: "Not included in a customer response.",
    basis: "Not included in a customer response.",
    decidedBy: null,
  },
  provider: {
    label: c.provider.label,
    reference: c.provider.reference,
    // `isSample` in the approved type means "not a real provider". No
    // provider is selected at all, which is a stronger statement than
    // sample, and the label says which.
    isSample: !c.provider.selected,
  },
  needsStaffAttention: c.needsStaffAttention,
  openedAt: c.openedAt,
  updatedAt: c.updatedAt,
  events: c.events.map(toEvent),
});

const toRequirement = (r: BackendRequirement): VerificationRequirement => ({
  action: r.action,
  actionLabel: policyFor(r.action)?.label ?? r.action,
  outcome: r.outcome,
  explanation: r.explanation,
  caseReference: r.caseReference,
  blocksAction: r.blocksAction,
});

function raise(status: number, body: { error?: string; code?: string }): never {
  if (status === 409) {
    // `forbidden` rather than a new kind: asking for a case an action does
    // not need is refused, and the message is the useful part — it says that
    // "not required" is not the same as verified.
    throw new ServiceError("forbidden", body.error ?? "That case could not be opened.");
  }
  if (status === 404) throw new ServiceError("not_found", "That case could not be found.");
  throw new ServiceError("unavailable", body.error ?? `The verification service returned ${status}.`);
}

export function backendVerification(role: BackendRole): VerificationService {
  return {
    async requirements() {
      const { status, body } = await callAs<{ requirements: BackendRequirement[] }>(
        role, "/v1/verification/requirements");
      if (status !== 200) raise(status, body);
      return body.requirements.map(toRequirement);
    },

    async listMine() {
      const { status, body } = await callAs<{ cases: BackendCase[] }>(
        role, "/v1/verification/cases");
      if (status !== 200) raise(status, body);
      return body.cases.map(toCase);
    },

    async start(action) {
      const { status, body } = await callAs<BackendCase>(role, "/v1/verification/cases", {
        method: "POST", body: { action },
      });
      // 200 is the case that already existed — asking again after a reload is
      // the commonest thing a screen does, and it is not an error.
      if (status !== 201 && status !== 200) raise(status, body);
      return toCase(body);
    },

    async submit(reference) {
      const { status, body } = await callAs<BackendCase>(
        role, `/v1/verification/cases/${encodeURIComponent(reference)}/submission`, {
          method: "POST", body: {},
        });
      if (status === 404) return null;
      if (status !== 200) raise(status, body);
      // `unavailable` is on the response and is the honest state today: the
      // case exists, nothing is being checked, and the reason names Q-4. The
      // screens render the case with its `needs_review` event; the reason is
      // in the event note, so no information is lost by the approved type not
      // having a field for it.
      return toCase(body);
    },
  };
}

/** Whether the service can currently do anything, for a screen that must say so. */
export async function verificationAvailability(role: BackendRole): Promise<{
  readonly available: boolean;
  readonly reason: string | null;
}> {
  const { status, body } = await callAs<{
    verification?: { selected: boolean; configured: boolean; dependency: string | null };
  }>(role, "/health");
  if (status !== 200 || !body.verification) {
    return { available: false, reason: "The verification service could not be reached." };
  }
  return {
    available: body.verification.configured,
    reason: body.verification.configured
      ? null
      : "No verification provider is selected, so no check can be carried out. "
        + "Which provider, what documents may be collected, what consent is needed and how "
        + "long anything is kept are all open decisions.",
  };
}
