/**
 * Purchase confirmation against an applied pricing version.
 * These are pure functions. They are not rows in kkl_review.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  nextPurchaseIdempotencyKey,
  priceChangedMessage,
  purchaseExpectedFields,
  readPriceChangedQuote,
} from "../src/lib/domain/commerce-display.ts";

const quoteBody = (quote) => ({
  code: "price_changed",
  error: "Review the price and pricing version now on that lead. Nothing was charged.",
  quote,
});

test("a versioned purchase sends the displayed amount and version together", () => {
  assert.deepEqual(purchaseExpectedFields({
    expectedPriceCredits: 2700,
    expectedConfigurationVersion: 3,
  }), {
    expectedPriceCredits: 2700,
    expectedConfigurationVersion: 3,
  });
});

test("a lead with no applied version omits both expected fields", () => {
  assert.equal(purchaseExpectedFields({
    expectedPriceCredits: 2700,
    expectedConfigurationVersion: null,
  }), null);
});

test("a version without a positive price is not sent", () => {
  assert.equal(purchaseExpectedFields({
    expectedPriceCredits: 0,
    expectedConfigurationVersion: 3,
  }), null);
});

test("a price_changed quote is readable only when amount and version are present", () => {
  const quote = readPriceChangedQuote(quoteBody({
    leadId: "lead-1",
    priceCredits: 2700,
    expectedPriceCredits: 2500,
    configurationId: "config-1",
    configurationVersion: 4,
    expectedConfigurationVersion: 3,
  }));
  assert.deepEqual(quote, {
    leadId: "lead-1",
    priceCredits: 2700,
    configurationId: "config-1",
    configurationVersion: 4,
  });
  assert.equal(readPriceChangedQuote(quoteBody({
    leadId: "lead-1",
    priceCredits: 2700,
    configurationId: "config-1",
    configurationVersion: null,
  })), null);
  assert.equal(readPriceChangedQuote({ code: "price_changed" }), null);
  assert.equal(readPriceChangedQuote({
    code: "deduction_failed",
    quote: { leadId: "lead-1", priceCredits: 2700, configurationId: null, configurationVersion: 1 },
  }), null);
});

test("the same numeric price with a new version is still a changed quote", () => {
  const message = priceChangedMessage({
    shownCredits: 2700,
    shownVersion: 3,
    priceCredits: 2700,
    configurationVersion: 4,
  });
  assert.match(message, /still 2,700 credits/);
  assert.match(message, /now version 4/);
  assert.match(message, /Nothing was charged/);
});

test("a changed quote takes a new idempotency key and a retry of that quote keeps it", () => {
  let minted = 0;
  const mint = () => {
    minted += 1;
    return "new-key";
  };
  const changed = nextPurchaseIdempotencyKey({
    previousKey: "first-key",
    sentCredits: 2700,
    sentVersion: 3,
    quoteCredits: 2700,
    quoteVersion: 4,
    mint,
  });
  assert.equal(changed, "new-key");
  const retry = nextPurchaseIdempotencyKey({
    previousKey: changed,
    sentCredits: 2700,
    sentVersion: 4,
    quoteCredits: 2700,
    quoteVersion: 4,
    mint,
  });
  assert.equal(retry, "new-key");
  assert.equal(minted, 1);
});
