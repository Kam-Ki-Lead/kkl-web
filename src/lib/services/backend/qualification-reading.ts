/**
 * Pure readings of OpenAPI 1.0.0-phase4.c qualification payloads
 * (kkl-backend `d4c2532`). These functions do not call a server.
 *
 * A run is not a lead. Staff inventory is GET /v1/admin/qualification/leads
 * (`inventory: true`). Marketplace GET /v1/leads is not that inventory.
 * `modelReportedIntent` is not a qualification level. `marketplaceConsent`
 * stays unchanged. `configured: false` means unset, not a client default.
 * `staff_saved` is not client-approved.
 */

export const PHASE4A_OPENAPI = "1.0.0-phase4.c" as const;
export const PHASE4A_BACKEND = "d4c2532" as const;

export const LEAD_PAGE_SIZE = 20;

export const QUALIFICATION_FILTERS = [
  "none",
  "collecting",
  "completed",
  "incomplete",
  "failed",
  "opted_out",
] as const;
export type QualificationFilter = (typeof QUALIFICATION_FILTERS)[number];

export const REVIEW_FILTERS = ["none", "pending", "recorded", "not_required"] as const;
export type ReviewFilter = (typeof REVIEW_FILTERS)[number];

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
  /**
   * Why an answer stopped being the current one: an explicit correction, a
   * staff correction, or a dependent answer invalidated by one. Null for a
   * live answer, and null from a backend that predates the field.
   */
  readonly supersededReason: string | null;
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
  readonly attempted: boolean | null;
  readonly dispatched: boolean;
  readonly providerVerified: false;
  readonly reason: string | null;
  readonly synthetic: boolean | null;
};

export type ActionCapability = {
  readonly allowed: boolean;
  readonly dispatchesProvider: boolean;
  readonly reason: string | null;
};

export type RunCapabilities = {
  readonly resume: ActionCapability;
  readonly retry: ActionCapability;
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

export type ConfigProvenance = {
  readonly configured: boolean;
  readonly provenance: "unset" | "staff_saved" | string;
  readonly setAt: string | null;
};

export type CallingWindowConfig = ConfigProvenance & {
  readonly window: CallingWindow | null;
};

export type OptOutConfig = ConfigProvenance & {
  readonly signals: OptOutSignals | null;
};

export type StaffLeadRunSummary = {
  readonly id: string;
  readonly reference: string;
  readonly channel: string;
  readonly state: string;
  readonly reviewStatus: string;
  readonly failureReason: string | null;
  readonly path: string;
  readonly capabilities: RunCapabilities | null;
};

export type StaffLeadSummary = {
  readonly id: string;
  readonly reference: string;
  readonly status: string;
  readonly locationId: string | null;
  readonly locationName: string | null;
  readonly consentStatus: string;
  readonly contactState: string | null;
  readonly contactLabel: string | null;
  readonly runCount: number;
  readonly latestRun: {
    readonly id: string;
    readonly reference: string;
    readonly channel: string;
    readonly state: string;
    readonly reviewStatus: string;
    readonly path: string;
  } | null;
};

export type StaffLeadDetail = {
  readonly id: string;
  readonly reference: string;
  readonly status: string;
  readonly locationId: string | null;
  readonly locationName: string | null;
  readonly propertyType: string | null;
  readonly budgetBand: string | null;
  readonly configurations: readonly string[];
  readonly timing: string | null;
  readonly summary: string | null;
  readonly consentStatus: string;
  readonly priceCredits: number | null;
  readonly contactState: string | null;
  readonly contactLabel: string | null;
  readonly suppressed: boolean;
  readonly qualification: QualificationSnapshot;
  readonly runs: readonly StaffLeadRunSummary[];
};

export type StaffLeadPage = {
  readonly inventory: true;
  readonly audience: "staff";
  readonly marketplacePath: string | null;
  readonly note: string | null;
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
  readonly leads: readonly StaffLeadSummary[];
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
  readonly capabilities: RunCapabilities | null;
  readonly effect: "adapter_invoked" | "recorded_only" | string | null;
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
    supersededReason: text(row.supersededReason),
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
    attempted: bool(row.attempted),
    dispatched,
    providerVerified: false,
    reason: text(row.reason),
    synthetic: bool(row.synthetic),
  };
}

function readActionCapability(value: unknown): ActionCapability | null {
  const row = record(value);
  if (!row) return null;
  const allowed = bool(row.allowed);
  const dispatchesProvider = bool(row.dispatchesProvider);
  if (allowed === null || dispatchesProvider === null) return null;
  return {
    allowed,
    dispatchesProvider,
    reason: text(row.reason),
  };
}

