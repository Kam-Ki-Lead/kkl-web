/**
 * Settling a contradiction, from the screen's side.
 *
 * A run held for review used to be a dead end: the conflict was visible and
 * there was no action that ended it. The backend now takes a resolution. This
 * module is the part a screen needs and a server action must agree with —
 * which conflicting answers there are, what they say in the client's own
 * words, and whether what a staff member typed is worth sending.
 *
 * It is pure. It calls nothing, so every branch below is testable without a
 * server, and the validation here is the same validation the backend applies:
 * a form that passes this should not come back 422, and a form that fails it
 * never leaves the browser.
 *
 * WHAT A RESOLUTION IS NOT
 *
 * It records which answer stands and why. It does not contact anybody, does
 * not lift a suppression, does not grant consent and does not confirm a
 * visit. Resuming a conversation and dispatching to a provider are separate
 * things, and the backend keeps them separate; this module repeats it because
 * "the run resumed" is the sentence somebody will read as "we called them".
 */

export type ConflictingAnswer = {
  readonly answerId: string;
  readonly value: unknown;
  readonly rawText: string | null;
  readonly source: string | null;
  readonly recordedAt: string | null;
};

export type ConflictQuestionOption = {
  readonly id: string;
  readonly label: string;
};

export type ConflictQuestion = {
  readonly key: string;
  readonly prompt: string;
  readonly required: boolean;
  readonly answerSchema: {
    readonly type?: string;
    readonly options?: readonly ConflictQuestionOption[];
    readonly min?: number;
    readonly max?: number;
    readonly maxLength?: number;
  } | null;
};

export type Contradiction = {
  readonly questionKey: string;
  readonly question: ConflictQuestion | null;
  readonly answers: readonly ConflictingAnswer[];
};

export type RecordedResolution = {
  readonly id: string;
  readonly questionKey: string;
  readonly resolution: "kept" | "entered" | string;
  readonly resultingAnswerId: string | null;
  readonly reason: string;
  readonly actorRole: string | null;
  readonly recordedAt: string | null;
};

export type ContradictionView = {
  readonly runId: string;
  /**
   * What the screen was looking at. Sent back on a save so a resolution
   * decided against answers somebody has since changed is refused rather
   * than applied — see `staleScreenMessage`.
   */
  readonly observedAt: string | null;
  readonly unresolved: readonly Contradiction[];
  readonly resolved: readonly RecordedResolution[];
  readonly note: string | null;
};

/** The two ways to settle one. Exactly one of them, never both. */
export type ResolutionChoice =
  | { readonly kind: "keep"; readonly answerId: string }
  | { readonly kind: "enter"; readonly value: unknown };

export const REASON_MIN = 3;
export const REASON_MAX = 500;

export type ResolutionProblem = {
  readonly field: "questionKey" | "choice" | "value" | "reason";
  readonly message: string;
};

/**
 * Reads an answer value the way the client's questionnaire reads it.
 *
 * An option id is not a label. `q04_hooghly` on a review screen is somebody
 * being asked to decide between two strings they have to decode, so the
 * question's own options are used where they are available and the raw id is
 * shown only when they are not.
 */
export function describeAnswerValue(
  question: ConflictQuestion | null,
  value: unknown,
): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  const options = question?.answerSchema?.options ?? [];
  const label = (id: string): string => options.find((o) => o.id === id)?.label ?? id;
  const object = value as {
    optionId?: unknown;
    optionIds?: unknown;
    otherText?: unknown;
    followUpOptionId?: unknown;
  };
  if (typeof object.optionId === "string") {
    const text = typeof object.otherText === "string" ? object.otherText : null;
    return text ? `${label(object.optionId)} — “${text}”` : label(object.optionId);
  }
  if (Array.isArray(object.optionIds)) {
    return object.optionIds
      .filter((id): id is string => typeof id === "string")
      .map(label)
      .join(", ");
  }
  return JSON.stringify(value);
}

/** The options a staff member may pick from when entering a replacement. */
export function replacementOptions(
  question: ConflictQuestion | null,
): readonly ConflictQuestionOption[] {
  return question?.answerSchema?.options ?? [];
}

/**
 * Whether this question takes free text rather than one of a fixed set.
 *
 * Decided from the schema the backend sent, not from a list of question keys
 * kept here: a reworded question set must not silently turn a choice into a
 * text box.
 */
