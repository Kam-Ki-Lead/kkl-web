/**
 * How a replaced answer is presented to staff.
 *
 * A corrected answer and a contradicted one look identical on a list — both
 * are a question with two values against it — and they mean opposite things.
 * One is somebody tidying up after themselves; the other is a conflict nobody
 * has resolved, and the second is what a human is being asked to look at.
 *
 * So the presentation distinguishes them by name, and the superseded value is
 * shown rather than hidden: it is evidence of what was said, and a staff
 * member reading a run needs to see that the city changed, not just that it is
 * Hooghly now.
 */

export type AnswerStatus =
  | "answered" | "skipped" | "unclear" | "contradictory" | "replaced" | "superseded";

export type SupersededReason =
  | "explicit_correction" | "buyer_confirmed_correction" | "staff_correction"
  | "dependent_answer_invalidated";

/**
 * What the backend sends. `status` is deliberately a plain string: the API
 * contract is the backend's, and a new status there should widen this screen's
 * "not usable" bucket rather than fail a type check and take the page down.
 */
export type RunAnswer = {
  readonly id: string;
  readonly questionKey: string;
  readonly status: string;
  readonly value: unknown;
  readonly superseded: boolean;
  readonly supersededReason?: string | null;
  readonly recordedAt?: string | null;
};

export type PresentedAnswer = {
  readonly id: string;
  readonly questionKey: string;
  readonly value: string;
  readonly recordedAt: string | null;
  /** The word shown beside the question. Never just "superseded". */
  readonly state:
    | "current" | "corrected" | "invalidated by a correction"
    | "contradictory — needs review" | "not usable" | "declined";
  readonly tone: "neutral" | "success" | "warning" | "danger";
  /** Present only where it helps: what happened, in a sentence. */
  readonly note: string | null;
  readonly needsHumanReview: boolean;
};

const SUPERSEDED_WORDS: Record<SupersededReason, { state: PresentedAnswer["state"]; note: string }> = {
  explicit_correction: {
    state: "corrected",
    note: "The buyer replaced this answer later in the conversation. Kept as evidence of "
      + "what was said; only the current answer is used.",
  },
  buyer_confirmed_correction: {
    state: "corrected",
    note: "The buyer picked this answer out of a list and confirmed the replacement before "
      + "it was applied. Kept as evidence of what was said.",
  },
  staff_correction: {
    state: "corrected",
    note: "A staff member replaced this answer in review. Kept as evidence.",
  },
  dependent_answer_invalidated: {
    state: "invalidated by a correction",
    note: "This answer depended on one that was corrected, so it no longer means anything "
      + "and was asked again.",
  },
};

function describe(answer: RunAnswer): Omit<PresentedAnswer, "id" | "questionKey" | "value" | "recordedAt"> {
  if (answer.superseded) {
    const known = answer.supersededReason
      ? SUPERSEDED_WORDS[answer.supersededReason as SupersededReason]
      : undefined;
    const reason = known
      ?? { state: "corrected" as const, note: "Replaced by a later answer." };
    return { state: reason.state, tone: "neutral", note: reason.note, needsHumanReview: false };
  }
  if (answer.status === "contradictory") {
    return {
      state: "contradictory — needs review",
      tone: "danger",
      note: "Two different answers, and nobody has said which is meant. The conversation "
        + "stopped here and a person has to resolve it.",
      needsHumanReview: true,
    };
  }
  if (answer.status === "unclear") {
    return {
      state: "not usable", tone: "warning",
      note: "Recorded but not usable. The question was asked again.", needsHumanReview: false,
    };
  }
  if (answer.status === "skipped") {
    return { state: "declined", tone: "neutral", note: null, needsHumanReview: false };
  }
  return { state: "current", tone: "success", note: null, needsHumanReview: false };
}

const asText = (value: unknown): string => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  const object = value as { optionId?: string; optionIds?: string[]; otherText?: string };
  if (typeof object.optionId === "string") {
    return object.otherText ? `${object.optionId} — "${object.otherText}"` : object.optionId;
  }
  if (Array.isArray(object.optionIds)) return object.optionIds.join(", ");
  return JSON.stringify(value);
};

export function presentAnswers(answers: readonly RunAnswer[]): readonly PresentedAnswer[] {
  return answers.map((answer) => ({
    id: answer.id,
    questionKey: answer.questionKey,
    value: answer.status === "answered" || answer.superseded
      ? asText(answer.value) : answer.status.replace(/_/g, " "),
    recordedAt: answer.recordedAt ?? null,
    ...describe(answer),
  }));
}

/** Whether this run has a conflict a person still has to resolve. */
export function needsHumanReview(answers: readonly RunAnswer[]): boolean {
  return presentAnswers(answers).some((a) => a.needsHumanReview);
}

/**
 * A one-line summary of corrections on a run, or null when there are none.
 *
 * Staff asked for "did they change anything?" to be answerable without
 * reading every row.
 */
export function correctionSummary(answers: readonly RunAnswer[]): string | null {
  const corrected = answers.filter((a) => a.superseded
    && (a.supersededReason === "explicit_correction"
      || a.supersededReason === "buyer_confirmed_correction"
      || a.supersededReason === "staff_correction"));
  if (corrected.length === 0) return null;
  const keys = [...new Set(corrected.map((a) => a.questionKey))];
  return `${corrected.length} answer${corrected.length === 1 ? "" : "s"} corrected `
    + `(${keys.join(", ")}). The original wording is kept against each one.`;
}
