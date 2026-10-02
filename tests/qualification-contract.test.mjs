/**
 * Phase 4.b qualification readings and handoff map.
 * Does not call kkl-backend and does not place a call or message.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PHASE4_HANDOFFS,
  PHASE4_HONESTY,
  PHASE4_OPENAPI,
  VOICE_BRIDGE_STUBS,
  unpublishedStaffLoad,
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
} from "../src/lib/services/backend/qualification-reading.ts";
import { SYNTHETIC_QUESTION_SET } from "../src/lib/services/backend/qualification-synthetic.ts";
import { MAPPING_NOT_CONFIGURED_LABEL } from "../src/lib/domain/commerce-display.ts";

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
  providerDispatch: null,
};

test("OpenAPI phase4.b handoffs mark H4-3…H4-7 verified and leads still open", () => {
  assert.equal(PHASE4_OPENAPI, "1.0.0-phase4.b");
  const byId = Object.fromEntries(PHASE4_HANDOFFS.map((h) => [h.id, h]));
  assert.equal(byId["H4-1"].status, "open");
  assert.equal(byId["H4-2"].status, "partial");
  assert.equal(byId["H4-3"].status, "verified");
  assert.equal(byId["H4-4"].status, "verified");
  assert.equal(byId["H4-5"].status, "verified");
  assert.equal(byId["H4-6"].status, "verified");
  assert.equal(byId["H4-7"].status, "verified");
  assert.equal(byId["H4-8"].status, "partial");
  assert.ok(VOICE_BRIDGE_STUBS.length === 5);
});

test("a run keeps level unset and intent labelled as model output", () => {
  const run = readQualificationRun(sampleRun);
  assert.ok(run);
  assert.equal(run.qualification.level, null);
  assert.equal(run.qualification.marketplaceConsent, "unchanged");
  assert.equal(run.qualification.modelReportedIntentIsNotALevel, true);
  assert.equal(run.providerVerified, false);
  assert.equal(run.questionSet.synthetic, true);
  assert.equal(run.transcript.length, 1);
  assert.equal(levelDisplay(run.qualification), MAPPING_NOT_CONFIGURED_LABEL);
  assert.match(intentDisplay(run.qualification), /not a qualification level/);
  assert.match(providerStatusLabel("not_configured", false), /not called/i);
  assert.match(providerStatusLabel("queued", false), /not delivered/i);
});

test("run list marks inventory false", () => {
  const page = readQualificationRunPage({
    runs: [sampleRun],
    inventory: false,
    leadInventoryPath: "/v1/leads?eligible=false",
  });
  assert.ok(page);
  assert.equal(page.inventory, false);
  assert.equal(page.leadInventoryPath, "/v1/leads?eligible=false");
  assert.equal(page.runs[0].qualification.level, null);
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

test("calling window and opt-out GETs distinguish null from values", () => {
  const emptyWindow = readCallingWindowResponse({ callingWindow: null });
  assert.equal(emptyWindow.ok, true);
  if (emptyWindow.ok) assert.equal(emptyWindow.window, null);
  const savedWindow = readCallingWindowResponse({
    callingWindow: { timeZone: "Asia/Kolkata", start: "00:00", end: "23:59" },
  });
  assert.equal(savedWindow.ok, true);
  if (savedWindow.ok) assert.equal(savedWindow.window?.start, "00:00");
  const emptyOpt = readOptOutResponse({ optOut: null });
  assert.equal(emptyOpt.ok, true);
  if (emptyOpt.ok) assert.equal(emptyOpt.signals, null);
  const savedOpt = readOptOutResponse({ optOut: { dtmf: "9", keywords: ["stop"] } });
  assert.equal(savedOpt.ok, true);
  if (savedOpt.ok) assert.deepEqual(savedOpt.signals?.keywords, ["stop"]);
});

test("retry batch stays providerVerified false", () => {
  const batch = readRetryBatch({ retried: ["11111111-1111-1111-1111-111111111111"], providerVerified: false });
  assert.ok(batch);
  assert.equal(batch.providerVerified, false);
  assert.equal(batch.retried.length, 1);
});

test("lead inventory handoff still refuses with H4-1", () => {
  const loaded = unpublishedStaffLoad("H4-1");
  assert.equal(loaded.ok, false);
  assert.equal(loaded.handoff, "H4-1");
  assert.match(loaded.message, /run is not a lead/i);
  assert.ok(PHASE4_HONESTY.some((line) => /modelReportedIntent/.test(line)));
});
