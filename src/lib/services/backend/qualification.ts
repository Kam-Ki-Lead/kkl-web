/**
 * Phase 4 Admin qualification adapters against OpenAPI 1.0.0-phase4.a
 * (kkl-backend `a606665`).
 *
 * Staff routes under `/v1/admin/qualification/*`. Voice-bridge stubs stay
 * kkl-voice → kkl-backend and are not called from Admin. A run is not a lead.
 * Sample fixtures are never substituted when `KKL_QUALIFICATION=backend`.
 */

import { ServiceError } from "@/lib/services/contracts";
import { isFrameworkSignal, callAs, bearerMode } from "./session";
import { unpublishedStaffLoad, type UnpublishedStaffLoad } from "./qualification-contract";
import {
  PHASE4A_BACKEND,
  PHASE4A_OPENAPI,
  readCallingWindow,
  readOptOutSignals,
  readQualificationRun,
  readQualificationRunPage,
  readQuestionSetPage,
  readRegisteredQuestionSet,
  readRetryBatch,
  type QualificationRun,
  type QuestionSetSummary,
} from "./qualification-reading";
import { SYNTHETIC_QUESTION_SET } from "./qualification-synthetic";
import { staffRefusal } from "./staff-views";

export type QualificationLoad<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly message: string; readonly handoff?: string };

function refused(status: number, error: string | undefined, fallback: string): QualificationLoad<never> {
  if (status === 403 && bearerMode() === "browser-session") {
    return { ok: false, message: staffRefusal(error) };
  }
  if (status === 403) return { ok: false, message: error ?? "This account cannot open qualification." };
  return { ok: false, message: error ?? fallback };
}

function fail(error: unknown, fallback: string): QualificationLoad<never> {
  if (isFrameworkSignal(error)) throw error;
  if (error instanceof ServiceError) return { ok: false, message: error.message };
  if (error instanceof Error && error.message) return { ok: false, message: error.message };
  return { ok: false, message: fallback };
}

function raise(status: number, body: { error?: string; code?: string }): never {
  const message = body.error ?? `The qualification service returned ${status}.`;
  if (status === 401) throw new ServiceError("unauthenticated", message);
  if (status === 403) throw new ServiceError("forbidden", message);
  if (status === 404) throw new ServiceError("not_found", message);
  if (status === 409 || status === 422) throw new ServiceError("validation", message);
  if (status === 503) throw new ServiceError("unavailable", message);
  throw new ServiceError("unavailable", message);
}

/** H4-1 — staff lead inventory is still not published. Runs are not leads. */
export async function listQualificationLeads(): Promise<UnpublishedStaffLoad> {
  return unpublishedStaffLoad("H4-1");
}

/** H4-2 — staff lead detail is still not published. Use run detail for Q&A. */
export async function getQualificationLead(_leadId: string): Promise<UnpublishedStaffLoad> {
  return unpublishedStaffLoad("H4-2");
}

export async function listQuestionSets(): Promise<QualificationLoad<readonly QuestionSetSummary[]>> {
  try {
    const { status, body } = await callAs<{ questionSets?: unknown; error?: string }>(
      "staff",
      "/v1/admin/qualification/question-sets",
    );
    if (status !== 200) return refused(status, body.error, "Question sets could not be loaded.");
    const page = readQuestionSetPage(body);
    if (!page) return { ok: false, message: "The question-set list did not match the published schema." };
    return { ok: true, value: page.questionSets };
  } catch (error) {
    return fail(error, "Question sets could not be loaded.");
  }
}

export async function registerSyntheticQuestionSet(versionLabel: string): Promise<{
  id: string;
  versionLabel: string;
  provenance: string;
  status: string;
  synthetic: boolean;
}> {
  const { status, body } = await callAs<Record<string, unknown> & { error?: string }>(
    "staff",
    "/v1/admin/qualification/question-sets",
    {
      method: "POST",
      body: {
        versionLabel,
        provenance: SYNTHETIC_QUESTION_SET.provenance,
        activate: SYNTHETIC_QUESTION_SET.activate,
        questions: SYNTHETIC_QUESTION_SET.questions,
      },
    },
  );
  if (status !== 201) raise(status, body);
  const registered = readRegisteredQuestionSet(body);
  if (!registered || !registered.synthetic) {
    throw new ServiceError(
      "unavailable",
      "The question set response was not marked synthetic_test.",
    );
  }
  return registered;
}

export async function setCallingWindow(input: {
  timeZone: string;
  start: string;
  end: string;
}): Promise<{ timeZone: string; start: string; end: string }> {
  const { status, body } = await callAs<Record<string, unknown> & { error?: string }>(
    "staff",
    "/v1/admin/qualification/calling-window",
    { method: "POST", body: input },
  );
  if (status !== 200) raise(status, body);
  const window = readCallingWindow(body);
  if (!window) throw new ServiceError("unavailable", "The calling window response was not readable.");
  return window;
}

