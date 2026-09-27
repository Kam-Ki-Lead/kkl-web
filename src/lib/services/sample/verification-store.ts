import type {
  GatedAction,
  VerificationCase,
  VerificationEvent,
  VerificationOutcome,
  VerificationRequirement,
} from "@/lib/domain/types";
import type { StaffRef } from "@/lib/domain/identity";
import { PROVIDER_FAILURE_OUTCOME, actionsFor, policyFor } from "@/lib/config/verification-policy";
import { processState } from "./process-state";

/**
 * CR07 — the sample verification service.
 *
 * WHAT IS REAL HERE
 * -----------------
 * The policy and the structure: which actions require a check, that
 * "not required" is its own state, that registering opens no case, that routine
 * provider processing is separate from cases needing a person, that a provider
 * failure becomes a case for review rather than an approval, and that every
 * staff decision carries a reason and lands in the case's history.
 *
 * WHAT IS NOT REAL, AND IS LABELLED EVERYWHERE IT APPEARS
 * ------------------------------------------------------
 * The checking. No provider has been selected — the client document lists four
 * for evaluation and none is approved — so this is a **sample verification
 * service**: it accepts no identity document, sends nothing anywhere, and its
 * outcomes are driven by the review controls below so each state can be seen.
 * Every screen that shows a case says which service produced it.
 *
 * No compliance claim is made or implied. What checks are legally required,
 * what may be collected, what consent is needed and how long anything is kept
 * are decisions for the client and its compliance adviser.
 */

const PROVIDER_LABEL = "Sample verification service (no provider selected)";

type StoredCase = {
  reference: string;
  action: GatedAction;
  outcome: VerificationOutcome;
  providerReference: string | null;
  openedAt: string;
  updatedAt: string;
  events: VerificationEvent[];
};

type VerificationState = {
  cases: StoredCase[];
  nextReference: number;
  /**
   * What the sample provider will do next, for review. Not a policy knob: it
   * stands in for the provider's answer, which in production comes from the
   * provider.
   */
  nextProviderResult: "verified" | "failed" | "unclear" | "unavailable";
};

/** The account these cases belong to. One sample account; there is no sign-in. */
const SAMPLE_SUBJECT = "Sujata Pal · Sen Properties";

function nowIso(): string {
  return new Date().toISOString();
}

function seed(): VerificationState {
  const at = "2026-09-26T10:05:00.000Z";
  return {
    nextReference: 4402,
    nextProviderResult: "verified",
    cases: [
      {
        reference: "VER-4401",
        action: "purchase_lead",
        outcome: "needs_review",
        providerReference: "SVS-9f2c",
        openedAt: at,
        updatedAt: at,
        events: [
          { at, outcome: "required", actorLabel: SAMPLE_SUBJECT, note: null },
          { at, outcome: "in_progress", actorLabel: PROVIDER_LABEL, note: null },
          {
            at,
            outcome: "needs_review",
            actorLabel: PROVIDER_LABEL,
            note: "The provider could not read the document image. A person has to look at this — an unreadable result is not a pass.",
          },
        ],
      },
    ],
  };
}

function store(): VerificationState {
  return processState<VerificationState>("kkl.sample.verification", seed);
}

/** Which outcomes are waiting on a person rather than on the provider. */
function needsAttention(outcome: VerificationOutcome): boolean {
  return outcome === "needs_review" || outcome === "failed" || outcome === "expired";
}

const ACTION_LABELS: Record<GatedAction, string> = {
  browse_properties: "Browse and search properties",
  enquire_property: "Enquire about a property",
  request_leads: "Request leads",
  purchase_lead: "Buy a lead",
  publish_owner_listing: "Publish a property you own",
  publish_builder_listing: "Publish a project listing",
};

function project(c: StoredCase): VerificationCase {
  return {
    reference: c.reference,
    action: c.action,
    actionLabel: ACTION_LABELS[c.action],
    outcome: c.outcome,
    requiredBecause: policyFor(c.action).explanation,
    provider: {
      label: PROVIDER_LABEL,
      reference: c.providerReference,
      isSample: true,
    },
    needsStaffAttention: needsAttention(c.outcome),
    openedAt: c.openedAt,
    updatedAt: c.updatedAt,
    events: [...c.events],
  };
}

function caseFor(action: GatedAction): StoredCase | undefined {
  // The most recent case for the action; a re-opened check supersedes an older one.
  return [...store().cases].reverse().find((c) => c.action === action);
}

// ------------------------------------------------------------------ reads --

/**
 * What an account needs, action by action.
 *
 * Note what is absent: any code path that turns "not required" into "verified".
 * They are different answers and the type keeps them different.
 */
export function requirements(role: "buyer" | "seller" | "builder" | "owner"): readonly VerificationRequirement[] {
  return actionsFor(role).map((action) => {
    const rule = policyFor(action);
    if (!rule.required) {
      return {
        action,
        actionLabel: rule.label,
        outcome: "not_required" as VerificationOutcome,
        explanation: rule.explanation,
        // No case, because no check was needed. Registering opens nothing.
        caseReference: null,
        blocksAction: false,
      };
    }
    const existing = caseFor(action);
    const outcome: VerificationOutcome = existing?.outcome ?? "required";
    return {
      action,
      actionLabel: rule.label,
      outcome,
      explanation: rule.explanation,
      caseReference: existing?.reference ?? null,
      // Only a completed, successful check clears the action. In particular a
      // failed or unreviewed case does not, and neither does an expired one.
      blocksAction: outcome !== "verified",
    };
  });
}

