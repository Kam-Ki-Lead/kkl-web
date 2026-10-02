/**
 * Phase 4 qualification handoff map against OpenAPI 1.0.0-phase4.b
 * (kkl-backend `39d26fd` on `claude/phase-4-qualification`).
 *
 * Earlier preparation at dc2f275 consulted Phase 3 `1.0.0-phase3.t`. Wiring at
 * 04b54ab used `1.0.0-phase4.a`. This file records phase4.b status.
 */

/** Keep in lockstep with PHASE4A_* in qualification-reading.ts. */
export const PHASE4_OPENAPI = "1.0.0-phase4.b" as const;
export const PHASE4_BACKEND_REF = "39d26fd" as const;

/** Paths Phase 3 published for voice. Bodies are ignored; responses are 501. */
export const VOICE_BRIDGE_STUBS = [
  { method: "POST", path: "/v1/voice-bridge/calls", summary: "Schedule a call — not implemented" },
  { method: "GET", path: "/v1/voice-bridge/calls/{callId}", summary: "Lead context — not implemented" },
  {
    method: "POST",
    path: "/v1/voice-bridge/calls/{callId}/segments",
    summary: "Transcript segment — not implemented",
  },
  {
    method: "POST",
    path: "/v1/voice-bridge/calls/{callId}/outcome",
    summary: "Call outcome — not implemented",
  },
  { method: "POST", path: "/v1/webhooks/exotel", summary: "Exotel callback — not implemented" },
] as const;

export const PHASE4_ALREADY_CONNECTED = [
  {
    screens: ["A-10", "A-11"],
    switch: "KKL_INTAKE",
    paths: [
      "GET /v1/leads/intake/batches",
      "GET /v1/leads/intake/batches/{batchRef}",
    ],
    note: "Intake volumes and rejections. Not a qualification run.",
  },
  {
    screens: ["A-27"],
    switch: "KKL_NOTIFICATIONS",
    paths: ["GET /v1/notifications/deliveries"],
    note: "Delivery attempts. Queued / unconfigured is not delivery.",
  },
  {
    screens: ["A-28"],
    switch: "KKL_ADMIN_OPERATIONS",
    paths: [
      "GET /v1/notifications/suppressions",
      "GET /v1/notifications/suppressions/check",
    ],
    note: "Suppression list without addresses. Read-only for removal.",
  },
] as const;

export type Phase4HandoffId =
  | "H4-1"
  | "H4-2"
  | "H4-3"
  | "H4-4"
  | "H4-5"
  | "H4-6"
  | "H4-7"
  | "H4-8";

export type Phase4HandoffStatus = "open" | "partial" | "wired" | "verified" | "satisfied";

export type Phase4Handoff = {
  readonly id: Phase4HandoffId;
  readonly screens: readonly string[];
  readonly status: Phase4HandoffStatus;
  readonly need: string;
  readonly mustNot: string;
  readonly published?: string;
};