function readCapabilities(value: unknown): RunCapabilities | null {
  const row = record(value);
  if (!row) return null;
  const resume = readActionCapability(row.resume);
  const retry = readActionCapability(row.retry);
  if (!resume || !retry) return null;
  return { resume, retry };
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
    capabilities: readCapabilities(row.capabilities),
    effect: text(row.effect),
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

/** Distinguishes unset (`configured: false`) from a staff-saved window. */
export function readCallingWindowResponse(body: unknown): {
  ok: true;
  config: CallingWindowConfig;
} | { ok: false } {
  const row = record(body);
  if (!row) return { ok: false };
  const configured = bool(row.configured);
  const provenance = text(row.provenance) ?? (configured === false ? "unset" : "");
  if (configured === false || row.callingWindow === null) {
    return {
      ok: true,
      config: {
        configured: false,
        provenance: provenance || "unset",
        setAt: text(row.setAt),
        window: null,
      },
    };
  }
  const window = readCallingWindow(body);
  if (!window) return { ok: false };
  return {
    ok: true,
    config: {
      configured: true,
      provenance: provenance || "staff_saved",
      setAt: text(row.setAt),
      window,
    },
  };
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
  config: OptOutConfig;
} | { ok: false } {
  const row = record(body);
  if (!row) return { ok: false };
  const configured = bool(row.configured);
  const provenance = text(row.provenance) ?? (configured === false ? "unset" : "");
  if (configured === false || row.optOut === null) {
    return {
      ok: true,
      config: {
        configured: false,
        provenance: provenance || "unset",
        setAt: text(row.setAt),
        signals: null,
      },
    };
  }
  const signals = readOptOutSignals(body);
  if (!signals) return { ok: false };
  return {
    ok: true,
    config: {
      configured: true,
      provenance: provenance || "staff_saved",
      setAt: text(row.setAt),
      signals,
    },
  };
}

function readStaffLeadSummary(value: unknown): StaffLeadSummary | null {
  const row = record(value);
  if (!row || typeof row.id !== "string") return null;
  const contact = record(row.contact);
  const latest = record(row.latestRun);
  return {
    id: row.id,
    reference: text(row.reference) ?? row.id,
    status: text(row.status) ?? "",
    locationId: text(row.locationId),
    locationName: text(row.locationName),
    consentStatus: text(row.consentStatus) ?? "",
    contactState: text(contact?.state),
    contactLabel: text(contact?.label),
    runCount: integer(row.runCount) ?? 0,
    latestRun: latest && typeof latest.id === "string"
      ? {
        id: latest.id,
        reference: text(latest.reference) ?? latest.id,
        channel: text(latest.channel) ?? "",
        state: text(latest.state) ?? "",
        reviewStatus: text(latest.reviewStatus) ?? "",
        path: text(latest.path) ?? `/v1/admin/qualification/runs/${latest.id}`,
      }
      : null,
  };
}

function readStaffLeadRunSummary(value: unknown): StaffLeadRunSummary | null {
  const row = record(value);
  if (!row || typeof row.id !== "string") return null;
  return {
    id: row.id,
    reference: text(row.reference) ?? row.id,
    channel: text(row.channel) ?? "",
    state: text(row.state) ?? "",
    reviewStatus: text(row.reviewStatus) ?? "",
    failureReason: text(row.failureReason),
    path: text(row.path) ?? `/v1/admin/qualification/runs/${row.id}`,
    capabilities: readCapabilities(row.capabilities),
  };
}

export function readStaffLeadPage(body: unknown): StaffLeadPage | null {
  const row = record(body);
  if (!row || !Array.isArray(row.leads)) return null;
  const total = integer(row.total);
  const offset = integer(row.offset);
  const limit = integer(row.limit);
  if (total === null || offset === null || limit === null) return null;
  if (bool(row.inventory) !== true) return null;
  if (text(row.audience) !== "staff") return null;
  const leads: StaffLeadSummary[] = [];
  for (const item of row.leads) {
    const lead = readStaffLeadSummary(item);
    if (!lead) return null;
    leads.push(lead);
  }
  return {
    inventory: true,
    audience: "staff",
    marketplacePath: text(row.marketplacePath),
    note: text(row.note),
    total,
    offset,
    limit,
    leads,
  };
}

export function readStaffLeadDetail(body: unknown): StaffLeadDetail | null {
  const row = record(body);
  if (!row || typeof row.id !== "string") return null;
  const contact = record(row.contact);
  const runs: StaffLeadRunSummary[] = [];
  if (Array.isArray(row.runs)) {
    for (const item of row.runs) {
      const run = readStaffLeadRunSummary(item);
      if (!run) return null;
      runs.push(run);
    }
  }
  const configurations = Array.isArray(row.configurations)
    ? row.configurations.filter((item): item is string => typeof item === "string")
    : [];
  return {
    id: row.id,
    reference: text(row.reference) ?? row.id,
    status: text(row.status) ?? "",
    locationId: text(row.locationId),
    locationName: text(row.locationName),
    propertyType: text(row.propertyType),
    budgetBand: text(row.budgetBand),
    configurations,
    timing: text(row.timing),
    summary: text(row.summary),
    consentStatus: text(row.consentStatus) ?? "",
    priceCredits: integer(row.priceCredits),
    contactState: text(contact?.state),
    contactLabel: text(contact?.label),
    suppressed: bool(row.suppressed) === true,
    qualification: readQualification(row.qualification),
    runs,
  };
}

/** Map an admin qualification run API path to the Admin UI route. */
export function runUiPath(apiPath: string): string {
  const match = apiPath.match(/\/v1\/admin\/qualification\/runs\/([0-9a-f-]{36})$/i);
  if (match) return `/admin/voice/${match[1]}`;
  return "/admin/voice";
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

// The parameter stays in the signature so callers do not change when the
// question-to-level mapping is confirmed. There is nothing to read off the
// snapshot until then, and no level is invented from one.
export function levelDisplay(_qualification: QualificationSnapshot): string {
  return "mapping not configured";
}

export function intentDisplay(qualification: QualificationSnapshot): string {
  if (qualification.modelReportedIntent === null) return "No model intent reported";
  return `Model-reported intent ${qualification.modelReportedIntent}/100 — not a qualification level`;
}
