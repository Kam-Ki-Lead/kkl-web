/**
 * Readings of the phase 3.k order and intake page shapes, and which
 * identity each adapter uses.
 *
 * These tests do not call kkl-backend and they are not the auth stand-in.
 * The stand-in is scripts/auth-dev-stub.mjs, exercised by
 * scripts/verify-auth-session.mjs.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { IDENTITY } from "../src/lib/services/backend/identity.ts";
import { bearerMode } from "../src/lib/services/backend/config.ts";
import {
  INTAKE_PAGE_SIZE,
  INTAKE_SCREEN_OMISSIONS,
  ORDER_PAGE_SIZE,
  ORDER_SCREEN_OMISSIONS,
  cancellationFailure,
  formatCredits,
  hasNextPage,
  isPastEnd,
  pageOffset,
  pageRangeLabel,
  readIntakeBatch,
  readIntakeBatchPage,
  readRejectedItem,
  readStaffOrder,
  readStaffOrderPage,
} from "../src/lib/services/backend/staff-views.ts";

test("a staff order keeps credits, the buyer and the cancellation fields", () => {
  const page = readStaffOrderPage({
    total: 1,
    offset: 0,
    limit: 100,
    orders: [{
      id: "11111111-1111-1111-1111-111111111111",
      reference: "ORD-3F9A2C71",
      leadReference: "LD-1",
      buyerDisplayName: "Ritwik Sen",
      amountCredits: 1200,
      status: "cancelled",
      failureReason: "Held by mistake",
      cancelledAt: "2026-09-30T10:00:00.000Z",
      cancelledBy: "22222222-2222-2222-2222-222222222222",
      organisation: "Sen Properties",
      amountInr: 1200,
    }],
  });
  assert.equal(page?.orders.length, 1);
  assert.equal(page?.total, 1);
  assert.equal(page?.orders[0].amountCredits, 1200);
  assert.equal(page?.orders[0].buyerDisplayName, "Ritwik Sen");
  assert.equal(page?.orders[0].leadReference, "LD-1");
  assert.equal(page?.orders[0].failureReason, "Held by mistake");
  assert.equal(formatCredits(1200), "1,200 credits");
  assert.equal("organisation" in page.orders[0], false);
  assert.equal("amountInr" in page.orders[0], false);
  assert.equal("events" in page.orders[0], false);
});

test("order detail reads the lead and contact it was given", () => {
  const order = readStaffOrder({
    id: "11111111-1111-1111-1111-111111111111",
    amountCredits: 40,
    status: "completed",
    lead: { reference: "LD-9", summary: "3BHK in New Town", propertyType: "apartment", budgetBand: null, locationName: "New Town" },
    contact: { fullName: "Asha Roy", phone: "+919830011111", email: null },
  });
  assert.equal(order?.buyerDisplayName, null);
  assert.equal(order?.leadReference, null);
  assert.equal(order?.lead?.reference, "LD-9");
  assert.equal(order?.contact?.phone, "+919830011111");
});

test("a dropped row does not shrink the count used for Next", () => {
  const page = readStaffOrderPage({
    total: 3,
    offset: 0,
    limit: 100,
    orders: [
      { id: "11111111-1111-1111-1111-111111111111", status: "pending" },
      { status: "pending" },
    ],
  });
  assert.equal(page?.orders.length, 1);
  assert.equal(page?.returned, 2);
  assert.equal(hasNextPage(page), true);
});

test("a list page without total, offset and limit is not invented", () => {
  assert.equal(readStaffOrderPage({ orders: [{ id: "11111111-1111-1111-1111-111111111111" }] }), null);
  assert.equal(readIntakeBatchPage({ batches: [] }), null);
});

test("next is offered only while this page stops short of the total", () => {
  const first = { total: 5, offset: 0, limit: 2, returned: 2 };
  const last = { total: 5, offset: 4, limit: 2, returned: 1 };
  const past = { total: 5, offset: 10, limit: 2, returned: 0 };
  const empty = { total: 0, offset: 0, limit: 2, returned: 0 };
  assert.equal(hasNextPage(first), true);
  assert.equal(hasNextPage(last), false);
  assert.equal(hasNextPage(past), false);
  assert.equal(hasNextPage(empty), false);
  assert.equal(isPastEnd(past), true);
  assert.equal(isPastEnd(empty), false);
  assert.equal(isPastEnd(first), false);
  assert.equal(pageRangeLabel(first, "orders"), "1–2 of 5 orders");
  assert.equal(pageRangeLabel(past, "orders"), "None of 5 orders are on this page");
  assert.equal(pageRangeLabel(empty, "batches"), "0 batches");
  assert.equal(pageOffset("40"), 40);
  assert.equal(pageOffset("-1"), 0);
  assert.equal(pageOffset("nope"), 0);
  assert.equal(ORDER_PAGE_SIZE, 100);
  assert.equal(INTAKE_PAGE_SIZE, 50);
});

test("a rejected intake item keeps the problem and drops a phone number", () => {
  const item = readRejectedItem({
    index: 2,
    phone: "9830012345",
    fullName: "Asha Roy",
    email: "asha@example.com",
    problems: [{ code: "invalid_phone", field: "phone", reason: "A contact number of at least 10 digits is required." }],
  });
  assert.equal(item?.index, 2);
  assert.equal(item?.problems[0].field, "phone");
  assert.equal(item?.problems[0].code, "invalid_phone");
  assert.equal("phone" in item, false);
  assert.equal("fullName" in item, false);
  assert.equal("email" in item, false);

  const batch = readIntakeBatch({
    batchRef: "IN-3F9A2C71",
    source: "import",
    createdAt: "2026-09-30T10:00:00.000Z",
    submitted: 3,
    acceptedCount: 1,
    rejectedCount: 1,
    duplicateCount: 1,
    skippedCount: 0,
    accepted: [{ index: 0, id: "abc", reference: "LD-1", consentStatus: "unknown" }],
    duplicates: [{ index: 1, existingReference: "LD-0" }],
    rejected: [{ index: 2, problems: [{ code: "missing_name", field: "fullName", reason: "The enquirer’s name is required." }] }],
    skipped: [],
  });
  assert.equal(batch?.acceptedCount, 1);
  assert.equal(batch?.rejected[0].problems[0].reason, "The enquirer’s name is required.");
  assert.equal(batch?.duplicates[0].existingReference, "LD-0");
});

test("cancellation repeats the service sentence", () => {
  assert.equal(
    cancellationFailure(409, { error: "Already completed.", code: "order_already_completed" }),
    "Already completed.",
  );
  assert.match(cancellationFailure(422, {}), /cancelled/i);
  assert.match(cancellationFailure(403, {}), /cannot cancel/);
});

test("approved-screen omissions name what the payload still lacks", () => {
  assert.equal(ORDER_SCREEN_OMISSIONS.some((gap) => gap.includes("No staff-wide list")), false);
  assert.ok(ORDER_SCREEN_OMISSIONS.some((gap) => gap.includes("amountCredits")));
  assert.ok(ORDER_SCREEN_OMISSIONS.some((gap) => gap.includes("organisation")));
  assert.ok(ORDER_SCREEN_OMISSIONS.some((gap) => gap.includes("delivery-event")));
  assert.equal(INTAKE_SCREEN_OMISSIONS.some((gap) => gap.includes("no offset")), false);
  assert.equal(INTAKE_SCREEN_OMISSIONS.some((gap) => gap.includes("untyped")), false);
  assert.ok(INTAKE_SCREEN_OMISSIONS.some((gap) => gap.includes("phone number")));
  assert.ok(ORDER_SCREEN_OMISSIONS.some((gap) => gap.includes("does not guarantee buyerDisplayName")));
});

test("KKL_AUTH=backend selects the browser session and leaves the issuer for review mode", () => {
  const previous = process.env.KKL_AUTH;
  process.env.KKL_AUTH = "backend";
  assert.equal(bearerMode(), "browser-session");
  delete process.env.KKL_AUTH;
  assert.equal(bearerMode(), "development-issuer");
  if (previous !== undefined) process.env.KKL_AUTH = previous;

  assert.deepEqual(IDENTITY.developmentIssuerModules, [
    "src/lib/services/backend/session.ts",
    "src/lib/services/backend/lead-requests.ts",
  ]);
  assert.ok(IDENTITY.browserSessionModules.includes("src/lib/services/backend/staff-orders.ts"));
  assert.ok(IDENTITY.browserSessionModules.includes("src/lib/services/backend/intake.ts"));
  assert.deepEqual(IDENTITY.publicReads, ["src/lib/services/backend/locations.ts"]);

  const session = readFileSync(new URL("../src/lib/services/backend/session.ts", import.meta.url), "utf8");
  const callAs = session.slice(session.indexOf("export async function callAs"));
  assert.ok(callAs.indexOf("browser-session") < callAs.indexOf("callWithDevelopmentIssuer"));
  const browser = session.slice(
    session.indexOf("async function callWithBrowserSession"),
    session.indexOf("async function callWithDevelopmentIssuer"),
  );
  assert.equal(browser.includes("/v1/dev/sessions"), false);
  assert.ok(session.includes("/v1/dev/sessions"));
  const leadRequests = readFileSync(new URL("../src/lib/services/backend/lead-requests.ts", import.meta.url), "utf8");
  assert.ok(leadRequests.indexOf("bearerMode()") < leadRequests.indexOf("leadRequestBackendConfig()"));
});
