/**
 * Pure readings of OpenAPI 1.0.0-phase4.b qualification payloads
 * (kkl-backend `39d26fd`). These functions do not call a server.
 *
 * A run is not a lead. A call/message status is not provider delivery when
 * `providerVerified` is false. `modelReportedIntent` is not a qualification
 * level. `marketplaceConsent` stays unchanged on these records.
 */

export const PHASE4A_OPENAPI = "1.0.0-phase4.b" as const;
export const PHASE4A_BACKEND = "39d26fd" as const;

export const RUN_STATES = [
  "collecting",
  "completed",
  "incomplete",
  "failed",
  "opted_out",
] as const;
export type RunState = (typeof RUN_STATES)[number];

export const REVIEW_STATUSES = ["not_required", "pending", "recorded"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const CALL_STATUSES = [
  "queued",
  "provider_accepted",
  "answered",
  "completed",
  "failed",
  "not_configured",
  "suppressed",
  "dry_run",
  "busy",
  "no_answer",
] as const;

export const MESSAGE_STATUSES = [
  "queued",
  "provider_accepted",
  "delivered",
  "failed",
  "not_configured",
  "suppressed",
  "dry_run",
] as const;

export type QuestionSetSummary = {
  readonly id: string;
  readonly versionLabel: string;
  readonly provenance: "synthetic_test" | "client_supplied" | string;
  readonly status: string;
  readonly questions: number;
  readonly synthetic: boolean;
  readonly createdAt: string | null;
};

export type QualificationAnswer = {
  readonly id: string;
  readonly questionKey: string;
  readonly status: string;
  readonly value: unknown;
  readonly rawText: string | null;
  readonly source: string | null;
  readonly sourceEventId: string | null;
  readonly recordedAt: string | null;
  readonly superseded: boolean;
};

export type QualificationCall = {
  readonly id: string;
  readonly status: string;
  readonly failureReason: string | null;
  readonly providerVerified: false;
  readonly attempts: number;
  readonly nextAttemptAt: string | null;
};

export type QualificationMessage = {
  readonly id: string;
  readonly direction: string;
  readonly status: string;
  readonly failureReason: string | null;
  readonly providerVerified: false;
  readonly attempts: number;
};

export type ConsentEvidence = {
  readonly id: string;
  readonly kind: string;
  readonly disposition: string | null;
  readonly evidenceRef: string | null;
  readonly note: string | null;
  readonly recordedAt: string | null;
};

export type QualificationReview = {
  readonly id: string;
  readonly decision: string;
  readonly reason: string;
  readonly at: string | null;
};

export type TranscriptLine = {
  readonly speaker: string;
  readonly sequence: number;
  readonly text: string;
  readonly at: string | null;
};

export type ProviderDispatch = {
  readonly dispatched: boolean;
  readonly reason: string | null;
};

export type QualificationSnapshot = {
  readonly level: null;
  readonly pricingApplied: false;
  readonly consentApplied: false;
  readonly marketplaceConsent: "unchanged";
  readonly reason: string;
  readonly modelReportedIntent: number | null;
  readonly modelReportedIntentIsNotALevel: true;
};

export type CallingWindow = {
  readonly timeZone: string;
  readonly start: string;
  readonly end: string;
};

export type OptOutSignals = {
  readonly dtmf: string | null;
  readonly keywords: readonly string[];
};

export type QualificationRun = {
  readonly id: string;
  readonly reference: string;
  readonly leadId: string;
  readonly channel: "voice" | "whatsapp" | string;
  readonly state: string;
  readonly reviewStatus: string;
  readonly failureReason: string | null;
  readonly interruptionCount: number;
  readonly questionSet: {
    readonly id: string;
    readonly versionLabel: string;
    readonly provenance: string;
    readonly synthetic: boolean;
  };
  readonly nextQuestion: {
    readonly key: string;
    readonly prompt: string;
    readonly position: number;
    readonly required: boolean;
    readonly collects: string;
  } | null;
  readonly answers: readonly QualificationAnswer[];
  readonly calls: readonly QualificationCall[];
  readonly messages: readonly QualificationMessage[];
  readonly consentEvidence: readonly ConsentEvidence[];
  readonly reviews: readonly QualificationReview[];
  readonly transcript: readonly TranscriptLine[];
  readonly modelSummary: string | null;
  readonly qualification: QualificationSnapshot;
  readonly suppressed: boolean;
  readonly phoneMasked: string | null;
  readonly startedAt: string | null;
  readonly updatedAt: string | null;
  readonly completedAt: string | null;
  readonly providerVerified: false;
  readonly providerDispatch: ProviderDispatch | null;
  readonly duplicate?: boolean;
};

export type QualificationRunPage = {
  readonly runs: readonly QualificationRun[];
  readonly inventory: false;
  readonly leadInventoryPath: string | null;
};

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function integer(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

function bool(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

export function readQuestionSetPage(body: unknown): { questionSets: QuestionSetSummary[] } | null {
  const row = record(body);
  if (!row || !Array.isArray(row.questionSets)) return null;
  const questionSets: QuestionSetSummary[] = [];
  for (const item of row.questionSets) {
    const set = record(item);
    if (!set || typeof set.id !== "string") return null;
    questionSets.push({
      id: set.id,
      versionLabel: text(set.versionLabel) ?? "",
      provenance: text(set.provenance) ?? "",
      status: text(set.status) ?? "",
      questions: integer(set.questions) ?? 0,
      synthetic: bool(set.synthetic) === true || text(set.provenance) === "synthetic_test",
      createdAt: text(set.createdAt),
    });
  }
  return { questionSets };
}

export function readRegisteredQuestionSet(body: unknown): {
  id: string;
  versionLabel: string;
  provenance: string;
  status: string;
  synthetic: boolean;
} | null {
  const row = record(body);
  if (!row || typeof row.id !== "string") return null;
  const provenance = text(row.provenance) ?? "";
  return {
    id: row.id,
    versionLabel: text(row.versionLabel) ?? "",
    provenance,
    status: text(row.status) ?? "",
    synthetic: bool(row.synthetic) === true || provenance === "synthetic_test",
  };
}

function readAnswer(value: unknown): QualificationAnswer | null {
  const row = record(value);
  if (!row || typeof row.id !== "string" || typeof row.questionKey !== "string") return null;
  return {
    id: row.id,
    questionKey: row.questionKey,
    status: text(row.status) ?? "",
    value: row.value ?? null,
    rawText: text(row.rawText),
    source: text(row.source),
    sourceEventId: text(row.sourceEventId),
    recordedAt: text(row.recordedAt),
    superseded: bool(row.superseded) === true,
  };
}

function readCall(value: unknown): QualificationCall | null {
  const row = record(value);
  if (!row || typeof row.id !== "string") return null;
  return {
    id: row.id,
    status: text(row.status) ?? "",
    failureReason: text(row.failureReason),
    providerVerified: false,
    attempts: integer(row.attempts) ?? 0,
    nextAttemptAt: text(row.nextAttemptAt),
  };
}

function readMessage(value: unknown): QualificationMessage | null {
  const row = record(value);
  if (!row || typeof row.id !== "string") return null;
  return {
    id: row.id,
    direction: text(row.direction) ?? "",
    status: text(row.status) ?? "",
    failureReason: text(row.failureReason),
    providerVerified: false,
    attempts: integer(row.attempts) ?? 0,
  };
}

function readEvidence(value: unknown): ConsentEvidence | null {
  const row = record(value);
  if (!row || typeof row.id !== "string") return null;
  return {
    id: row.id,
    kind: text(row.kind) ?? "",
    disposition: text(row.disposition),
    evidenceRef: text(row.evidenceRef),
    note: text(row.note),
    recordedAt: text(row.recordedAt),
  };
}

function readReview(value: unknown): QualificationReview | null {
  const row = record(value);
  if (!row || typeof row.id !== "string") return null;
  return {
    id: row.id,
    decision: text(row.decision) ?? "",
    reason: text(row.reason) ?? "",
    at: text(row.at),
  };
}

function readTranscriptLine(value: unknown): TranscriptLine | null {
  const row = record(value);
  if (!row || typeof row.text !== "string") return null;
  return {
    speaker: text(row.speaker) ?? "",
    sequence: integer(row.sequence) ?? 0,
    text: row.text,
    at: text(row.at) ?? text(row.time) ?? text(row.recordedAt),
  };
}

function readProviderDispatch(value: unknown): ProviderDispatch | null {
  const row = record(value);
  if (!row) return null;
  const dispatched = bool(row.dispatched);
  if (dispatched === null) return null;
  return {
    dispatched,
    reason: text(row.reason),
  };
}

function readQualification(value: unknown): QualificationSnapshot {
  const row = record(value);
  const intent = row ? integer(row.modelReportedIntent) : null;
  return {
    level: null,
    pricingApplied: false,
    consentApplied: false,
    marketplaceConsent: "unchanged",
    reason: text(row?.reason) ?? "question_to_level_mapping_not_confirmed",
    modelReportedIntent: intent,
    modelReportedIntentIsNotALevel: true,
  };
}

export function readQualificationRun(body: unknown): QualificationRun | null {
  const row = record(body);
  if (!row || typeof row.id !== "string") return null;
  const questionSet = record(row.questionSet);
  if (!questionSet || typeof questionSet.id !== "string") return null;

  const answers: QualificationAnswer[] = [];
  if (Array.isArray(row.answers)) {
    for (const item of row.answers) {
      const answer = readAnswer(item);
      if (!answer) return null;
      answers.push(answer);
    }
  }

  const calls: QualificationCall[] = [];
  if (Array.isArray(row.calls)) {
    for (const item of row.calls) {
      const call = readCall(item);
      if (!call) return null;
      calls.push(call);
    }
  }

  const messages: QualificationMessage[] = [];
  if (Array.isArray(row.messages)) {
    for (const item of row.messages) {
      const message = readMessage(item);
      if (!message) return null;
      messages.push(message);
    }
  }

  const consentEvidence: ConsentEvidence[] = [];
  if (Array.isArray(row.consentEvidence)) {
    for (const item of row.consentEvidence) {
      const evidence = readEvidence(item);
      if (!evidence) return null;
      consentEvidence.push(evidence);
    }
  }

  const reviews: QualificationReview[] = [];
  if (Array.isArray(row.reviews)) {
    for (const item of row.reviews) {
      const review = readReview(item);
      if (!review) return null;
      reviews.push(review);
    }
  }

  const transcript: TranscriptLine[] = [];
  if (Array.isArray(row.transcript)) {
    for (const item of row.transcript) {
      const line = readTranscriptLine(item);
      if (!line) return null;
      transcript.push(line);
    }
  }

  let nextQuestion: QualificationRun["nextQuestion"] = null;
  const next = record(row.nextQuestion);
  if (next && typeof next.key === "string") {
    nextQuestion = {
      key: next.key,
      prompt: text(next.prompt) ?? "",
      position: integer(next.position) ?? 0,
      required: bool(next.required) !== false,
      collects: text(next.collects) ?? "fact",
    };
  }

  const provenance = text(questionSet.provenance) ?? "";
  return {
    id: row.id,
    reference: text(row.reference) ?? row.id,
    leadId: text(row.leadId) ?? "",
    channel: text(row.channel) ?? "",
    state: text(row.state) ?? "",
    reviewStatus: text(row.reviewStatus) ?? "",
    failureReason: text(row.failureReason),
    interruptionCount: integer(row.interruptionCount) ?? 0,
    questionSet: {
      id: questionSet.id,
      versionLabel: text(questionSet.versionLabel) ?? "",
      provenance,
      synthetic: bool(questionSet.synthetic) === true || provenance === "synthetic_test",
    },
    nextQuestion,
    answers,
    calls,
    messages,
    consentEvidence,
    reviews,
    transcript,
    modelSummary: text(row.modelSummary),
    qualification: readQualification(row.qualification),
    suppressed: bool(row.suppressed) === true,
    phoneMasked: text(row.phoneMasked),
    startedAt: text(row.startedAt),
    updatedAt: text(row.updatedAt),
    completedAt: text(row.completedAt),
    providerVerified: false,
    providerDispatch: readProviderDispatch(row.providerDispatch),
    duplicate: bool(row.duplicate) === true ? true : undefined,
  };
}

export function readQualificationRunPage(body: unknown): QualificationRunPage | null {
  const row = record(body);
  if (!row || !Array.isArray(row.runs)) return null;
  const runs: QualificationRun[] = [];
  for (const item of row.runs) {
    const run = readQualificationRun(item);
    if (!run) return null;
    runs.push(run);
  }
  return {
    runs,
    inventory: false,
    leadInventoryPath: text(row.leadInventoryPath),
  };
}

export function readCallingWindow(body: unknown): CallingWindow | null {
  const row = record(body);
  if (!row) return null;
  if (row.callingWindow === null) return null;
  const window = record(row.callingWindow) ?? row;
  const timeZone = text(window.timeZone);
  const start = text(window.start);
  const end = text(window.end);
  if (!timeZone || !start || !end) return null;
  return { timeZone, start, end };
}

/** Distinguishes “not saved” from an unreadable payload. */
export function readCallingWindowResponse(body: unknown): {
  ok: true;
  window: CallingWindow | null;
} | { ok: false } {
  const row = record(body);
  if (!row) return { ok: false };
  if (Object.prototype.hasOwnProperty.call(row, "callingWindow") && row.callingWindow === null) {
    return { ok: true, window: null };
  }
  const window = readCallingWindow(body);
  if (!window && Object.prototype.hasOwnProperty.call(row, "callingWindow")) {
    return { ok: false };
  }
  if (!window && !("timeZone" in row) && !("callingWindow" in row)) return { ok: false };
  return { ok: true, window };
}

export function readOptOutSignals(body: unknown): OptOutSignals | null {
  const row = record(body);
  if (!row) return null;
  if (row.optOut === null) return null;
  const signals = record(row.optOut) ?? record(row.qualificationOptOut) ?? row;
  if (!signals || !Array.isArray(signals.keywords)) return null;
  const keywords = signals.keywords.filter((word): word is string => typeof word === "string");
  if (keywords.length === 0) return null;
  return {
    dtmf: text(signals.dtmf),
    keywords,
  };
}

export function readOptOutResponse(body: unknown): {
  ok: true;
  signals: OptOutSignals | null;
} | { ok: false } {
  const row = record(body);
  if (!row) return { ok: false };
  if (Object.prototype.hasOwnProperty.call(row, "optOut") && row.optOut === null) {
    return { ok: true, signals: null };
  }
  const signals = readOptOutSignals(body);
  if (!signals && Object.prototype.hasOwnProperty.call(row, "optOut")) return { ok: false };
  if (!signals && !("keywords" in row) && !("optOut" in row)) return { ok: false };
  return { ok: true, signals };
}

export function readRetryBatch(body: unknown): {
  retried: readonly string[];
  providerVerified: false;
  providerDispatched: boolean | null;
} | null {
  const row = record(body);
  if (!row || !Array.isArray(row.retried)) return null;
  const retried = row.retried.filter((id): id is string => typeof id === "string");
  return {
    retried,
    providerVerified: false,
    providerDispatched: bool(row.providerDispatched),
  };
}

/** Status labels that must not be read as live provider delivery. */
export function providerStatusLabel(status: string, providerVerified: boolean): string {
  if (status === "not_configured") return "Not configured — provider was not called";
  if (status === "dry_run") return "Dry run — not a live call or message";
  if (status === "queued") return "Queued — not delivered";
  if (!providerVerified && (status === "provider_accepted" || status === "completed" || status === "delivered" || status === "answered")) {
    return `${status.replace(/_/g, " ")} (not provider-verified)`;
  }
  return status.replace(/_/g, " ");
}

export function levelDisplay(qualification: QualificationSnapshot): string {
  return "mapping not configured";
}

export function intentDisplay(qualification: QualificationSnapshot): string {
  if (qualification.modelReportedIntent === null) return "No model intent reported";
  return `Model-reported intent ${qualification.modelReportedIntent}/100 — not a qualification level`;
}
