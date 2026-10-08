/**
 * Phase 5 frontend guards that do not need a browser.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { assertSingleBackendOrigin, locationBackendConfig, authBackendBaseUrl } from "../src/lib/services/backend/config.ts";
import { agingDiscountSentence, customerOrderStatus, readWalletReconciliation } from "../src/lib/domain/commerce-display.ts";

const ORIGIN_VARS = [
  "KKL_BACKEND_BASE_URL",
  "KKL_LEAD_REQUESTS_BASE_URL",
  "KKL_LOCATIONS_BASE_URL",
];

function withOrigins(values, fn) {
  const previous = new Map(ORIGIN_VARS.map((name) => [name, process.env[name]]));
  for (const name of ORIGIN_VARS) delete process.env[name];
  Object.assign(process.env, values);
  try {
    return fn();
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

test("one Phase 5 origin is accepted", () => {
  withOrigins({
    KKL_BACKEND_BASE_URL: "http://127.0.0.1:4012",
    KKL_LEAD_REQUESTS_BASE_URL: "http://127.0.0.1:4012/",
  }, () => {
    assert.doesNotThrow(() => assertSingleBackendOrigin());
  });
});

test("staging's single documented URL serves locations and authentication", () => {
  withOrigins({ KKL_BACKEND_BASE_URL: "https://backend.example/" }, () => {
    assert.equal(locationBackendConfig().baseUrl, "https://backend.example");
    assert.equal(authBackendBaseUrl(), "https://backend.example");
  });
});

test("legacy locations URL still works but missing or conflicting URLs refuse", () => {
  withOrigins({ KKL_LOCATIONS_BASE_URL: "https://backend.example/" }, () => {
    assert.equal(locationBackendConfig().baseUrl, "https://backend.example");
  });
  withOrigins({}, () => assert.throws(() => locationBackendConfig(), /requires KKL_BACKEND_BASE_URL/));
  withOrigins({ KKL_BACKEND_BASE_URL: "https://one.example", KKL_LOCATIONS_BASE_URL: "https://two.example" }, () => {
    assert.throws(() => locationBackendConfig(), /more than one origin/);
  });
});

test("two API origins are refused", () => {
  withOrigins({
    KKL_BACKEND_BASE_URL: "http://127.0.0.1:4012",
    KKL_LOCATIONS_BASE_URL: "http://127.0.0.1:4010",
  }, () => {
    assert.throws(() => assertSingleBackendOrigin(), /more than one origin/);
  });
});

test("wallet reconciliation keeps the service fields", () => {
  const row = readWalletReconciliation({
    accountId: "d6832d2e-1321-44cb-8e56-1bd2d4f7772b",
    balanceCredits: 0,
    ledgerSumCredits: 0,
    entryCount: 0,
    balanced: true,
  });
  assert.equal(row?.balanced, true);
  assert.equal(row?.entryCount, 0);
  assert.equal(readWalletReconciliation({ balanced: "yes" }), null);
});

test("a pending order stays pending and is not a failed charge", () => {
  assert.equal(customerOrderStatus("pending"), "pending");
  assert.equal(customerOrderStatus("completed"), "paid");
  assert.equal(customerOrderStatus("cancelled"), "cancelled");
  assert.equal(customerOrderStatus("failed"), "failed");
  assert.notEqual(customerOrderStatus("pending"), "failed");
  assert.notEqual(customerOrderStatus("pending"), "paid");
});

test("a backend marketplace does not describe a 20% charge", () => {
  assert.match(agingDiscountSentence(false), /not applied/);
  assert.doesNotMatch(agingDiscountSentence(false), /shown on the Sale tab is 20%/);
});
