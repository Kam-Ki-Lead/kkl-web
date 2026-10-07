"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { redirectForAuth } from "@/lib/auth/recover";
import { ServiceError } from "@/lib/services/contracts";
import {
  recoverQualificationRun,
  refreshRunRecommendations,
  registerSyntheticQuestionSet,
  resolveRunContradiction,
  reviewQualificationRun,
  setCallingWindow,
  setOptOutSignals,
  startQualificationRun,
} from "@/lib/services/backend/qualification";
import {
  STALE_SCREEN_MESSAGE,
  replacementValue,
  resolutionNotice,
  validateResolution,
  type ResolutionChoice,
} from "@/lib/domain/contradiction-resolution";
import { refreshNotice } from "@/lib/domain/recommendation-refresh";

const SETTINGS_PATH = "/admin/settings";
const SYSTEM_PATH = "/admin/system";
const VOICE_PATH = "/admin/voice";

function runPath(runId: string): string {
  return `/admin/voice/${encodeURIComponent(runId)}`;
}

export type QualificationActionState = {
  error?: string;
  field?: string;
  notice?: string;
};

export async function saveCallingWindow(
  _previous: QualificationActionState,
  formData: FormData,
): Promise<QualificationActionState> {
  const timeZone = String(formData.get("timeZone") ?? "").trim();
  const start = String(formData.get("start") ?? "").trim();
  const end = String(formData.get("end") ?? "").trim();
  if (!timeZone) return { error: "Enter an IANA time zone.", field: "timeZone" };
  if (!/^\d{2}:\d{2}$/.test(start)) return { error: "Use HH:MM for the start.", field: "start" };
  if (!/^\d{2}:\d{2}$/.test(end)) return { error: "Use HH:MM for the end.", field: "end" };
  try {
    const config = await setCallingWindow({ timeZone, start, end });
    const saved = config.window;
    if (!saved) return { error: "The calling window was not returned after save." };
    revalidatePath(SETTINGS_PATH);
    return {
      notice:
        `Calling window saved: ${saved.timeZone} ${saved.start}–${saved.end}`
        + ` (provenance ${config.provenance}). Hours are not assumed elsewhere.`
        + " staff_saved is not client approval.",
    };
  } catch (error) {
    redirectForAuth(error, SETTINGS_PATH);
    if (error instanceof ServiceError) return { error: error.message };
    throw error;
  }
}

export async function saveOptOutSignals(
  _previous: QualificationActionState,
  formData: FormData,
): Promise<QualificationActionState> {
  const keywordsRaw = String(formData.get("keywords") ?? "");
  const keywords = keywordsRaw
    .split(/[\n,]+/)
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean);
  const dtmfRaw = String(formData.get("dtmf") ?? "").trim();
  const dtmf = dtmfRaw === "" ? null : dtmfRaw;
  if (keywords.length < 1) {
    return { error: "Provide the opt-out keywords. None are assumed.", field: "keywords" };
  }
  try {
    const config = await setOptOutSignals({ dtmf, keywords });
    const signals = config.signals;
    if (!signals) return { error: "Opt-out signals were not returned after save." };
    revalidatePath(SETTINGS_PATH);
    return {
      notice:
        `Opt-out signals saved (${signals.keywords.join(", ")}`
        + `${signals.dtmf ? `, DTMF ${signals.dtmf}` : ""}`
        + `; provenance ${config.provenance}). A match suppresses voice and WhatsApp; `
        + "it does not grant consent. staff_saved is not client approval.",
    };
  } catch (error) {
    redirectForAuth(error, SETTINGS_PATH);
    if (error instanceof ServiceError) return { error: error.message };
    throw error;
  }
}

export async function registerSyntheticQuestions(
  _previous: QualificationActionState,
  formData: FormData,
): Promise<QualificationActionState> {
  const typed = String(formData.get("versionLabel") ?? "").trim().toLowerCase();
  // Blank means "pick one for me". The suggestion used to be a Date.now()
  // call in the form's render, which React 19 reports as an impure component
  // and which produces a different value on the server and on hydration.
  // Generating it here costs nothing and is a single, stable decision.
  const label = typed || `synthetic-${Date.now().toString(36).slice(-6)}`;
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(label)) {
    return { error: "Use a short lowercase version label.", field: "versionLabel" };
  }
  try {
    const registered = await registerSyntheticQuestionSet(label);
    revalidatePath(SETTINGS_PATH);
    return {
      notice:
        `Synthetic question set ${registered.versionLabel} saved (${registered.status}). `
        + "Prompts say SYNTHETIC — not the client questionnaire.",
    };
  } catch (error) {
    redirectForAuth(error, SETTINGS_PATH);
    if (error instanceof ServiceError) return { error: error.message };
    throw error;
  }
}

