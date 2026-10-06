/**
 * How a PROPOSED qualification assessment is presented, and what may never be
 * presented alongside it.
 *
 * The backend computes this from a policy this implementation wrote, not from
 * a rule the client approved. The single most likely way that distinction gets
 * lost is on a screen: a big number in a box reads as a fact. So the
 * formatting lives here, it is tested, and every path through it carries the
 * caveat — there is no variant that returns a bare number.
 *
 * WHAT CHANGED IN proposed-v2
 *
 * v1 presented one number. That number was information completeness wearing a
 * readiness label: somebody who answered every question and said they were
 * just exploring showed as a high level. v2 reports three separate things, and
 * this module presents them as three, because collapsing them back into one
 * headline on screen would undo the fix in the one place it matters most.
 *
 *   completeness   how much we know, levels 1 to 6
 *   readiness      what the answers say about intent — a verdict, not a level
 *   financial fit  undetermined, and said so
 */

export type Axis = "completeness" | "readiness" | "financial_fit";

export type CompletenessLevel = {
  readonly level: number;
  readonly factor: string;
  readonly axis: Axis;
  readonly satisfied: boolean;
  readonly why: string;
  readonly missing?: readonly string[];
  readonly unusable?: readonly { key: string; status: string }[];
};

export type ReadinessVerdict = "strong" | "moderate" | "low" | "undetermined";

export type Readiness = {
  readonly verdict: ReadinessVerdict;
  readonly signals: Readonly<Record<string, string>>;
  readonly reasons: readonly string[];
  readonly isALevel: boolean;
  readonly note: string;
};

export type FinancialFit = {
  readonly verdict: "undetermined";
  readonly reason: string;
  readonly inputsKnown: Readonly<Record<string, boolean>>;
  readonly requiresApproval: string;
  readonly neverTreatedAsUnsuitable: readonly string[];
  readonly inactiveProposal?: {
    readonly active: false;
    readonly affectsOutcome: false;
    readonly opinion: string;
    readonly reason?: string;
  } | null;
};

export type ProposedScore = {
  readonly policyVersion: string;
  readonly basis: string;
  readonly approved: boolean;
  readonly optOut: { readonly optedOut: boolean; readonly enforcement: string; readonly note?: string };
  readonly completeness: {
    readonly axis: string;
    readonly level: number | null;
    readonly ceiling: number;
    readonly stoppedAtLevel: number | null;
    readonly levels: readonly CompletenessLevel[];
    readonly note?: string;
  };
  readonly readiness: Readiness;
  readonly financialFit: FinancialFit;
  readonly proposedLevel: number | null;
  readonly levelCeiling: number;
  readonly blockedBy: readonly string[];
  readonly unscoredReason: string | null;
  readonly commercialEffect: {
    readonly pricing: string;
    readonly contactRelease: string;
    readonly eligibility: string;
    readonly why: string;
  };
  readonly caveat: string;
};

export type PresentedAxis = {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
};

export type PresentedScore = {
  /**
   * Set whenever the person has opted out, and null otherwise.
   *
   * Separate from `headline` so a screen cannot render the assessment without
   * deciding what to do about this: a suppressed person with strong readiness
   * is the exact case where a reader skims the verdict and reaches for the
   * phone. It carries its own short banner text, the chip wording, and the
   * instruction, so no component has to compose the warning itself.
   */
  readonly suppression: {
    readonly suppressed: true;
    readonly chip: string;
    readonly banner: string;
    readonly instruction: string;
    readonly appliesDespite: string;
  } | null;
  /** Never just a number, and never one figure standing for all three axes. */
  readonly headline: string;
  /** Shown adjacent to the headline, always. */
  readonly caveat: string;
  readonly policyLabel: string;
  /** The three axes, presented separately and in this order. */
  readonly axes: readonly PresentedAxis[];
  readonly ceilingNote: string;
  readonly stopReason: string | null;
  /** Retained for callers that render a single line. Mirrors `suppression.banner`. */
  readonly optOutNotice: string | null;
  readonly commercialNote: string;
  readonly inactiveProposalNote: string | null;
  readonly rows: readonly {
    level: number; factor: string; axis: Axis;
    state: "met" | "not met" | "not assessed"; why: string;
  }[];
};

/** The one sentence that must appear wherever a proposed assessment appears. */
export const PROPOSED_SCORE_CAVEAT =
  "Proposed by an implementation policy, not approved by the client. It does not set a "
  + "price, authorise a purchase or release a contact.";

const READINESS_WORDS: Record<ReadinessVerdict, string> = {
  strong: "Strong",
  moderate: "Moderate",
  low: "Low",
  undetermined: "Undetermined",
};

