/**
 * The purchased-lead CSV (S-12, S-13).
 *
 * The connected export used to throw `unavailable`. It was never a storage
 * dependency — the route streams the body in its own response — and sample
 * mode had a working serialiser all along, so the two modes now share one.
 * These are pure functions over a row shape; nothing here calls a backend.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PURCHASED_EXPORT_CONTENT_TYPE,
  purchasedLeadsCsv,
  purchasedLeadsFilename,
} from "../src/lib/domain/purchased-export.ts";

const row = (overrides = {}) => ({
  leadId: "11111111-1111-1111-1111-111111111111",
  orderReference: "ORD-ABC123",
  purchasedAt: "2026-10-04T09:30:00.000Z",
  requirement: "3BHK in New Town",
  area: "Kolkata / New Town",
  configuration: "apartment",
  budgetBand: "50-75l",
  intentScore: null,
  name: "Synthetic Contact",
  mobile: "+919800000001",
  email: "synthetic@example.invalid",
  bestTimeToCall: null,
  creditsPaid: 40,
  ...overrides,
});

const lines = (csv) => csv.split("\r\n").filter((l) => l.length > 0);

test("the header names every column once, in a fixed order", () => {
  const [header] = lines(purchasedLeadsCsv([]));
  assert.equal(header, "Lead,Order,Purchased,Requirement,Area,Configuration,"
    + "Budget band,Intent score,Name,Mobile,Email,Best time to call,Credits paid");
  // An empty export is a header and nothing else, never an empty file: a
  // zero-byte download looks like a failure.
  assert.equal(lines(purchasedLeadsCsv([])).length, 1);
});

test("a row lands in its own columns", () => {
  const [, body] = lines(purchasedLeadsCsv([row()]));
  assert.equal(body, "11111111-1111-1111-1111-111111111111,ORD-ABC123,"
    + "2026-10-04T09:30:00.000Z,3BHK in New Town,Kolkata / New Town,apartment,"
    + "50-75l,,Synthetic Contact,+919800000001,synthetic@example.invalid,,40");
});

test("free text survives a comma, a quote and a newline", () => {
  const [, body] = lines(purchasedLeadsCsv([row({
    requirement: 'Wants 3BHK, "south facing", near the metro',
  })]));
  assert.ok(body.includes('"Wants 3BHK, ""south facing"", near the metro"'),
    `quoting lost the field: ${body}`);

  const withNewline = purchasedLeadsCsv([row({ requirement: "Two\nlines" })]);
  assert.ok(withNewline.includes('"Two\nlines"'), "a newline was not quoted");
  // The embedded newline is inside quotes, so the record count is still one.
  assert.equal(withNewline.split("\r\n").filter((l) => l.length > 0).length, 2);
});

test("a missing field is empty, and a missing score is not a zero", () => {
  const [, body] = lines(purchasedLeadsCsv([row({
    name: null, mobile: null, email: null, requirement: null, intentScore: null,
  })]));
  const cells = body.split(",");
  // Intent score, Name, Mobile, Email and Best time to call are all blank.
  assert.equal(cells[7], "", "intent score was filled in");
  assert.equal(cells[8], "");
  assert.equal(cells[9], "");
  assert.equal(cells[10], "");
  assert.ok(!body.includes(",0,"), "a null read as zero somewhere");
});

test("a zero intent score is written, because zero is a score", () => {
  const [, body] = lines(purchasedLeadsCsv([row({ intentScore: 0 })]));
  assert.equal(body.split(",")[7], "0");
});

test("the filename and content type are the same in both modes", () => {
  assert.equal(purchasedLeadsFilename(new Date("2026-10-04T23:59:00Z")),
    "kkl-purchased-leads-2026-10-04.csv");
  assert.equal(PURCHASED_EXPORT_CONTENT_TYPE, "text/csv; charset=utf-8");
});
