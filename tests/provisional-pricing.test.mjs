/**
 * Provisional pricing request bodies and readings.
 * These are not rows in kkl_review, and they are not purchase prices.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PROVISIONAL_BANNER,
  blankPricingDraft,
  creditsExplanation,
  draftFromForm,
  exactCalculationText,
  localSaveError,
  previewBodyStaysInsideContract,
  previewFromForm,
  pricingConfigurationBody,
  pricingFailure,
  readConfiguration,
  readOverview,
  readPreview,
  roundingDemonstrationText,
  saveBodyStaysInsideContract,
} from "../src/lib/services/backend/provisional-pricing-reading.ts";

function form(entries) {
  const data = new FormData();
  for (const [name, value] of entries) data.append(name, value);
  return data;
}

const savedDraft = {
  note: "Synthetic review matrix",
  bands: [
    { label: "Mid", minInr: "0.00", maxInr: "7500000.00", basePriceInr: "1500.00" },
    { label: "Open", minInr: "7500000.00", maxInr: "", basePriceInr: "2500.50" },
  ],
  levels: [
    { level: "1", multiplier: "1.35" },
    { level: "2", multiplier: "27/20" },
  ],
  questions: [{ prompt: "Is the budget the prospect's own figure?" }],
};

test("the provisional banner is the purchase warning", () => {
  assert.equal(PROVISIONAL_BANNER, "Provisional — not used for purchases");
  const blank = JSON.stringify(blankPricingDraft());
  assert.equal(blank.includes("1500"), false);
  assert.equal(blank.includes("5000000"), false);
});

test("a save body keeps money as strings and omits a question level", () => {
  const body = pricingConfigurationBody(savedDraft);
  assert.equal(saveBodyStaysInsideContract(body), true);
  assert.equal(body.bands[1].maxInr, null);
  assert.equal(typeof body.bands[0].minInr, "string");
  assert.equal(typeof body.bands[0].basePriceInr, "string");
  assert.equal(body.levels[0].multiplier, "1.35");
  assert.deepEqual(body.levels[1].multiplier, { numerator: 27, denominator: 20 });
  assert.deepEqual(body.questions, [
    { position: 1, prompt: "Is the budget the prospect's own figure?" },
  ]);
  const encoded = JSON.stringify(body);
  assert.equal(encoded.includes('"minInr":"0.00"'), true);
  assert.equal(encoded.includes('"basePriceInr":1500'), false);
  assert.equal(encoded.includes('"multiplier":1.35'), false);
  assert.equal(encoded.includes("activate"), false);
  assert.equal(encoded.includes("qualificationLevel"), false);
  assert.equal(encoded.includes("reprice"), false);
  assert.equal(encoded.includes("credits"), false);
  for (const question of body.questions) {
    assert.equal("level" in question, false);
  }
});

test("an empty question list is omitted and a blank band row is dropped", () => {
  const draft = draftFromForm(form([
    ["bandLabel", "Only"],
    ["bandMin", "0.00"],
    ["bandMax", ""],
    ["bandBase", "1500.00"],
    ["bandLabel", ""],
    ["bandMin", ""],
    ["bandMax", ""],
    ["bandBase", ""],
    ["levelNumber", "1"],
    ["levelMultiplier", "1.00"],
    ["questionPrompt", ""],
    ["note", ""],
  ]));
  const body = pricingConfigurationBody(draft);
  assert.equal(body.bands.length, 1);
  assert.equal(body.bands[0].maxInr, null);
  assert.equal("questions" in body, false);
  assert.equal("note" in body, false);
  assert.equal(localSaveError(draft), null);
});

test("a bad amount is refused before a request is built", () => {
  const draft = {
    ...savedDraft,
    bands: [{ label: "Mid", minInr: "0.00", maxInr: "", basePriceInr: "fifteen hundred" }],
    levels: [{ level: "1", multiplier: "1.35" }],
    questions: [],
  };
  const problem = localSaveError(draft);
  assert.equal(problem.field, "bands");
  assert.match(problem.error, /two decimal places/);
});

test("an exact preview sends the supplied level and no demonstration", () => {
  const parsed = previewFromForm(form([
    ["budgetInr", "7500000.00"],
    ["qualificationLevel", "1"],
    ["configurationId", "11111111-1111-1111-1111-111111111111"],
    ["demonstrateRounding", "false"],
  ]));
  assert.equal("body" in parsed, true);
  assert.equal(previewBodyStaysInsideContract(parsed.body), true);
  assert.equal(parsed.body.budgetSource, "prospect_stated");
  assert.equal(typeof parsed.body.budgetInr, "string");
  assert.equal(parsed.body.qualificationLevel, 1);
  assert.equal("rounding" in parsed.body, false);
  assert.equal("answeredQuestionIds" in parsed.body, false);
  assert.equal("facts" in parsed.body, false);
  assert.equal("filters" in parsed.body, false);
  assert.equal(JSON.stringify(parsed.body).includes('"budgetInr":"7500000.00"'), true);
});

test("nearest-rupee-100 is sent only as an unconfirmed demonstration", () => {
  const parsed = previewFromForm(form([
    ["budgetInr", "7500000.00"],
    ["qualificationLevel", "1"],
    ["demonstrateRounding", "false"],
    ["demonstrateRounding", "true"],
  ]));
  assert.equal(parsed.body.rounding, "nearest_100_inr");
  assert.match(
    roundingDemonstrationText({
      requested: "nearest_100_inr",
      demonstratedInr: "2000.00",
      rule: "spreadsheet ROUND half away from zero, to the nearest 100 rupees. Demonstrated, not confirmed.",
    }),
    /Demonstrated nearest ₹100: ₹2,000\.00\. This demonstration is not confirmed/,
  );
  assert.match(
    roundingDemonstrationText({ requested: null, demonstratedInr: null, rule: null }),
    /No rounding demonstration was requested/,
  );
});

test("the exact amount stays exact when it is not a whole number of paise", () => {
  assert.match(
    exactCalculationText({
      inr: "2025.00",
      paiseNumerator: "202500",
      paiseDenominator: "1",
      paiseRemainder: "0",
    }),
    /Exact calculation ₹2,025\.00/,
  );
  const fraction = exactCalculationText({
    inr: null,
    paiseNumerator: "10",
    paiseDenominator: "3",
    paiseRemainder: "1",
  });
  assert.match(fraction, /10\/3 paise, remainder 1/);
  assert.equal(fraction.includes("₹"), false);
  assert.match(creditsExplanation(2025, null), /2,025 credits/);
  assert.match(creditsExplanation(2025, null), /cannot be bought/);
  assert.match(creditsExplanation(null, "not_a_whole_rupee"), /No credit figure is stated/);
  assert.match(creditsExplanation(null, "not_a_whole_rupee"), /cannot be bought/);
});

test("a failed response does not become a configuration or a preview", () => {
  const failed = pricingFailure(422, {
    error: 'The band "Open" overlaps "Mid".',
    code: "budget_bands_overlap",
    field: "bands",
  });
  assert.equal(failed.ok, false);
  assert.equal(failed.configuration, null);
  assert.equal(failed.preview, null);
  assert.equal(failed.error, 'The band "Open" overlaps "Mid".');
  assert.equal(readConfiguration({ ...configurationBody(), purchasable: true }), null);
  assert.equal(readConfiguration({ ...configurationBody(), questionMapping: "configured" }), null);
  assert.equal(readPreview({ ...previewBody(), purchasable: true }), null);
  assert.equal(readPreview({ ...previewBody(), levelSource: "inferred" }), null);
  assert.equal(readPreview({ ...previewBody(), questionMapping: "mapped" }), null);
  assert.equal(readPreview({
    ...previewBody(),
    rounding: { requested: "nearest_100_inr", confirmed: true, demonstratedInr: "2000.00", rule: "confirmed" },
  }), null);
});

test("a provisional payload shows the returned assumption and keeps the figures apart", () => {
  const configuration = readConfiguration(configurationBody());
  assert.equal(configuration.purchasable, false);
  assert.equal(configuration.questionMapping, "not_configured");
  assert.equal(configuration.unconfirmed.length, 1);
  assert.match(configuration.unconfirmed[0].summary, /supplied, not inferred/);
  const preview = readPreview(previewBody());
  assert.equal(preview.purchasable, false);
  assert.match(preview.levelStatement, /supplied for this preview/);
  assert.match(preview.levelStatement, /not an AI qualification/);
  assert.match(preview.exactText, /₹2,025\.00/);
  assert.match(preview.roundingText, /No rounding demonstration was requested/);
  assert.equal(preview.roundingText.includes("2,000"), false);
  const overview = readOverview({
    configuration: configurationBody(),
    versions: 1,
    purchase: {
      purchaseUsesFramework: false,
      code: "lead_price_not_configured",
      message: "That preview is not a purchase price.",
    },
  });
  assert.equal(overview.purchaseUsesFramework, false);
  assert.equal(readOverview({
    configuration: null,
    versions: 0,
    purchase: { purchaseUsesFramework: true, code: "lead_price_not_configured", message: "Ready." },
  }), null);
});

function configurationBody() {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    version: 1,
    status: "provisional",
    boundaryConvention: "min_inclusive_max_exclusive",
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
    levels: [{ level: 1, multiplier: { numerator: 135, denominator: 100, text: "1.35" } }],
    questions: [],
    questionMapping: "not_configured",
    gaps: [],
    purchasable: false,
    unconfirmed: [{
      id: "question_mapping",
      summary: "No question-to-level mapping is confirmed. The level in a preview is supplied, not inferred.",
    }],
  };
}

function previewBody() {
  return {
    calculationId: "33333333-3333-3333-3333-333333333333",
    configurationId: "11111111-1111-1111-1111-111111111111",
    configurationVersion: 1,
    configurationStatus: "provisional",
    purchasable: false,
    credits: 2025,
    creditUnit: { requirement: "R-CR-01", inrPerCredit: "1", confirmed: true },
    purchase: {
      purchaseUsesFramework: false,
      code: "lead_price_not_configured",
      message: "That preview is not a purchase price.",
    },
    budgetInr: "7500000.00",
    basePriceInr: "1500.00",
    qualificationLevel: 1,
    levelSource: "supplied",
    questionMapping: "not_configured",
    multiplier: { numerator: 135, denominator: 100, text: "1.35" },
    exact: { paiseNumerator: "202500", paiseDenominator: "1", inr: "2025.00", paiseRemainder: "0" },
    rounding: { requested: null, confirmed: false, demonstratedInr: null, rule: null },
    message: "This preview uses the recorded provisional configuration. It has not been written onto a lead and it cannot be bought.",
  };
}
