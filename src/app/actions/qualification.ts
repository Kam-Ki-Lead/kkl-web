"use server";

import { revalidatePath } from "next/cache";
import { redirectForAuth } from "@/lib/auth/recover";
import { ServiceError } from "@/lib/services/contracts";
import {
  processDueRetries,
  recoverQualificationRun,
  registerSyntheticQuestionSet,
  reviewQualificationRun,
  setCallingWindow,
  setOptOutSignals,
} from "@/lib/services/backend/qualification";

const SETTINGS_PATH = "/admin/settings";
const SYSTEM_PATH = "/admin/system";

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
    const window = await setCallingWindow({ timeZone, start, end });
    revalidatePath(SETTINGS_PATH);
    return {
      notice: `Calling window saved: ${window.timeZone} ${window.start}–${window.end}. Hours are not assumed elsewhere.`,
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
    const signals = await setOptOutSignals({ dtmf, keywords });
    revalidatePath(SETTINGS_PATH);
    return {
      notice:
        `Opt-out signals saved (${signals.keywords.join(", ")}`
        + `${signals.dtmf ? `, DTMF ${signals.dtmf}` : ""}). A match suppresses voice and WhatsApp; it does not grant consent.`,
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
  const label = String(formData.get("versionLabel") ?? "").trim().toLowerCase();
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
    revalidatePath("/admin/voice");
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

export async function submitQualificationRecovery(
  _previous: QualificationActionState,
  formData: FormData,
): Promise<QualificationActionState> {
  const runId = String(formData.get("runId") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim();
  if (action !== "resume" && action !== "retry") {
    return { error: "Choose resume or retry.", field: "action" };
  }
  try {
    const run = await recoverQualificationRun({ runId, action });
    revalidatePath(runPath(runId));
    revalidatePath("/admin/voice");
    revalidatePath("/admin/whatsapp");
    revalidatePath(SYSTEM_PATH);
    return {
      notice:
        `Recovery ${action} applied. Run state is ${run.state}. `
        + "providerVerified remains false — this is not proof of a live dial.",
    };
  } catch (error) {
    redirectForAuth(error, runPath(runId));
    if (error instanceof ServiceError) return { error: error.message };
    throw error;
  }
}

export async function runDueQualificationRetries(
  _previous: QualificationActionState,
  _formData: FormData,
): Promise<QualificationActionState> {
  try {
    const batch = await processDueRetries();
    revalidatePath(SYSTEM_PATH);
    revalidatePath("/admin/voice");
    return {
      notice:
        batch.retried.length === 0
          ? "No due retries. providerVerified is false — nothing here is a live provider call."
          : `${batch.retried.length} run(s) marked for retry. providerVerified is false.`,
    };
  } catch (error) {
    redirectForAuth(error, SYSTEM_PATH);
    if (error instanceof ServiceError) return { error: error.message };
    throw error;
  }
}