export async function setOptOutSignals(input: {
  dtmf: string | null;
  keywords: readonly string[];
}): Promise<{ dtmf: string | null; keywords: readonly string[] }> {
  const { status, body } = await callAs<Record<string, unknown> & { error?: string }>(
    "staff",
    "/v1/admin/qualification/opt-out",
    { method: "POST", body: input },
  );
  if (status !== 200) raise(status, body);
  const signals = readOptOutSignals(body);
  if (!signals) throw new ServiceError("unavailable", "The opt-out response was not readable.");
  return signals;
}

export async function listQualificationRuns(options?: {
  state?: string;
  limit?: number;
}): Promise<QualificationLoad<readonly QualificationRun[]>> {
  try {
    const query = new URLSearchParams();
    if (options?.state) query.set("state", options.state);
    query.set("limit", String(options?.limit ?? 50));
    const { status, body } = await callAs<{ runs?: unknown; error?: string }>(
      "staff",
      `/v1/admin/qualification/runs?${query.toString()}`,
    );
    if (status !== 200) return refused(status, body.error, "Qualification runs could not be loaded.");
    const page = readQualificationRunPage(body);
    if (!page) return { ok: false, message: "The run list did not match the published schema." };
    return { ok: true, value: page.runs };
  } catch (error) {
    return fail(error, "Qualification runs could not be loaded.");
  }
}

export async function getQualificationRun(
  runId: string,
): Promise<QualificationLoad<QualificationRun | null>> {
  try {
    const { status, body } = await callAs<Record<string, unknown> & { error?: string }>(
      "staff",
      `/v1/admin/qualification/runs/${encodeURIComponent(runId)}`,
    );
    if (status === 404) return { ok: true, value: null };
    if (status !== 200) return refused(status, body.error, "That qualification run could not be loaded.");
    const run = readQualificationRun(body);
    if (!run) return { ok: false, message: "That run response did not match the published schema." };
    return { ok: true, value: run };
  } catch (error) {
    return fail(error, "That qualification run could not be loaded.");
  }
}

/** Voice overview uses runs; a run is not a call volume fixture. */
export async function listVoiceCalls(): Promise<QualificationLoad<readonly QualificationRun[]>> {
  const loaded = await listQualificationRuns({ limit: 50 });
  if (!loaded.ok) return loaded;
  return { ok: true, value: loaded.value.filter((run) => run.channel === "voice") };
}

export async function getVoiceCall(runId: string): Promise<QualificationLoad<QualificationRun | null>> {
  return getQualificationRun(runId);
}

export async function listWhatsAppJourney(): Promise<QualificationLoad<readonly QualificationRun[]>> {
  const loaded = await listQualificationRuns({ limit: 50 });
  if (!loaded.ok) return loaded;
  return { ok: true, value: loaded.value.filter((run) => run.channel === "whatsapp") };
}

export async function reviewQualificationRun(input: {
  runId: string;
  decision: "facts_recorded" | "needs_follow_up";
  reason: string;
}): Promise<QualificationRun> {
  const { status, body } = await callAs<Record<string, unknown> & { error?: string }>(
    "staff",
    `/v1/admin/qualification/runs/${encodeURIComponent(input.runId)}/review`,
    {
      method: "POST",
      body: { decision: input.decision, reason: input.reason },
    },
  );
  if (status !== 200) raise(status, body);
  const run = readQualificationRun(body);
  if (!run) throw new ServiceError("unavailable", "The review response was not readable.");
  if (run.qualification.level !== null) {
    throw new ServiceError("unavailable", "A review must not return a qualification level.");
  }
  if (run.qualification.marketplaceConsent !== "unchanged") {
    throw new ServiceError("unavailable", "A review must leave marketplaceConsent unchanged.");
  }
  return run;
}

export async function recoverQualificationRun(input: {
  runId: string;
  action: "resume" | "retry";
}): Promise<QualificationRun> {
  const { status, body } = await callAs<Record<string, unknown> & { error?: string }>(
    "staff",
    `/v1/admin/qualification/runs/${encodeURIComponent(input.runId)}/recover`,
    { method: "POST", body: { action: input.action } },
  );
  if (status !== 200) raise(status, body);
  const run = readQualificationRun(body);
  if (!run) throw new ServiceError("unavailable", "The recovery response was not readable.");
  return run;
}

export async function processDueRetries(): Promise<{
  retried: readonly string[];
  providerVerified: false;
}> {
  const { status, body } = await callAs<Record<string, unknown> & { error?: string }>(
    "staff",
    "/v1/admin/qualification/retries/run",
    { method: "POST", body: {} },
  );
  if (status !== 200) raise(status, body);
  const batch = readRetryBatch(body);
  if (!batch) throw new ServiceError("unavailable", "The retry batch response was not readable.");
  return batch;
}

export function adminMayCallVoiceBridge(): false {
  return false;
}

export async function probeVoiceBridgeFromAdmin(): Promise<never> {
  throw new ServiceError(
    "unavailable",
    "Admin screens do not call /v1/voice-bridge. Staff use /v1/admin/qualification. "
      + `OpenAPI ${PHASE4A_OPENAPI} on backend ${PHASE4A_BACKEND}.`,
  );
}