export async function startQualificationRunAction(
  _previous: QualificationActionState,
  formData: FormData,
): Promise<QualificationActionState> {
  const leadId = String(formData.get("leadId") ?? "").trim();
  const questionSetId = String(formData.get("questionSetId") ?? "").trim();
  const channel = String(formData.get("channel") ?? "").trim();
  if (!leadId || !questionSetId) {
    return { error: "A synthetic lead and question set are required." };
  }
  if (channel !== "voice" && channel !== "whatsapp") {
    return { error: "Choose voice or whatsapp.", field: "channel" };
  }
  try {
    const run = await startQualificationRun({
      leadId,
      questionSetId,
      channel,
      idempotencyKey: `web-start-${randomUUID()}`,
    });
    revalidatePath(VOICE_PATH);
    revalidatePath("/admin/whatsapp");
    revalidatePath("/admin/leads");
    // Redirect carries effect/dispatch on the detail page; do not claim live dial.
    redirect(runPath(run.id));
  } catch (error) {
    redirectForAuth(error, VOICE_PATH);
    if (error instanceof ServiceError) return { error: error.message };
    throw error;
  }
}

export async function submitQualificationReview(
  _previous: QualificationActionState,
  formData: FormData,
): Promise<QualificationActionState> {
  const runId = String(formData.get("runId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (decision !== "facts_recorded" && decision !== "needs_follow_up") {
    return { error: "Choose facts_recorded or needs_follow_up.", field: "decision" };
  }
  if (reason.length < 3) return { error: "A reason is required.", field: "reason" };
  try {
    const run = await reviewQualificationRun({
      runId,
      decision,
      reason,
    });
    revalidatePath(runPath(runId));
    revalidatePath(VOICE_PATH);
    revalidatePath("/admin/whatsapp");
    return {
      notice:
        `Review recorded as ${run.reviews.at(-1)?.decision ?? decision}. `
        + "Qualification level stays unset. Marketplace consent is unchanged.",
    };
  } catch (error) {
    redirectForAuth(error, runPath(runId));
    if (error instanceof ServiceError) return { error: error.message };
    throw error;
  }
}

export async function resumeQualificationRun(
  _previous: QualificationActionState,
  formData: FormData,
): Promise<QualificationActionState> {
  const runId = String(formData.get("runId") ?? "").trim();
  try {
    const run = await recoverQualificationRun({ runId, action: "resume" });
    revalidatePath(runPath(runId));
    revalidatePath(VOICE_PATH);
    revalidatePath("/admin/whatsapp");
    revalidatePath(SYSTEM_PATH);
    const dispatch = run.providerDispatch;
    const dispatchNote = dispatch
      ? ` providerDispatch.dispatched=${dispatch.dispatched}`
        + (dispatch.synthetic === true ? " synthetic=true" : "")
        + ` providerVerified=${dispatch.providerVerified}`
        + (dispatch.reason ? ` (${dispatch.reason})` : "")
        + "."
      : "";
    if (dispatch?.dispatched === true) {
      return {
        notice:
          `Resume response recorded. Run state is ${run.state}.${dispatchNote} `
          + "The server accepted a provider dispatch; this console cannot undo it.",
      };
    }
    return {
      notice:
        `Resume applied. Run state is ${run.state}.${dispatchNote} `
        + "Resume never dispatches under this contract.",
    };
  } catch (error) {
    redirectForAuth(error, runPath(runId));
    if (error instanceof ServiceError) return { error: error.message };
    throw error;
  }
}

export async function retryQualificationRun(
  _previous: QualificationActionState,
  formData: FormData,
): Promise<QualificationActionState> {
  const runId = String(formData.get("runId") ?? "").trim();
  try {
    const run = await recoverQualificationRun({ runId, action: "retry" });
    revalidatePath(runPath(runId));
    revalidatePath(VOICE_PATH);
    revalidatePath("/admin/whatsapp");
    revalidatePath(SYSTEM_PATH);
    const dispatchNote = run.providerDispatch
      ? ` providerDispatch.dispatched=${run.providerDispatch.dispatched}`
        + (run.providerDispatch.reason ? ` (${run.providerDispatch.reason})` : "")
        + "."
      : "";
    return {
      notice:
        `Retry applied. Run state is ${run.state}.${dispatchNote} `
        + "Retry only proceeds when capabilities.retry.dispatchesProvider is false "
        + "on this host.",
    };
  } catch (error) {
    redirectForAuth(error, runPath(runId));
    if (error instanceof ServiceError) return { error: error.message };
    throw error;
  }
}

/**
 * Settles a contradiction a run is held for.
 *
 * The form carries one of two things: the id of a conflicting answer to keep,
 * or a value to put in their place. Validated here against the same rules the
 * backend applies, so a staff member is told what is wrong beside the field
 * rather than by a 422 that loses what they typed.
 *
 * `expectedUpdatedAt` is what the screen was showing. If the run moved under
 * it the save is refused, and the refusal says to reload rather than
 * pretending the decision was made against what is there now.
 *
 * A resolution contacts nobody. The notice says so every time, because
 * "resumed" is the word somebody reads as "we called them".
 */
export async function resolveRunContradictionAction(
  _previous: QualificationActionState,
  formData: FormData,
): Promise<QualificationActionState> {
  const runId = String(formData.get("runId") ?? "").trim();
  const questionKey = String(formData.get("questionKey") ?? "").trim();
  const mode = String(formData.get("mode") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const observedAt = String(formData.get("observedAt") ?? "").trim() || null;
  const schemaType = String(formData.get("schemaType") ?? "").trim();
  const hasOptions = String(formData.get("hasOptions") ?? "") === "yes";

  // The form says which shape the question takes, because the server action
  // does not hold the question set and must not guess one.
  let choice: ResolutionChoice | null = null;
  if (mode === "keep") {
    const answerId = String(formData.get("keepAnswerId") ?? "").trim();
    if (answerId) choice = { kind: "keep", answerId };
  } else if (mode === "enter") {
    const raw = String(formData.get("value") ?? "");
    if (raw.trim()) {
      const question = {
        key: questionKey,
        prompt: questionKey,
        required: true,
        answerSchema: hasOptions
          ? { type: schemaType || undefined, options: [{ id: raw.trim(), label: raw.trim() }] }
          : { type: schemaType || undefined },
      };
      choice = { kind: "enter", value: replacementValue(question, raw) };
    }
  }

  const problem = validateResolution({ questionKey, choice, reason });
  if (problem) return { error: problem.message, field: problem.field };

  try {
    const result = await resolveRunContradiction({
      runId,
      questionKey,
      choice: choice as ResolutionChoice,
      reason,
      idempotencyKey: `resolve-${randomUUID()}`,
      expectedUpdatedAt: observedAt,
    });
    revalidatePath(runPath(runId));
    revalidatePath(VOICE_PATH);
    revalidatePath("/admin/whatsapp");
    return { notice: resolutionNotice(result) };
  } catch (error) {
    redirectForAuth(error, runPath(runId));
    if (error instanceof ServiceError) {
      if (/changed since/i.test(error.message)) {
        return { error: STALE_SCREEN_MESSAGE, field: "reason" };
      }
      return { error: error.message };
    }
    throw error;
  }
}

/**
 * Recomputes recommendations against the answers as they now stand.
 *
 * Deliberately an action rather than something a page load does: recomputing
 * what somebody is about to act on, without being asked, is how a screen
 * tells two different stories on two refreshes. It changes no selection and
 * no visit request.
 */
export async function refreshRunRecommendationsAction(
  _previous: QualificationActionState,
  formData: FormData,
): Promise<QualificationActionState> {
  const runId = String(formData.get("runId") ?? "").trim();
  try {
    const result = await refreshRunRecommendations({ runId });
    revalidatePath(runPath(runId));
    return {
      notice:
        `${refreshNotice(result)} ${result.guarantees.join(" ")}`,
    };
  } catch (error) {
    redirectForAuth(error, runPath(runId));
    if (error instanceof ServiceError) return { error: error.message };
    throw error;
  }
}
