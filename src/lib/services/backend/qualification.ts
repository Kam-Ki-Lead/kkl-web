/**
 * Phase 4 Admin qualification adapters.
 *
 * Staff voice, WhatsApp journey and lead-qualification reads are not published
 * on OpenAPI 1.0.0-phase3.t. When `KKL_QUALIFICATION=backend`, these loaders
 * refuse with the handoff that names the missing contract. They never call
 * voice-bridge stubs, never invent paths, and never fall back to fixtures.
 *
 * Question definitions for A-15 reuse the published pricing configuration
 * schema (`questionMapping: not_configured`) when admin operations are on
 * the backend. That is a definition list, not a level map.
 */

import { ServiceError } from "@/lib/services/contracts";
import { adminOperationsStoreKind } from "./config";
import { isFrameworkSignal, bearerMode } from "./session";
import {
  listPricingVersions,
  readPricingConfiguration,
} from "./provisional-pricing";
import type { PricingQuestionView } from "./provisional-pricing-reading";
import {
  MAPPING_NOT_CONFIGURED_LABEL,
  unpublishedStaffLoad,
  type Phase4HandoffId,
  type UnpublishedStaffLoad,
} from "./qualification-contract";
import { staffRefusal } from "./staff-views";

export type QualificationLoad<T> =
  | { readonly ok: true; readonly value: T }
  | UnpublishedStaffLoad;

function fail(handoff: Phase4HandoffId, error: unknown): UnpublishedStaffLoad {
  if (isFrameworkSignal(error)) throw error;
  if (error instanceof ServiceError) {
    return { ok: false, handoff, message: error.message };
  }
  if (error instanceof Error && error.message) {
    return { ok: false, handoff, message: error.message };
  }
  return unpublishedStaffLoad(handoff);
}

/** A-12 — staff lead inventory. Not published. */
export async function listQualificationLeads(): Promise<UnpublishedStaffLoad> {
  return unpublishedStaffLoad("H4-1");
}

/** A-13 — staff lead detail with Q&A / review states. Not published. */
export async function getQualificationLead(
  _leadId: string,
): Promise<UnpublishedStaffLoad> {
  return unpublishedStaffLoad("H4-2");
}

/** A-24 — staff call volumes and recent calls. Not published. */
export async function listVoiceCalls(): Promise<UnpublishedStaffLoad> {
  return unpublishedStaffLoad("H4-3");
}

/** A-25 — staff call detail. Not published. Never dials. */
export async function getVoiceCall(_callId: string): Promise<UnpublishedStaffLoad> {
  return unpublishedStaffLoad("H4-4");
}

/** A-26 — WhatsApp journey and conversations. Not published. */
export async function listWhatsAppJourney(): Promise<UnpublishedStaffLoad> {
  return unpublishedStaffLoad("H4-5");
}

/** A-31 recovery actions for voice/WhatsApp. Not published. */
export async function listQualificationIntegrations(): Promise<UnpublishedStaffLoad> {
  return unpublishedStaffLoad("H4-7");
}

export type QuestionConfigurationView = {
  readonly configurationId: string;
  readonly version: number;
  readonly questions: readonly PricingQuestionView[];
  readonly questionMapping: typeof MAPPING_NOT_CONFIGURED_LABEL;
  readonly source: "pricing_configuration";
  readonly note: string;
};

/**
 * A-15 question definitions from the published pricing schema.
 *
 * Available when `KKL_ADMIN_OPERATIONS=backend`. Prompts are definitions
 * only. The mapping field is always the published `not_configured` value —
 * Levels 1–10 are not inferred from the prompt count.
 */
export async function loadQuestionConfiguration(): Promise<
  QualificationLoad<QuestionConfigurationView | null>
> {
  if (adminOperationsStoreKind() !== "backend") {
    return {
      ok: false,
      handoff: "H4-6",
      message:
        "Question configuration is read from the pricing configuration when "
        + "KKL_ADMIN_OPERATIONS=backend. That switch is off, so nothing is loaded.",
    };
  }

  try {
    const versions = await listPricingVersions();
    if (versions.length === 0) {
      return { ok: true, value: null };
    }
    const latest = versions.reduce((best, row) =>
      row.version > best.version ? row : best);
    const configuration = await readPricingConfiguration(latest.id);
    return {
      ok: true,
      value: {
        configurationId: configuration.id,
        version: configuration.version,
        questions: configuration.questions,
        questionMapping: MAPPING_NOT_CONFIGURED_LABEL,
        source: "pricing_configuration",
        note:
          "These prompts are stored with the pricing version. They are "
          + "definitions only. Qualification-level mapping is not configured, "
          + "and answer counts do not select a level.",
      },
    };
  } catch (error) {
    if (error instanceof ServiceError && error.kind === "forbidden") {
      const message =
        bearerMode() === "browser-session"
          ? staffRefusal(error.message)
          : error.message;
      return { ok: false, handoff: "H4-6", message };
    }
    return fail("H4-6", error);
  }
}

/**
 * Guard used by pages that must not treat voice-bridge as an Admin API.
 * Always false: Admin never calls those stubs from this repository.
 */
export function adminMayCallVoiceBridge(): false {
  return false;
}

/** Exported for tests that assert we do not hit voice-bridge from Admin. */
export async function probeVoiceBridgeFromAdmin(): Promise<never> {
  throw new ServiceError(
    "unavailable",
    "Admin screens do not call /v1/voice-bridge. That boundary is kkl-voice → kkl-backend, "
      + "and the Phase 3 stubs return 501 without storing a call.",
  );
}
