import { ServiceError } from "@/lib/services/contracts";
import { isFrameworkSignal, callAs, bearerMode } from "./session";
import {
  INTAKE_BATCH_LIMIT,
  readIntakeBatch,
  readIntakeBatchList,
  staffRefusal,
  type IntakeBatch,
  type IntakeCounts,
} from "./staff-views";

/**
 * A-10 and A-11 from `GET /v1/leads/intake/batches` and
 * `GET /v1/leads/intake/batches/{batchRef}`.
 *
 * Counts are the persisted count fields. Item rows are the typed outcomes
 * the implementation stores. A phone number is not rendered.
 */

export type IntakeLoad<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly message: string };

function refused(status: number, error: string | undefined, fallback: string): IntakeLoad<never> {
  if (status === 403 && bearerMode() === "browser-session") {
    return { ok: false, message: staffRefusal(error) };
  }
  if (status === 403) return { ok: false, message: error ?? "This account cannot open intake." };
  return { ok: false, message: error ?? fallback };
}

function fail(error: unknown): IntakeLoad<never> {
  if (isFrameworkSignal(error)) throw error;
  if (error instanceof ServiceError) return { ok: false, message: error.message };
  if (error instanceof Error && error.message) return { ok: false, message: error.message };
  return { ok: false, message: "Intake could not be loaded." };
}

export async function listIntakeBatches(): Promise<IntakeLoad<readonly IntakeCounts[]>> {
  try {
    const { status, body } = await callAs<{ batches?: unknown; error?: string }>(
      "staff",
      `/v1/leads/intake/batches?limit=${INTAKE_BATCH_LIMIT}`,
    );
    if (status !== 200) return refused(status, body.error, "Intake batches could not be loaded.");
    return { ok: true, value: readIntakeBatchList(body) };
  } catch (error) {
    return fail(error);
  }
}

export async function getIntakeBatch(batchRef: string): Promise<IntakeLoad<IntakeBatch | null>> {
  try {
    const { status, body } = await callAs<{ error?: string }>(
      "staff",
      `/v1/leads/intake/batches/${encodeURIComponent(batchRef)}`,
    );
    if (status === 404) return { ok: true, value: null };
    if (status !== 200) return refused(status, body.error, "That intake batch could not be loaded.");
    return { ok: true, value: readIntakeBatch(body) };
  } catch (error) {
    return fail(error);
  }
}
