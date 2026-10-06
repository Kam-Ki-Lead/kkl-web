/**
 * How a PROPOSED qualification score is presented, and what may never be
 * presented alongside it.
 *
 * The backend computes a level from a policy this implementation wrote, not
 * from a rule the client approved. The single most likely way that distinction
 * gets lost is on a screen: a big number in a box reads as a fact. So the
 * formatting lives here, it is tested, and every path through it carries the
 * caveat — there is no variant that returns a bare number.
 */

export type ProposedLevelAssessment = {
  readonly level: number;
  readonly factor: string;
  readonly satisfied: boolean;
  readonly why: string;
  readonly missing?: readonly string[];
  readonly unusable?: readonly { key: string; status: string }[];
  readonly affordability?: { verdict: string; basis: string; reason?: string } | null;
};

export type ProposedScore = {
  readonly policyVersion: string;
  readonly basis: string;
  readonly approved: boolean;
  readonly proposedLevel: number | null;
  readonly unscoredReason: string | null;
  readonly stoppedAtLevel: number | null;
  readonly satisfiedAboveGap?: readonly number[];
  readonly affordability?: { verdict: string; basis: string } | null;
  readonly levels: readonly ProposedLevelAssessment[];
};

export type PresentedScore = {
  /** Never just the number. "Proposed level 7 of 10", or "Not yet scored". */
  readonly headline: string;
  /** Shown adjacent to the headline, always. */
  readonly caveat: string;
  readonly policyLabel: string;
  readonly reachedLabel: string;
  readonly stopReason: string | null;
  readonly affordabilityNote: string | null;
  readonly aboveGapNote: string | null;
  readonly rows: readonly {
    level: number; factor: string; state: "met" | "not met" | "above the gap"; why: string;
  }[];
};

/** The one sentence that must appear wherever a proposed level appears. */
export const PROPOSED_SCORE_CAVEAT =
  "Proposed by an implementation policy, not approved by the client. It does not set a "
  + "price, authorise a purchase or release a contact.";

export function presentProposedScore(score: ProposedScore | null): PresentedScore | null {
  if (!score) return null;

  const stopped = score.stoppedAtLevel;
  const aboveGap = score.satisfiedAboveGap ?? [];

  return {
    headline: score.proposedLevel === null
      ? "Not yet scored"
      : `Proposed level ${score.proposedLevel} of 10`,
    caveat: PROPOSED_SCORE_CAVEAT,
    policyLabel: `Policy ${score.policyVersion}`,
    reachedLabel: score.proposedLevel === null
      ? "No level reached"
      : `Levels 1 to ${score.proposedLevel} are all met`,
    stopReason: score.proposedLevel === null
      ? (score.unscoredReason ?? "No answers yet.")
      : stopped === null
        ? null
        : `Stopped at level ${stopped}: ${score.levels.find((l) => l.level === stopped)?.why ?? ""}`,
    affordabilityNote: score.affordability
      ? `Affordability ${score.affordability.verdict} — on an unapproved default `
        + `(${score.affordability.basis}), not a lending assessment.`
      : null,
    aboveGapNote: aboveGap.length
      ? `Also met on its own, above the gap: ${aboveGap.map((l) => `level ${l}`).join(", ")}. `
        + "Levels are read cumulatively, so these do not raise the proposed level."
      : null,
    rows: score.levels.map((level) => ({
      level: level.level,
      factor: level.factor,
      state: level.satisfied
        ? (stopped !== null && level.level > stopped ? "above the gap" : "met")
        : "not met",
      why: level.why,
    })),
  };
}

/**
 * Whether a screen may act on this score. Always false, by construction.
 *
 * Exported so the answer is a value a component can read rather than a rule
 * somebody has to remember. The day a policy is approved, this is the one
 * function that changes, and its tests say what that would mean.
 */
export function mayPriceFromProposedScore(score: ProposedScore | null): boolean {
  void score;
  return false;
}
