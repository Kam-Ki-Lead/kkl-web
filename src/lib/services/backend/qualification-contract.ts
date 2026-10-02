/**
 * Phase 4 qualification contracts as published against OpenAPI
 * `1.0.0-phase3.t` (backend `a6d6d4d` on `claude/phase-3-backend`).
 *
 * This module does not invent staff read paths. Voice-bridge routes are
 * published as `501 not_implemented` stubs for kkl-voice → kkl-backend.
 * They are not Admin screens and must not be called from kkl-web to fill
 * A-24 / A-25. Marketplace `GET /v1/leads` is Seller/Builder only and
 * carries no call transcript, WhatsApp thread or question-to-level map.
 */

export const PHASE4_OPENAPI = "1.0.0-phase3.t" as const;
export const PHASE4_BACKEND_REF = "a6d6d4d" as const;

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

/**
 * Domains already connected on other switches. Phase 4 must not duplicate
 * those Admin screens or invent a second copy of the same records.
 */
export const PHASE4_ALREADY_CONNECTED = [
  {
    screens: ["A-10", "A-11"],
    switch: "KKL_INTAKE",
    paths: [
      "GET /v1/leads/intake/batches",
      "GET /v1/leads/intake/batches/{batchRef}",
    ],
    note: "Intake volumes and rejections. Not a qualification call.",
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
  {
    screens: ["A-14", "A-15-questions"],
    switch: "KKL_ADMIN_OPERATIONS",
    paths: [
      "GET /v1/admin/pricing",
      "GET /v1/admin/pricing/configurations",
      "GET /v1/admin/pricing/configurations/{id}",
    ],
    note: "Pricing question prompts are definitions. questionMapping is not_configured.",
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

export type Phase4Handoff = {
  readonly id: Phase4HandoffId;
  readonly screens: readonly string[];
  readonly need: string;
  readonly mustNot: string;
};

/**
 * Exact staff contracts Phase 4 Admin screens need. Until these are published
 * with request/response schemas, adapters refuse rather than guess.
 */
export const PHASE4_HANDOFFS: readonly Phase4Handoff[] = [
  {
    id: "H4-1",
    screens: ["A-12"],
    need:
      "Staff-paged lead inventory with lifecycle status (including incomplete "
      + "qualification and human-review), consent status, source, age, and "
      + "stable lead references. Must authorise staff sessions.",
    mustNot:
      "Do not reuse Seller/Builder GET /v1/leads as the Admin inventory. "
      + "Do not invent Levels 1–10 from answer counts.",
  },
  {
    id: "H4-2",
    screens: ["A-13"],
    need:
      "Staff lead detail: captured Q&A with question version references, "
      + "consent evidence pointer, eligibility lines, incomplete and "
      + "human-review states, and links to call/conversation ids when present. "
      + "Contact details remain absent.",
    mustNot:
      "Do not treat a generated summary as verified facts. Do not assign a "
      + "qualification level when questionMapping is not_configured.",
  },
  {
    id: "H4-3",
    screens: ["A-24"],
    need:
      "Staff call list with volumes, outcomes, consent labels, language, "
      + "duration, masked numbers, quiet-hour holds, and pagination. "
      + "Separate from voice-bridge stubs.",
    mustNot:
      "Do not dial, schedule, or call POST /v1/voice-bridge/calls from Admin. "
      + "Do not fill volumes from fixtures when the switch is on.",
  },
  {
    id: "H4-4",
    screens: ["A-25"],
    need:
      "Staff call detail: transcript segments when permitted, captured answers "
      + "with timestamps, summary when available and labelled as generated, "
      + "consent outcome with evidence reference, and an explicit empty "
      + "transcript state.",
    mustNot:
      "Do not offer audio unless retention and access are published. "
      + "Do not equate a summary with verified answers.",
  },
  {
    id: "H4-5",
    screens: ["A-26"],
    need:
      "Staff WhatsApp journey progress and conversation list with per-step "
      + "counts, template/provider status, and delivery states that distinguish "
      + "queued, failed, delivered and completed.",
    mustNot:
      "Do not equate queued with delivered, or conversation completion with "
      + "sale eligibility. Do not start a conversation from Admin.",
  },
  {
    id: "H4-6",
    screens: ["A-15", "pricing questions"],
    need:
      "Qualification question configuration using the backend's actual schema, "
      + "including version identity and an explicit question→level mapping "
      + "state. Pricing prompts already publish questionMapping: not_configured.",
    mustNot:
      "Do not map prompts onto Levels 1–10 in the frontend. Do not treat "
      + "pricing question rows as an approved qualification matrix.",
  },
  {
    id: "H4-7",
    screens: ["A-31"],
    need:
      "Provider failure records and authorised recovery actions for voice and "
      + "WhatsApp (retry, hold, mark reviewed), with role checks. No credential "
      + "fields on the page.",
    mustNot:
      "Do not invent a retry that bypasses suppression or quiet hours. "
      + "Do not initiate a real call or message from recovery UI.",
  },
  {
    id: "H4-8",
    screens: ["kkl-voice"],
    need:
      "Frozen voice-bridge request/response schemas replacing the Phase 3 "
      + "501 stubs, with auth, idempotency and evidence validation for "
      + "consent/outcome writes.",
    mustNot:
      "Admin screens must not call voice-bridge even after it is implemented. "
      + "That boundary stays kkl-voice → kkl-backend.",
  },
] as const;

export function handoff(id: Phase4HandoffId): Phase4Handoff {
  const found = PHASE4_HANDOFFS.find((entry) => entry.id === id);
  if (!found) throw new Error(`Unknown Phase 4 handoff ${id}`);
  return found;
}

/**
 * Sentence shown when KKL_QUALIFICATION=backend and the staff path is still
 * unpublished. Sample fixtures are not substituted.
 */
export function unpublishedStaffMessage(id: Phase4HandoffId): string {
  const item = handoff(id);
  return (
    `${item.need} OpenAPI ${PHASE4_OPENAPI} on backend ${PHASE4_BACKEND_REF} does not `
    + `publish this staff read yet (${item.id}). Sample records are not shown in their place.`
  );
}

/** Fail-closed load result when a staff Phase 4 path is not published. */
export type UnpublishedStaffLoad = {
  readonly ok: false;
  readonly handoff: Phase4HandoffId;
  readonly message: string;
};

export function unpublishedStaffLoad(id: Phase4HandoffId): UnpublishedStaffLoad {
  return { ok: false, handoff: id, message: unpublishedStaffMessage(id) };
}

/** Honesty rules the screens must keep even after contracts arrive. */
export const PHASE4_HONESTY = [
  "Question definitions and qualification-level mapping are different.",
  "Do not assign Levels 1–10 from answer counts or model guesses.",
  "Show “mapping not configured” where the backend says so.",
  "Queued messages are not delivery.",
  "Conversation completion is not sale eligibility.",
  "A generated summary is not verified fact.",
] as const;

export const MAPPING_NOT_CONFIGURED_LABEL = "mapping not configured";
export const INCOMPLETE_QUALIFICATION_LABEL = "Incomplete qualification";
export const HUMAN_REVIEW_LABEL = "Human review";