export const PHASE4_HANDOFFS: readonly Phase4Handoff[] = [
  {
    id: "H4-1",
    screens: ["A-12"],
    status: "open",
    need:
      "Staff-paged lead inventory with lifecycle status (including incomplete "
      + "qualification and human-review), consent status, source, age, and "
      + "stable lead references.",
    mustNot:
      "Do not treat GET /v1/admin/qualification/runs as the Admin lead list. "
      + "inventory: false. GET /v1/leads?eligible=false is not a staff-only inventory.",
  },
  {
    id: "H4-2",
    screens: ["A-13"],
    status: "partial",
    need:
      "Staff lead detail with Q&A, version references, incomplete / human-review. "
      + "Run detail supplies Q&A for a run; a dedicated staff lead document is still missing.",
    mustNot:
      "Do not equate a run outcome with lead sale eligibility. "
      + "marketplaceConsent stays unchanged.",
    published: "GET /v1/admin/qualification/runs/{runId} (run-scoped answers)",
  },
  {
    id: "H4-3",
    screens: ["A-24"],
    status: "verified",
    need: "Staff list of qualification runs / call attempts with provider status.",
    mustNot:
      "Do not dial from Admin. Do not call voice-bridge. "
      + "providerVerified false is not a live call. Runs are not the lead inventory.",
    published: "GET /v1/admin/qualification/runs (filter channel=voice in the UI)",
  },
  {
    id: "H4-4",
    screens: ["A-25"],
    status: "verified",
    need:
      "Staff run detail: answers with question-set version, transcript text, model summary "
      + "labelled as model output, consent evidence, review state.",
    mustNot:
      "Do not render modelReportedIntent as a level. qualification.level stays unset.",
    published: "GET /v1/admin/qualification/runs/{runId}",
  },
  {
    id: "H4-5",
    screens: ["A-26"],
    status: "verified",
    need:
      "Staff WhatsApp qualification runs with message statuses that distinguish "
      + "queued, delivered, failed, not_configured.",
    mustNot:
      "Do not equate queued with delivered, or conversation completion with sale eligibility.",
    published: "GET /v1/admin/qualification/runs (channel=whatsapp)",
  },
  {
    id: "H4-6",
    screens: ["A-15"],
    status: "verified",
    need:
      "Qualification question sets with provenance. Synthetic prompts must say SYNTHETIC. "
      + "Calling window and opt-out configuration with GET reload of saved values.",
    mustNot:
      "Do not use pricing prompts as the qualification questionnaire. "
      + "Do not map questions onto Levels 1–10.",
    published:
      "GET/POST /v1/admin/qualification/question-sets, "
      + "GET/POST calling-window, GET/POST opt-out",
  },
  {
    id: "H4-7",
    screens: ["A-31", "A-25"],
    status: "verified",
    need:
      "Authorised recovery: resume incomplete (no dial). Review while pending. "
      + "Retry / due-retries invoke dial and stay gated. Start-run without live dispatch.",
    mustNot:
      "Do not press retry merely because Exotel credentials are absent. "
      + "Do not bypass suppression or quiet hours.",
    published:
      "POST .../runs/{runId}/review, POST .../recover (resume), start-run POST",
  },
  {
    id: "H4-8",
    screens: ["kkl-voice"],
    status: "partial",
    need:
      "Voice-bridge remains the kkl-voice boundary. Admin uses /v1/admin/qualification. "
      + "Schema freeze for voice-bridge is still outstanding beyond 501 stubs.",
    mustNot: "Admin screens must not call /v1/voice-bridge.",
    published: "Admin qualification routes; voice-bridge stubs still 501 / not configured",
  },
] as const;

export function handoff(id: Phase4HandoffId): Phase4Handoff {
  const found = PHASE4_HANDOFFS.find((entry) => entry.id === id);
  if (!found) throw new Error(`Unknown Phase 4 handoff ${id}`);
  return found;
}

export type UnpublishedStaffLoad = {
  readonly ok: false;
  readonly handoff: Phase4HandoffId;
  readonly message: string;
};

export function unpublishedStaffMessage(id: Phase4HandoffId): string {
  const item = handoff(id);
  return (
    `${item.need} OpenAPI ${PHASE4_OPENAPI} on backend ${PHASE4_BACKEND_REF} does not `
    + `publish this staff lead read yet (${item.id}). Sample records are not shown in their place. `
    + `Qualification runs are on /admin/voice and /admin/whatsapp — a run is not a lead.`
  );
}

export function unpublishedStaffLoad(id: Phase4HandoffId): UnpublishedStaffLoad {
  return { ok: false, handoff: id, message: unpublishedStaffMessage(id) };
}

export const PHASE4_HONESTY = [
  "Question definitions and qualification-level mapping are different.",
  "Do not assign Levels 1–10 from answer counts or model guesses.",
  "Show “mapping not configured” where the backend says so.",
  "modelReportedIntent is model output, not a verified level.",
  "marketplaceConsent stays unchanged on these records.",
  "A run is not a lead.",
  "Queued messages are not delivery.",
  "providerVerified false is not a live call or delivered message.",
  "Synthetic questions must stay visibly SYNTHETIC.",
] as const;

export const MAPPING_NOT_CONFIGURED_LABEL = "mapping not configured";
export const INCOMPLETE_QUALIFICATION_LABEL = "Incomplete qualification";
export const HUMAN_REVIEW_LABEL = "Human review";