export function takesFreeText(question: ConflictQuestion | null): boolean {
  const schema = question?.answerSchema;
  if (!schema) return true;
  if (Array.isArray(schema.options) && schema.options.length > 0) return false;
  return true;
}

/** Builds the value to send for a replacement, given what the form holds. */
export function replacementValue(
  question: ConflictQuestion | null,
  raw: string,
): unknown {
  const trimmed = raw.trim();
  if (!takesFreeText(question)) return { optionId: trimmed };
  if (question?.answerSchema?.type === "integer") {
    const parsed = Number(trimmed);
    return Number.isInteger(parsed) ? parsed : trimmed;
  }
  return trimmed;
}

/**
 * Checks a resolution before it is sent.
 *
 * Deliberately the same rules as the backend's, including the reason length:
 * a staff member should be told what is wrong beside the field, not by a 422
 * that loses what they typed.
 */
export function validateResolution(input: {
  readonly questionKey: string;
  readonly choice: ResolutionChoice | null;
  readonly reason: string;
  readonly contradiction?: Contradiction | null;
}): ResolutionProblem | null {
  if (!input.questionKey.trim()) {
    return { field: "questionKey", message: "Choose which question you are settling." };
  }
  if (!input.choice) {
    return {
      field: "choice",
      message: "Keep one of the answers given, or enter a replacement. Not both, and not neither.",
    };
  }
  const choice = input.choice;
  if (choice.kind === "keep") {
    const known = input.contradiction?.answers.some((a) => a.answerId === choice.answerId);
    if (input.contradiction && known !== true) {
      return { field: "choice", message: "That is not one of the conflicting answers." };
    }
  } else {
    const value = choice.value;
    const empty = value === null || value === undefined
      || (typeof value === "string" && value.trim() === "")
      || (typeof value === "object" && typeof (value as { optionId?: unknown }).optionId === "string"
        && (value as { optionId: string }).optionId.trim() === "");
    if (empty) {
      return { field: "value", message: "Enter the answer that should stand." };
    }
    const question = input.contradiction?.question ?? null;
    const options = replacementOptions(question);
    const optionId = typeof value === "object" && value !== null
      ? (value as { optionId?: unknown }).optionId : undefined;
    if (options.length > 0 && typeof optionId === "string"
      && !options.some((o) => o.id === optionId)) {
      return { field: "value", message: "Choose one of the question's own options." };
    }
  }
  const reason = input.reason.trim();
  if (reason.length < REASON_MIN) {
    return {
      field: "reason",
      message: `Say why this is the answer that stands (at least ${REASON_MIN} characters). `
        + "It is kept with the resolution and read by whoever looks at this run next.",
    };
  }
  if (reason.length > REASON_MAX) {
    return { field: "reason", message: `Keep the reason under ${REASON_MAX} characters.` };
  }
  return null;
}

/** What to say when the run moved under the screen. */
export const STALE_SCREEN_MESSAGE =
  "This run changed since you opened it — somebody else may have answered or resolved "
  + "something. Reload and look again before deciding. Nothing was saved.";

/**
 * The sentence to show after a resolution saved.
 *
 * `resumed` is the field somebody reads as "we contacted them", so it is
 * always said in the same breath as what did not happen.
 */
export function resolutionNotice(result: {
  readonly questionKey: string;
  readonly resolution: string;
  readonly duplicate: boolean;
  readonly resumed: boolean;
  readonly stillInConflict?: boolean;
  readonly recommendationsStale?: readonly string[];
}): string {
  const head = result.duplicate
    ? `Already settled — ${result.questionKey} was resolved earlier and nothing was written twice.`
    : `${result.questionKey} settled: ${
      result.resolution === "kept" ? "an answer already given now stands"
        : "a replacement was recorded"}.`;
  const review = result.stillInConflict
    ? " Another question on this run is still in conflict, so it stays held."
    : result.resumed
      ? " The run has gone back to collecting."
      : " The run's state is unchanged.";
  const stale = (result.recommendationsStale?.length ?? 0) > 0
    ? ` Recommendations are now out of date (${result.recommendationsStale!.join(", ")}) `
      + "and need recomputing."
    : "";
  return `${head}${review}${stale} Nobody was contacted, no suppression was lifted and no `
    + "consent was granted. The original answers are kept as evidence.";
}

/** Whether this run has anything left for a person to settle. */
export function hasUnresolved(view: ContradictionView | null): boolean {
  return (view?.unresolved.length ?? 0) > 0;
}
