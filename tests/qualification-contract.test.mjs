/**
 * Phase 4.c qualification readings and handoff map.
 * Does not call kkl-backend and does not place a call or message.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PHASE4_HANDOFFS,
  PHASE4_HONESTY,
  PHASE4_OPENAPI,
  PHASE4_BACKEND_REF,
  VOICE_BRIDGE_STUBS,
} from "../src/lib/services/backend/qualification-contract.ts";
import {
  intentDisplay,
  levelDisplay,
  providerStatusLabel,
  readCallingWindowResponse,
  readOptOutResponse,
  readQualificationRun,
  readQualificationRunPage,
  readQuestionSetPage,
  readRetryBatch,
  readStaffLeadDetail,
  readStaffLeadPage,
  runUiPath,
} from "../src/lib/services/backend/qualification-reading.ts";
import { SYNTHETIC_QUESTION_SET } from "../src/lib/services/backend/qualification-synthetic.ts";
import { MAPPING_NOT_CONFIGURED_LABEL } from "../src/lib/domain/commerce-display.ts";

const sampleCapabilities = {
  resume: { allowed: true, dispatchesProvider: false, reason: null },
  retry: { allowed: true, dispatchesProvider: false, reason: "exotel_not_configured" },
};

const sampleRun = {
  id: "11111111-1111-1111-1111-111111111111",
  reference: "QUAL-abcd",
  leadId: "22222222-2222-2222-2222-222222222222",
  channel: "voice",
  state: "incomplete",
  reviewStatus: "pending",
  failureReason: null,
  interruptionCount: 0,
  questionSet: {
    id: "33333333-3333-3333-3333-333333333333",
    versionLabel: "synthetic-a",
    provenance: "synthetic_test",
    synthetic: true,
  },
  nextQuestion: null,
  answers: [{
    id: "44444444-4444-4444-4444-444444444444",
    questionKey: "synthetic_interest",
    status: "answered",
    value: "fixture",
    rawText: "fixture",
    source: "voice",
    sourceEventId: null,
    recordedAt: "2026-10-02T12:00:00.000Z",
    superseded: false,
  }],
  calls: [{
    id: "55555555-5555-5555-5555-555555555555",
    status: "not_configured",
    failureReason: null,
    providerVerified: false,
    attempts: 1,
    nextAttemptAt: null,
  }],
  messages: [],
  consentEvidence: [],
  reviews: [],
  transcript: [{ speaker: "agent", sequence: 1, text: "SYNTHETIC hello", at: "2026-10-02T12:00:01.000Z" }],
  modelSummary: "Synthetic summary only.",
  qualification: {
    level: null,
    pricingApplied: false,
    consentApplied: false,
    marketplaceConsent: "unchanged",
    reason: "question_to_level_mapping_not_confirmed",
    modelReportedIntent: 42,
    modelReportedIntentIsNotALevel: true,
  },
  suppressed: false,
  phoneMasked: "+91 98•• ••••01",
  startedAt: "2026-10-02T12:00:00.000Z",
  updatedAt: "2026-10-02T12:05:00.000Z",
  completedAt: null,
  providerVerified: false,
  providerDispatch: {
    attempted: true,
    dispatched: false,
    providerVerified: false,
    reason: "exotel_not_configured",
    synthetic: true,
  },
  capabilities: sampleCapabilities,
  effect: "adapter_invoked",
};

test("OpenAPI phase4.c handoffs mark H4-1/H4-2 wired; H4-7 partial for mutations", () => {
  assert.equal(PHASE4_OPENAPI, "1.0.0-phase4.c");
  assert.equal(PHASE4_BACKEND_REF, "e7ffdb6");
  const byId = Object.fromEntries(PHASE4_HANDOFFS.map((h) => [h.id, h]));
  assert.equal(byId["H4-1"].status, "wired");
  assert.equal(byId["H4-2"].status, "wired");
  assert.equal(byId["H4-3"].status, "verified");
  assert.equal(byId["H4-4"].status, "verified");
  assert.equal(byId["H4-5"].status, "verified");
  assert.equal(byId["H4-6"].status, "verified");
  assert.equal(byId["H4-7"].status, "partial");
  assert.equal(byId["H4-8"].status, "partial");
  assert.match(byId["H4-1"].published ?? "", /admin\/qualification\/leads/);
  assert.ok(VOICE_BRIDGE_STUBS.length === 5);
});

test("a run keeps level unset and surfaces effect/capabilities", () => {
  const run = readQualificationRun(sampleRun);
  assert.ok(run);
  assert.equal(run.qualification.level, null);
  assert.equal(run.qualification.marketplaceConsent, "unchanged");
  assert.equal(run.qualification.modelReportedIntentIsNotALevel, true);
  assert.equal(run.providerVerified, false);
  assert.equal(run.questionSet.synthetic, true);
  assert.equal(run.transcript.length, 1);
  assert.equal(run.effect, "adapter_invoked");
  assert.equal(run.providerDispatch?.dispatched, false);
  assert.equal(run.capabilities?.resume.allowed, true);
  assert.equal(run.capabilities?.resume.dispatchesProvider, false);
  assert.equal(run.capabilities?.retry.dispatchesProvider, false);
  assert.equal(levelDisplay(run.qualification), MAPPING_NOT_CONFIGURED_LABEL);
  assert.match(intentDisplay(run.qualification), /not a qualification level/);
  assert.match(providerStatusLabel("not_configured", false), /not called/i);
  assert.match(providerStatusLabel("queued", false), /not delivered/i);
});

test("run list marks inventory false and points at staff lead inventory", () => {
  const page = readQualificationRunPage({
    runs: [sampleRun],
    inventory: false,
    leadInventoryPath: "/v1/admin/qualification/leads",
  });
  assert.ok(page);
  assert.equal(page.inventory, false);
  assert.equal(page.leadInventoryPath, "/v1/admin/qualification/leads");
  assert.equal(page.runs[0].qualification.level, null);
});

test("staff lead page requires inventory true and audience staff", () => {
  const page = readStaffLeadPage({
    inventory: true,
    audience: "staff",
    marketplacePath: "/v1/leads",
    note: "Operational inventory",
    total: 1,
    offset: 0,
    limit: 20,
    leads: [{
      id: "22222222-2222-2222-2222-222222222222",
      reference: "LEAD-1",
      status: "qualifying",
      locationId: null,
      locationName: "Koramangala",
      consentStatus: "pending",
      contact: { state: "masked", label: "Masked contact" },
      runCount: 1,
      latestRun: {
        id: "11111111-1111-1111-1111-111111111111",
        reference: "QUAL-abcd",
        channel: "voice",
        state: "incomplete",
        reviewStatus: "pending",
        path: "/v1/admin/qualification/runs/11111111-1111-1111-1111-111111111111",
      },
    }],
  });
  assert.ok(page);
  assert.equal(page.inventory, true);
  assert.equal(page.audience, "staff");
  assert.equal(page.leads[0].latestRun?.path.includes("/runs/"), true);
  assert.equal(
    runUiPath(page.leads[0].latestRun.path),
    "/admin/voice/11111111-1111-1111-1111-111111111111",
  );
  assert.equal(readStaffLeadPage({ inventory: false, audience: "staff", total: 0, offset: 0, limit: 20, leads: [] }), null);
});

test("staff lead detail carries run capabilities and level unset", () => {
  const lead = readStaffLeadDetail({
    id: "22222222-2222-2222-2222-222222222222",
    reference: "LEAD-1",
    status: "qualifying",
    locationId: null,
    locationName: "Koramangala",
    propertyType: "apartment",
    budgetBand: null,
    configurations: ["2BHK"],
    timing: null,
    summary: "Synthetic summary",
    consentStatus: "pending",
    priceCredits: null,
    contact: { state: "masked", label: "Masked contact" },
    suppressed: false,
    qualification: {
      level: null,
      marketplaceConsent: "unchanged",
      reason: "question_to_level_mapping_not_confirmed",
      modelReportedIntent: null,
    },
    runs: [{
      id: "11111111-1111-1111-1111-111111111111",
      reference: "QUAL-abcd",
      channel: "voice",
      state: "incomplete",
      reviewStatus: "pending",
      failureReason: null,
      path: "/v1/admin/qualification/runs/11111111-1111-1111-1111-111111111111",
      capabilities: sampleCapabilities,
    }],
  });
  assert.ok(lead);
  assert.equal(lead.qualification.level, null);
  assert.equal(lead.runs[0].capabilities?.resume.dispatchesProvider, false);
});

test("question sets mark synthetic provenance", () => {
  const page = readQuestionSetPage({
    questionSets: [{
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      versionLabel: "synthetic-a",
      provenance: "synthetic_test",
      status: "active",
      questions: 4,
      synthetic: true,
      createdAt: "2026-10-02T12:00:00.000Z",
    }],
  });
  assert.ok(page);
  assert.equal(page.questionSets[0].synthetic, true);
  assert.ok(SYNTHETIC_QUESTION_SET.questions.every((q) => q.prompt.includes("SYNTHETIC")));
  assert.ok(SYNTHETIC_QUESTION_SET.questions.every((q) => !("qualificationLevel" in q)));
});

test("calling window and opt-out distinguish unset from staff_saved", () => {
  const emptyWindow = readCallingWindowResponse({
    configured: false,
    provenance: "unset",
    setAt: null,
    callingWindow: null,
  });
  assert.equal(emptyWindow.ok, true);
  if (emptyWindow.ok) {
    assert.equal(emptyWindow.config.configured, false);
    assert.equal(emptyWindow.config.provenance, "unset");
    assert.equal(emptyWindow.config.window, null);
  }
  const savedWindow = readCallingWindowResponse({
    configured: true,
    provenance: "staff_saved",
    setAt: "2026-10-02T12:00:00.000Z",
    callingWindow: { timeZone: "Asia/Kolkata", start: "00:00", end: "23:59" },
  });
  assert.equal(savedWindow.ok, true);
  if (savedWindow.ok) {
    assert.equal(savedWindow.config.configured, true);
    assert.equal(savedWindow.config.provenance, "staff_saved");
    assert.equal(savedWindow.config.window?.start, "00:00");
  }
  const emptyOpt = readOptOutResponse({
    configured: false,
    provenance: "unset",
    setAt: null,
    optOut: null,
  });
  assert.equal(emptyOpt.ok, true);
  if (emptyOpt.ok) {
    assert.equal(emptyOpt.config.configured, false);
    assert.equal(emptyOpt.config.signals, null);
  }
  const savedOpt = readOptOutResponse({
    configured: true,
    provenance: "staff_saved",
    setAt: "2026-10-02T12:00:00.000Z",
    optOut: { dtmf: "9", keywords: ["stop"] },
  });
  assert.equal(savedOpt.ok, true);
  if (savedOpt.ok) {
    assert.equal(savedOpt.config.provenance, "staff_saved");
    assert.deepEqual(savedOpt.config.signals?.keywords, ["stop"]);
  }
  assert.ok(PHASE4_HONESTY.some((line) => /configured: false/.test(line)));
  assert.ok(PHASE4_HONESTY.some((line) => /staff_saved/.test(line)));
});

test("retry batch stays providerVerified false", () => {
  const batch = readRetryBatch({ retried: ["11111111-1111-1111-1111-111111111111"], providerVerified: false });
  assert.ok(batch);
  assert.equal(batch.providerVerified, false);
  assert.equal(batch.retried.length, 1);
});