/** The ten factors, so the table can show the four this policy does not score. */
const UNSCORED_FACTORS: readonly { level: number; factor: string; axis: Axis }[] = [
  { level: 7, factor: "Financial Capacity + Fit", axis: "financial_fit" },
  { level: 8, factor: "Decision Readiness", axis: "readiness" },
  { level: 9, factor: "Action Intent", axis: "readiness" },
  { level: 10, factor: "High-Intent Qualified Buyer", axis: "readiness" },
];

export function presentProposedScore(score: ProposedScore | null): PresentedScore | null {
  if (!score) return null;

  const completeness = score.completeness;
  const stopped = completeness.stoppedAtLevel;

  const completenessValue = completeness.level === null
    ? "None reached"
    : `Level ${completeness.level} of ${completeness.ceiling}`;

  const axes: PresentedAxis[] = [
    {
      label: "Information completeness",
      value: completenessValue,
      detail: "How much of the questionnaire we have usable answers to. Levels 1 to 6 of "
        + "the client's table ask whether we know something, so answering satisfies them. "
        + "A favourable answer is a different question.",
    },
    {
      label: "Buyer readiness",
      value: READINESS_WORDS[score.readiness.verdict] ?? "Undetermined",
      detail: score.readiness.reasons.length
        ? score.readiness.reasons.join("; ")
        : "Read from the timeline, decision-maker, site-visit and requested-action answers. "
          + "Not a level, and not added to the completeness figure.",
    },
    {
      label: "Financial fit",
      value: "Undetermined",
      detail: `${score.financialFit.reason}. Never treated as unsuitable: `
        + `${score.financialFit.neverTreatedAsUnsuitable.join(", ")}.`,
    },
  ];

  const suppressed = score.optOut.optedOut === true;

  // Built once and reused for the banner, the chip and the legacy single-line
  // field, so the three can never disagree with each other on screen.
  const suppression = suppressed
    ? {
      suppressed: true as const,
      chip: "DO NOT CONTACT",
      banner: "This person has opted out. Do not call, message or add them to any "
        + "campaign. No contact and no sale, whatever this assessment says.",
      instruction: "If you need to reach them, that is a decision for whoever owns "
        + "the suppression list — not something this screen can authorise.",
      appliesDespite: score.readiness.verdict === "strong"
        ? "Their readiness reads Strong. That does not lift the suppression."
        : "Opt-out is enforced independently of every assessment on this panel.",
    }
    : null;

  return {
    suppression,
    headline: completeness.level === null
      ? "Not yet assessed"
      : `Proposed completeness level ${completeness.level} of ${completeness.ceiling}`,
    caveat: PROPOSED_SCORE_CAVEAT,
    policyLabel: `Policy ${score.policyVersion}`,
    axes,
    ceilingNote: score.blockedBy.join(" "),
    stopReason: completeness.level === null
      ? (score.unscoredReason ?? "No answers yet.")
      : stopped === null
        ? null
        : `Stopped at level ${stopped}: `
          + `${completeness.levels.find((l) => l.level === stopped)?.why ?? ""}`,
    optOutNotice: suppression ? `${suppression.banner} ${suppression.appliesDespite}` : null,
    commercialNote: score.commercialEffect.why,
    inactiveProposalNote: score.financialFit.inactiveProposal
      ? `Inactive proposal says "${score.financialFit.inactiveProposal.opinion}". `
        + "It is switched off, it affects nothing, and it is shown only so it can be "
        + "rejected or amended."
      : null,
    rows: [
      ...completeness.levels.map((level) => ({
        level: level.level,
        factor: level.factor,
        axis: level.axis,
        state: (level.satisfied ? "met" : "not met") as "met" | "not met" | "not assessed",
        why: level.why,
      })),
      ...UNSCORED_FACTORS.map((factor) => ({
        ...factor,
        state: "not assessed" as const,
        why: factor.level === 7
          ? "Needs an affordability rule the client approves."
          : "Sits above level 7 on a cumulative ladder, so it cannot be claimed while "
            + "level 7 is unassessed. Readiness is reported separately instead.",
      })),
    ],
  };
}

/**
 * Whether a screen may act on this assessment. Always false, by construction.
 *
 * Exported so the answer is a value a component can read rather than a rule
 * somebody has to remember. The day a policy is approved, this is the one
 * function that changes, and its tests say what that would mean.
 */
export function mayPriceFromProposedScore(score: ProposedScore | null): boolean {
  void score;
  return false;
}

/**
 * Whether a screen may release a contact or act commercially. Always false,
 * and false for a second, independent reason when the person has opted out.
 */
export function mayReleaseContact(score: ProposedScore | null): boolean {
  void score;
  return false;
}

/**
 * Whether this person is on the do-not-contact list.
 *
 * Read straight from the run's opt-out state, never from the assessment. A
 * component asking "may I show a call button?" asks this, not the readiness
 * verdict, so the answer cannot drift when the policy changes.
 */
export function isSuppressed(score: ProposedScore | null): boolean {
  return score?.optOut.optedOut === true;
}
