/**
 * Admin KYC and live-property readings.
 * These fixtures are not rows in kkl_review, and a takedown here did not
 * publish a listing.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  approvalIsAction,
  capabilityBlocked,
  documentsArePackets,
  kycCountTile,
  kycListKind,
  propertyCountTile,
  propertyListKind,
  readKycPage,
  readPropertyPage,
  NOTIFICATION_RECORDED,
} from "../src/lib/services/backend/admin-queue-reading.ts";

const blocked = (message, code) => ({
  available: false,
  code,
  message,
});

const application = {
  id: "VER-SYNTHETIC1",
  source: "verification_case",
  accountId: "00000000-0000-4000-8000-000000000001",
  applicantName: "Synthetic Applicant",
  role: "seller",
  action: "lead_purchase",
  outcome: "needs_review",
  state: "pending",
  submittedAt: "2026-10-01T08:00:00.000Z",
  waitingSeconds: 3600,
  documents: blocked("No identity document is collected.", "verification_provider_not_configured"),
  checks: blocked("No document checklist is confirmed.", "document_checklist_not_decided"),
  approval: blocked("Staff cannot mark an account verified.", "manual_verification_not_authorised"),
  decision: null,
  events: [],
};

function kycPage(overrides) {
  return readKycPage({
    source: "verification_cases",
    filter: "pending",
    applications: [application],
    total: 1,
    limit: 50,
    offset: 0,
    documents: application.documents,
    checks: application.checks,
    approval: application.approval,
    resubmission: blocked(
      "Nothing can be resubmitted until a document is collected.",
      "documents_not_collected",
    ),
    ...overrides,
  });
}

const listing = {
  id: "00000000-0000-4000-8000-000000000010",
  reference: "PL-SYNTHETIC",
  source: "listing",
  submissionQueue: false,
  name: "Synthetic live apartment",
  postedAs: "owner",
  accountName: "Synthetic Owner",
  locality: "Rajarhat",
  status: "published",
  state: "published",
  outcome: null,
  note: "Live on the public path.",
  history: [],
};

function propertyPage(overrides) {
  return readPropertyPage({
    source: "listings",
    excludes: "owner_submissions",
    filter: "published",
    listings: [listing],
    total: 1,
    limit: 50,
    offset: 0,
    publication: {
      reachable: false,
      code: "publication_not_decided",
      dependency: "Q-3",
      message: "No request path publishes a listing.",
    },
    reports: blocked(
      "No approved rule records a report against a live listing.",
      "property_reports_not_decided",
    ),
    ...overrides,
  });
}

test("a resubmitted filter with resubmission unavailable is not an empty inbox", () => {
  const page = kycPage({ filter: "resubmitted", applications: [], total: 0 });
  const kind = kycListKind(page);
  assert.equal(kind.kind, "resubmission-unavailable");
  assert.match(kind.message, /resubmitted/i);
  assert.equal(page.total, 0);
  assert.notEqual(kind.kind, "empty-open");
});

test("an empty pending page is an open queue with nothing waiting", () => {
  const page = kycPage({ applications: [], total: 0 });
  assert.equal(kycListKind(page).kind, "empty-open");
});

test("filter all stays a page of open cases", () => {
  const page = kycPage({ filter: "all" });
  assert.equal(page.filter, "all");
  assert.equal(kycListKind(page).kind, "rows");
  assert.equal(page.applications[0].outcome, "needs_review");
});

test("documents and checks stay unavailable, and approval is not an action", () => {
  const page = kycPage({});
  assert.equal(documentsArePackets(page.documents), false);
  assert.equal(capabilityBlocked(page.checks), true);
  assert.equal(approvalIsAction(page.approval), false);
  assert.equal(page.applications[0].documents.available, false);
});

test("a missing total does not become an empty KYC queue", () => {
  assert.equal(kycPage({ total: undefined }), null);
});

test("reported with reports unavailable is not zero reports", () => {
  const page = propertyPage({ filter: "reported", listings: [], total: 0 });
  const kind = propertyListKind(page);
  assert.equal(kind.kind, "reports-unavailable");
  assert.match(kind.message, /report/i);
});

test("an empty published page is a real empty live list", () => {
  const page = propertyPage({ listings: [], total: 0 });
  const kind = propertyListKind(page);
  assert.equal(kind.kind, "empty");
  assert.match(kind.body, /published/);
  assert.equal(capabilityBlocked(page.reports), true);
  assert.equal(page.publication.reachable, false);
});

test("pagination uses offset, limit and total", () => {
  const page = propertyPage({ listings: [listing], total: 80, limit: 50, offset: 0 });
  assert.equal(page.offset + page.listings.length < page.total, true);
  const past = propertyPage({ listings: [], total: 3, limit: 50, offset: 50 });
  assert.equal(propertyListKind(past).kind, "past-end");
});

test("a failed count is unavailable and a real zero stays zero", () => {
  const failed = kycCountTile({ ok: false });
  assert.equal(failed.value, null);
  assert.match(failed.note, /sample count is not shown/);
  const empty = propertyCountTile({ ok: true, total: 0 });
  assert.equal(empty.value, 0);
  assert.match(empty.note, /Reports are not part of this count/);
  const ageingUnread = kycCountTile({ ok: true, open: 2, ageing: null });
  assert.equal(ageingUnread.value, 2);
  assert.equal(ageingUnread.flag, null);
  assert.match(ageingUnread.note, /not shown as zero/);
});

test("a takedown notice does not say the notification was delivered", () => {
  assert.match(NOTIFICATION_RECORDED, /records a notification/);
  assert.match(NOTIFICATION_RECORDED, /does not say that message was delivered/);
  const takenDown = propertyPage({
    filter: "unpublished",
    listings: [{
      ...listing,
      state: "unpublished",
      status: "unpublished",
      outcome: "unpublished",
      history: [{
        from: "published",
        to: "unpublished",
        reason: "Address could not be confirmed",
        actorKind: "staff",
        actorLabel: "Review Staff",
        visibility: "shared",
        at: "2026-10-01T09:00:00.000Z",
      }],
    }],
  });
  assert.equal(takenDown.listings[0].outcome, "unpublished");
  assert.equal(takenDown.listings[0].history[0].reason, "Address could not be confirmed");
  assert.equal(takenDown.submissionQueue, undefined);
});