export function listCases(): readonly VerificationCase[] {
  return [...store().cases]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(project);
}

export function getCase(reference: string): VerificationCase | null {
  const found = store().cases.find((c) => c.reference === reference);
  return found === undefined ? null : project(found);
}

/**
 * The staff queue, split.
 *
 * `attention` is what a person has to do something about. `routine` is what the
 * provider is still working on, kept out of the queue so it cannot bury the
 * cases that need someone — and shown separately rather than hidden, so nobody
 * has to wonder whether a case vanished.
 */
export function staffQueues(): {
  readonly attention: readonly VerificationCase[];
  readonly routine: readonly VerificationCase[];
} {
  const all = listCases();
  return {
    attention: all.filter((c) => c.needsStaffAttention),
    routine: all.filter((c) => c.outcome === "in_progress"),
  };
}

// ----------------------------------------------------------------- writes --

/**
 * Opens a case for an action that needs one.
 *
 * Deliberately not called on registration, and there is no code path that does:
 * an ordinary user who signs up has no case and appears in no queue.
 */
export function startCase(action: GatedAction): VerificationCase {
  const rule = policyFor(action);
  if (!rule.required) {
    throw new Error(`No verification is required for ${action}; refusing to open a case.`);
  }
  const existing = caseFor(action);
  if (existing && existing.outcome !== "failed" && existing.outcome !== "expired") {
    return project(existing);
  }

  const s = store();
  const at = nowIso();
  const created: StoredCase = {
    reference: `VER-${s.nextReference++}`,
    action,
    outcome: "required",
    providerReference: null,
    openedAt: at,
    updatedAt: at,
    events: [{ at, outcome: "required", actorLabel: SAMPLE_SUBJECT, note: null }],
  };
  s.cases.push(created);
  return project(created);
}

/**
 * Sends the case to the sample provider and records what came back.
 *
 * The important line is the last one in the switch. An unavailable or
 * unreadable provider result becomes `needs_review`, never `verified`. That is
 * the failure mode the policy matrix singles out: "a provider failure never
 * silently becomes a verification success."
 */
export function submitToProvider(reference: string): VerificationCase | null {
  const c = store().cases.find((x) => x.reference === reference);
  if (c === undefined) return null;

  const at = nowIso();
  c.providerReference = c.providerReference ?? `SVS-${Math.random().toString(16).slice(2, 6)}`;
  c.outcome = "in_progress";
  c.updatedAt = at;
  c.events.push({ at, outcome: "in_progress", actorLabel: PROVIDER_LABEL, note: null });

  const result = store().nextProviderResult;
  const settledAt = nowIso();
  switch (result) {
    case "verified":
      c.outcome = "verified";
      c.events.push({ at: settledAt, outcome: "verified", actorLabel: PROVIDER_LABEL, note: null });
      break;
    case "failed":
      c.outcome = "failed";
      c.events.push({
        at: settledAt,
        outcome: "failed",
        actorLabel: PROVIDER_LABEL,
        note: "The check completed and did not pass.",
      });
      break;
    case "unclear":
    case "unavailable":
      c.outcome = PROVIDER_FAILURE_OUTCOME;
      c.events.push({
        at: settledAt,
        outcome: PROVIDER_FAILURE_OUTCOME,
        actorLabel: PROVIDER_LABEL,
        note:
          result === "unavailable"
            ? "The verification service could not be reached. This is a case for a person, not an approval — an outage is not a pass."
            : "The result could not be read. This is a case for a person, not an approval.",
      });
      break;
  }
  c.updatedAt = settledAt;
  return project(c);
}

/**
 * A staff decision on a case.
 *
 * The reason is mandatory and is written to the case's history. A decision with
 * no reason is not a decision anybody can review later, and this is the screen
 * where somebody's identity is being accepted or refused.
 */
export function decideCase(input: {
  actor: StaffRef;
  reference: string;
  outcome: Extract<VerificationOutcome, "verified" | "failed" | "needs_review" | "expired">;
  reason: string;
}): { ok: true; from: VerificationOutcome; to: VerificationOutcome } | { ok: false; error: string } {
  const c = store().cases.find((x) => x.reference === input.reference);
  if (c === undefined) return { ok: false, error: "That case could not be found." };
  const reason = input.reason.trim();
  if (reason === "") {
    return {
      ok: false,
      error:
        "Record why. The reason is kept with the decision and, where the person is told the outcome, shown to them.",
    };
  }
  if (c.outcome === input.outcome) {
    return { ok: false, error: `This case is already ${input.outcome.replace("_", " ")}.` };
  }

  const from = c.outcome;
  const at = nowIso();
  c.outcome = input.outcome;
  c.updatedAt = at;
  c.events.push({
    at,
    outcome: input.outcome,
    actorLabel: `${input.actor.name} · ${input.actor.team}`,
    note: reason,
  });
  return { ok: true, from, to: input.outcome };
}

// ------------------------------------------------------------ review-only --

/** What the sample provider answers next. Review control, not a policy knob. */
export function setProviderResultForReview(
  result: VerificationState["nextProviderResult"],
): void {
  store().nextProviderResult = result;
}

export function resetVerification(): void {
  const s = store();
  const fresh = seed();
  s.cases = fresh.cases;
  s.nextReference = fresh.nextReference;
  s.nextProviderResult = fresh.nextProviderResult;
}
