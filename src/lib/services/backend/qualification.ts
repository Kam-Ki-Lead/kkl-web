/**
 * Phase 4 Admin qualification adapters against OpenAPI 1.0.0-phase4.c
 * (kkl-backend `e7ffdb6`).
 *
 * Staff routes under `/v1/admin/qualification/*`. Voice-bridge stays
 * kkl-voice → kkl-backend and is not called from Admin. Staff inventory is
 * `/v1/admin/qualification/leads`, not marketplace `/v1/leads`. Sample
 * fixtures are never substituted when `KKL_QUALIFICATION=backend`.
 */

import { ServiceError } from "@/lib/services/contracts";
import { isFrameworkSignal, callAs, bearerMode } from "./session";
import {
  PHASE4A_BACKEND,
  PHASE4A_OPENAPI,
  LEAD_PAGE_SIZE,
  readCallingWindowResponse,
  readOptOutResponse,
  readQualificationRun,
  readQualificationRunPage,
  readQuestionSetPage,
  readRegisteredQuestionSet,
  readStaffLeadDetail,
  readStaffLeadPage,
  type CallingWindowConfig,
  type OptOutConfig,
  type QualificationFilter,
  type QualificationRun,
  type QualificationRunPage,
  type QuestionSetSummary,
  type ReviewFilter,
  type StaffLeadDetail,
  type StaffLeadPage,
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

/** H4-1 — staff operational lead inventory. */
export async function listQualificationLeads(options?: {
  qualification?: QualificationFilter | "";
  review?: ReviewFilter | "";
  offset?: number;
  limit?: number;
}): Promise<QualificationLoad<StaffLeadPage>> {
  try {
    const query = new URLSearchParams();
    if (options?.qualification) query.set("qualification", options.qualification);
    if (options?.review) query.set("review", options.review);
    query.set("limit", String(options?.limit ?? LEAD_PAGE_SIZE));
    query.set("offset", String(options?.offset ?? 0));
    const { status, body } = await callAs<Record<string, unknown> & { error?: string }>(
      "staff",
      `/v1/admin/qualification/leads?${query.toString()}`,
    );
    if (status !== 200) return refused(status, body.error, "Staff leads could not be loaded.");
    const page = readStaffLeadPage(body);
    if (!page) {
      return { ok: false, message: "The staff lead inventory did not match the published schema." };
    }
    return { ok: true, value: page };
  } catch (error) {
    return fail(error, "Staff leads could not be loaded.");
  }
}

/** H4-2 — staff operational lead detail with run paths and capabilities. */
export async function getQualificationLead(
  leadId: string,
): Promise<QualificationLoad<StaffLeadDetail | null>> {
  try {
    const { status, body } = await callAs<Record<string, unknown> & { error?: string }>(
      "staff",
      `/v1/admin/qualification/leads/${encodeURIComponent(leadId)}`,
    );
    if (status === 404) return { ok: true, value: null };
    if (status !== 200) return refused(status, body.error, "That staff lead could not be loaded.");
    const lead = readStaffLeadDetail(body);
    if (!lead) return { ok: false, message: "That staff lead response did not match the published schema." };
    return { ok: true, value: lead };
  } catch (error) {
    return fail(error, "That staff lead could not be loaded.");
  }
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

export async function getCallingWindow(): Promise<QualificationLoad<CallingWindowConfig>> {
  try {
    const { status, body } = await callAs<Record<string, unknown> & { error?: string }>(
      "staff",
      "/v1/admin/qualification/calling-window",
    );
    if (status !== 200) return refused(status, body.error, "The calling window could not be loaded.");
    const read = readCallingWindowResponse(body);
    if (!read.ok) return { ok: false, message: "The calling window response was not readable." };
    return { ok: true, value: read.config };
  } catch (error) {
    return fail(error, "The calling window could not be loaded.");
  }
}

export async function setCallingWindow(input: {
  timeZone: string;
  start: string;
  end: string;
}): Promise<CallingWindowConfig> {
  const { status, body } = await callAs<Record<string, unknown> & { error?: string }>(
    "staff",
    "/v1/admin/qualification/calling-window",
    { method: "POST", body: input },
  );
  if (status !== 200) raise(status, body);
  const read = readCallingWindowResponse(body);
  if (!read.ok || !read.config.window) {
    throw new ServiceError("unavailable", "The calling window response was not readable.");
  }
  return read.config;
}

export async function getOptOutSignals(): Promise<QualificationLoad<OptOutConfig>> {
  try {
    const { status, body } = await callAs<Record<string, unknown> & { error?: string }>(
      "staff",
      "/v1/admin/qualification/opt-out",
    );
    if (status !== 200) return refused(status, body.error, "Opt-out signals could not be loaded.");
    const read = readOptOutResponse(body);
    if (!read.ok) return { ok: false, message: "The opt-out response was not readable." };
    return { ok: true, value: read.config };
  } catch (error) {
    return fail(error, "Opt-out signals could not be loaded.");
  }
}

export async function setOptOutSignals(input: {
  dtmf: string | null;
  keywords: readonly string[];
}): Promise<OptOutConfig> {
  const { status, body } = await callAs<Record<string, unknown> & { error?: string }>(
    "staff",
    "/v1/admin/qualification/opt-out",
    { method: "POST", body: input },
  );
  if (status !== 200) raise(status, body);
  const read = readOptOutResponse(body);
  if (!read.ok || !read.config.signals) {
    throw new ServiceError("unavailable", "The opt-out response was not readable.");
  }
  return read.config;
}

export async function listQualificationRuns(options?: {
  state?: string;
  limit?: number;
}): Promise<QualificationLoad<QualificationRunPage>> {
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
    return { ok: true, value: page };
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

/**
 * Start a qualification run. Creation may invoke the adapter
 * (`effect: adapter_invoked`) or only record (`recorded_only`).
 * `providerDispatch.dispatched` is the live acceptance claim.
 */
export async function startQualificationRun(input: {
  leadId: string;
  questionSetId: string;
  channel: "voice" | "whatsapp";
  idempotencyKey: string;
}): Promise<QualificationRun> {
  const { status, body } = await callAs<Record<string, unknown> & { error?: string }>(
    "staff",
    "/v1/admin/qualification/runs",
    { method: "POST", body: input },
  );
  if (status !== 201) raise(status, body);
  const run = readQualificationRun(body);
  if (!run) throw new ServiceError("unavailable", "The started run response was not readable.");
  if (run.qualification.level !== null) {
    throw new ServiceError("unavailable", "A started run must not return a qualification level.");
  }
  if (run.providerDispatch?.dispatched === true) {
    throw new ServiceError(
      "unavailable",
      "Start-run reported providerDispatch.dispatched true. Live dispatch is not accepted here.",
    );
  }
  return run;
}

export async function listVoiceCalls(): Promise<QualificationLoad<QualificationRunPage>> {
  const loaded = await listQualificationRuns({ limit: 50 });
  if (!loaded.ok) return loaded;
  return {
    ok: true,
    value: {
      ...loaded.value,
      runs: loaded.value.runs.filter((run) => run.channel === "voice"),
    },
  };
}

export async function getVoiceCall(runId: string): Promise<QualificationLoad<QualificationRun | null>> {
  return getQualificationRun(runId);
}

export async function listWhatsAppJourney(): Promise<QualificationLoad<QualificationRunPage>> {
  const loaded = await listQualificationRuns({ limit: 50 });
  if (!loaded.ok) return loaded;
  return {
    ok: true,
    value: {
      ...loaded.value,
      runs: loaded.value.runs.filter((run) => run.channel === "whatsapp"),
    },
  };
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

/**
 * Resume never dispatches under this contract. Retry may only be used when
 * capabilities say it does not dispatch, unless a safe simulated-provider host
 * has authorised otherwise.
 */
export async function recoverQualificationRun(input: {
  runId: string;
  action: "resume" | "retry";
}): Promise<QualificationRun> {
  if (input.action === "retry") {
    const current = await getQualificationRun(input.runId);
    if (!current.ok || !current.value) {
      throw new ServiceError("unavailable", current.ok ? "That run was not found." : current.message);
    }
    const retry = current.value.capabilities?.retry;
    if (!retry?.allowed) {
      throw new ServiceError(
        "validation",
        retry?.reason
          ? `Retry is not allowed (${retry.reason}).`
          : "Retry is not allowed for this run.",
      );
    }
    if (retry.dispatchesProvider) {
      throw new ServiceError(
        "unavailable",
        "Retry would dispatch to a provider. It needs an isolated simulated-provider host "
          + "with explicit live-test authorisation. Missing Exotel credentials alone is not enough.",
      );
    }
  }
  const { status, body } = await callAs<Record<string, unknown> & { error?: string }>(
    "staff",
    `/v1/admin/qualification/runs/${encodeURIComponent(input.runId)}/recover`,
    { method: "POST", body: { action: input.action } },
  );
  if (status !== 200) raise(status, body);
  const run = readQualificationRun(body);
  if (!run) throw new ServiceError("unavailable", "The recovery response was not readable.");
  if (run.providerDispatch?.dispatched === true) {
    throw new ServiceError(
      "unavailable",
      "Recovery reported providerDispatch.dispatched true. Live dispatch is not accepted here.",
    );
  }
  return run;
}

export async function processDueRetries(): Promise<{
  retried: readonly string[];
  providerVerified: false;
}> {
  throw new ServiceError(
    "unavailable",
    "Due retries invoke dial(). They are not run from this console without isolated "
      + "simulated-provider authorisation.",
  );
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
