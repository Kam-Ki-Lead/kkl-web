/**
 * Phase 4 qualification contract honesty.
 *
 * These tests do not call kkl-backend and do not place a call or message.
 * They lock the unpublished-staff refusals and the mapping / voice-bridge
 * boundaries so a later handoff cannot silently invent Levels or Admin
 * voice-bridge use.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAPPING_NOT_CONFIGURED_LABEL,
  PHASE4_ALREADY_CONNECTED,
  PHASE4_HANDOFFS,
  PHASE4_HONESTY,
  PHASE4_OPENAPI,
  VOICE_BRIDGE_STUBS,
  unpublishedStaffLoad,
  unpublishedStaffMessage,
} from "../src/lib/services/backend/qualification-contract.ts";
import {
  MAPPING_NOT_CONFIGURED_LABEL as DISPLAY_MAPPING_LABEL,
} from "../src/lib/domain/commerce-display.ts";

test("Phase 4 handoffs cover the Admin screens that still need staff contracts", () => {
  assert.equal(PHASE4_OPENAPI, "1.0.0-phase3.t");
  const ids = PHASE4_HANDOFFS.map((h) => h.id);
  assert.deepEqual(ids, ["H4-1", "H4-2", "H4-3", "H4-4", "H4-5", "H4-6", "H4-7", "H4-8"]);
  assert.ok(PHASE4_HANDOFFS.some((h) => h.screens.includes("A-24")));
  assert.ok(PHASE4_HANDOFFS.some((h) => h.screens.includes("A-26")));
  assert.ok(PHASE4_ALREADY_CONNECTED.some((row) => row.switch === "KKL_INTAKE"));
});

test("voice-bridge stubs are listed for kkl-voice, not Admin", () => {
  assert.equal(VOICE_BRIDGE_STUBS.length, 5);
  assert.match(VOICE_BRIDGE_STUBS[0].path, /^\/v1\/voice-bridge\//);
  assert.ok(VOICE_BRIDGE_STUBS.every((stub) => /not implemented/i.test(stub.summary)));
  assert.ok(PHASE4_HANDOFFS.some((h) => h.id === "H4-8" && /Admin screens must not call voice-bridge/.test(h.mustNot)));
});

test("unpublished staff loaders refuse without inventing data", () => {
  /** @type {const} */
  const ids = ["H4-1", "H4-2", "H4-3", "H4-4", "H4-5", "H4-7"];
  for (const id of ids) {
    const loaded = unpublishedStaffLoad(id);
    assert.equal(loaded.ok, false);
    assert.equal(loaded.handoff, id);
    assert.match(loaded.message, new RegExp(id));
    assert.match(loaded.message, /Sample records are not shown/);
  }
});

test("mapping not configured is the shared honesty label", () => {
  assert.equal(MAPPING_NOT_CONFIGURED_LABEL, "mapping not configured");
  assert.equal(DISPLAY_MAPPING_LABEL, MAPPING_NOT_CONFIGURED_LABEL);
  assert.ok(PHASE4_HONESTY.some((line) => /Levels 1–10/.test(line)));
  assert.ok(PHASE4_HONESTY.some((line) => /Queued messages are not delivery/.test(line)));
  assert.match(unpublishedStaffMessage("H4-6"), /H4-6/);
});

test("pricing question rows must not carry a level field in the reader contract", async () => {
  const { readConfiguration } = await import(
    "../src/lib/services/backend/provisional-pricing-reading.ts"
  );
  const base = {
    id: "11111111-1111-1111-1111-111111111111",
    version: 1,
    status: "provisional",
    boundaryConventionConfirmed: false,
    note: null,
    createdAt: "2026-10-02T09:00:00.000Z",
    bands: [{
      id: "22222222-2222-2222-2222-222222222222",
      position: 1,
      label: "Open",
      minInr: "0.00",
      maxInr: null,
      basePriceInr: "1500.00",
    }],
    levels: [{ level: 1, multiplier: { text: "1.35" } }],
    questionMapping: "not_configured",
    gaps: [],
    purchasable: false,
    unconfirmed: [{
      id: "question_mapping",
      summary: "No question-to-level mapping is confirmed.",
    }],
  };

  const withLevel = readConfiguration({
    ...base,
    questions: [{ id: "q1", position: 1, prompt: "Budget?", level: 1 }],
  });
  assert.equal(withLevel, null);

  const ok = readConfiguration({
    ...base,
    questions: [{ id: "q1", position: 1, prompt: "Budget?" }],
  });
  assert.ok(ok);
  assert.equal(ok?.questionMapping, "not_configured");
  assert.equal(ok?.questions.length, 1);
  assert.equal("level" in (ok?.questions[0] ?? {}), false);
});
