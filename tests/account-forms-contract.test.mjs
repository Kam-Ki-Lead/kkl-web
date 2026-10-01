/**
 * Account-form patches and the marketplace purchase hold.
 * These are not rows in kkl_review.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buyerProfilePatch, buyerProfileView, requirementBody } from "../src/lib/services/backend/buyer-profile-reading.ts";
import {
  isPublishedListingId,
  shortlistAddBody,
  shortlistAddResult,
  shortlistRemoveResult,
} from "../src/lib/services/backend/shortlist-contract.ts";
import {
  shortlistAccessibleName,
  shortlistHref,
  shortlistVisibleLabel,
} from "../src/lib/shortlist-label.ts";
import { enquiryCountLabel, imageRecordLabel, ownerCountLine } from "../src/lib/listing-counts.ts";
import { describeLocation, withStoredAnswers } from "../src/lib/requirement.ts";
import {
  builderProfilePatch,
  builderProfileView,
} from "../src/lib/services/backend/builder-profile-reading.ts";
import { purchaseHold } from "../src/lib/domain/commerce-display.ts";
import { billingPatch } from "../src/lib/services/backend/seller-profile-reading.ts";

test("the buyer full name is not copied into the account name", () => {
  const patch = buyerProfilePatch({
    fullName: "Priya Sen",
    email: null,
    preferredLocalityId: "rajarhat",
    notifyByWhatsApp: false,
    notifyByEmail: true,
  });
  assert.deepEqual(patch, {
    fullName: "Priya Sen",
    contactEmail: null,
    primaryLocationId: "rajarhat",
    whatsappOptIn: false,
    emailOptIn: true,
  });
  assert.equal("displayName" in patch, false);
  const view = buyerProfileView({
    fullName: null,
    displayName: "Review Buyer",
    signInPhone: "+91 •••• 0103",
    contactEmail: null,
    primaryLocationId: null,
    whatsappOptIn: false,
    emailOptIn: false,
  });
  assert.equal(view.profile.fullName, "");
  assert.equal(view.accountName, "Review Buyer");
});

test("the builder profile patch keeps full name, RERA and alerts off the body", () => {
  const patch = builderProfilePatch({
    contactName: "Review Builder",
    companyName: "Review Projects",
    email: "desk@example.invalid",
  });
  assert.deepEqual(patch, {
    displayName: "Review Builder",
    companyName: "Review Projects",
    contactEmail: "desk@example.invalid",
  });
  assert.equal("fullName" in patch, false);
  assert.equal("reraId" in patch, false);
  assert.equal("whatsappOptIn" in patch, false);
  const view = builderProfileView({
    fullName: "Kept Builder Name",
    displayName: "Review Builder",
    companyName: "Review Projects",
    signInPhone: "+91 •••• 0104",
    contactEmail: "desk@example.invalid",
    status: "active",
  });
  assert.equal(view.profileFullName, "Kept Builder Name");
  assert.equal(view.contactName, "Review Builder");
  assert.equal(view.accountStatus, "active");
});

test("billing details are one profile object and do not carry identity numbers", () => {
  const patch = billingPatch({
    billingName: "Review Agency",
    gstin: "19AAAAA0000A1Z5",
    addressLines: ["12 Main Road"],
    invoiceEmail: null,
    contactName: "Review Seller",
  });
  assert.deepEqual(Object.keys(patch), ["billing"]);
  assert.equal("pan" in patch.billing, false);
  assert.equal("aadhaar" in patch.billing, false);
  assert.equal(patch.billing.billingName, "Review Agency");
});

test("a buyer requirement is stored as the answers, without a score", () => {
  const body = requirementBody({
    locationId: "rajarhat",
    configurations: ["2", "3"],
    minBudgetInr: 5000000,
    maxBudgetInr: 10000000,
    handoverTiming: "Ready to move",
    intent: "end_use",
  });
  assert.equal("matchScore" in body, false);
  assert.deepEqual(body.configurations, ["2", "3"]);
  assert.equal(body.intent, "end_use");
});

test("a purchase hold uses the lead blockers and not a sample verification", () => {
  assert.equal(
    purchaseHold({
      priceCredits: null,
      balanceCredits: 0,
      blockers: [{ code: "lead_price_not_configured", reason: "No lead price is configured." }],
    }).kind,
    "unpriced",
  );
  const verified = purchaseHold({
    priceCredits: 1200,
    balanceCredits: 5000,
    blockers: [{ code: "verification_required", reason: "No case has been opened yet." }],
  });
  assert.equal(verified.kind, "unverified");
  assert.match(verified.reason ?? "", /No case/);
  const other = purchaseHold({
    priceCredits: 1200,
    balanceCredits: 5000,
    blockers: [{ code: "consent_not_recorded", reason: "No consent to be contacted is recorded." }],
  });
  assert.equal(other.kind, "refused");
  assert.equal(
    purchaseHold({ priceCredits: 100, balanceCredits: 100, blockers: [] }).kind,
    null,
  );
});

test("shortlist add and remove follow the published statuses", () => {
  const id = "d48bd9ea-b31b-4a55-ae97-ed838b5def4f";
  assert.equal(isPublishedListingId(id), true);
  assert.equal(isPublishedListingId("p-ivy-court"), false);
  assert.deepEqual(shortlistAddBody(id), { listingId: id });
  assert.equal(shortlistAddResult(201), "added");
  assert.equal(shortlistAddResult(200), "already");
  assert.equal(shortlistAddResult(404), "missing");
  assert.equal(shortlistAddResult(409), "not_public");
  assert.equal(shortlistAddResult(401), "unauthenticated");
  assert.equal(shortlistRemoveResult(200), "removed");
  assert.equal(shortlistRemoveResult(401), "unauthenticated");
  assert.equal(shortlistVisibleLabel({ kind: "guest" }), "Shortlist");
  assert.equal(shortlistAccessibleName({ kind: "guest" }), "Shortlist");
  assert.equal(shortlistHref({ kind: "guest" }), "/auth?next=/account/shortlist");
  assert.equal(shortlistVisibleLabel({ kind: "unavailable" }), "Shortlist (unavailable)");
  assert.equal(shortlistAccessibleName({ kind: "unavailable" }), "Shortlist (unavailable)");
  assert.equal(shortlistHref({ kind: "unavailable" }), "/account/shortlist");
  assert.equal(shortlistVisibleLabel({ kind: "count", total: 0 }), "Shortlist (0)");
  assert.equal(shortlistAccessibleName({ kind: "count", total: 0 }), "Shortlist (0), 0 saved");
  assert.equal(shortlistHref({ kind: "count", total: 0 }), "/account/shortlist");
  assert.equal(shortlistVisibleLabel({ kind: "count", total: 3 }), "Shortlist (3)");
  assert.match(shortlistAccessibleName({ kind: "count", total: 3 }), /^Shortlist \(3\)/);
  assert.equal(shortlistHref({ kind: "count", total: 3 }), "/account/shortlist");
  assert.equal(enquiryCountLabel(null), null);
  assert.equal(enquiryCountLabel(0), "0 enquiries");
  assert.equal(imageRecordLabel(null), null);
  assert.match(imageRecordLabel(0) ?? "", /0 image records/);
  assert.match(imageRecordLabel(1) ?? "", /not a stored photograph/);
  assert.equal(ownerCountLine(0, null, null), "no photographs");
  assert.equal(ownerCountLine(2, null, null), "2 photographs");
  const present = ownerCountLine(0, 0, 0);
  assert.match(present, /0 stored photographs/);
  assert.match(present, /0 image records/);
  assert.match(present, /0 enquiries/);
  assert.doesNotMatch(present, /no photographs/);
  const missing = ownerCountLine(0, null, null);
  assert.equal(missing.includes("image record"), false);
  assert.equal(missing.includes("enquiries"), false);
});

test("a stored requirement fills only answers the address bar does not carry", () => {
  const stored = {
    locationId: "in-wb-kol-rajarhat",
    configurations: ["2"],
    minBudgetInr: 5000000,
    maxBudgetInr: 10000000,
    handoverTiming: "Ready to move",
    intent: "end_use",
  };
  const filled = withStoredAnswers({}, stored);
  assert.equal(filled.locality, "in-wb-kol-rajarhat");
  assert.deepEqual(filled.bhk, ["2"]);
  assert.equal(filled.budget, "₹50L – ₹1Cr");
  const kept = withStoredAnswers({ locality: "missing-place", bhk: "3" }, stored);
  assert.equal(kept.locality, "missing-place");
  assert.equal(kept.bhk, "3");
});

test("an unknown requirement location stays unavailable", () => {
  const options = [{ id: "in-wb-kol-rajarhat", label: "Rajarhat, Kolkata" }];
  assert.deepEqual(describeLocation(options, "in-wb-kol-rajarhat"), {
    label: "Rajarhat, Kolkata",
    available: true,
  });
  assert.deepEqual(describeLocation(options, "retired-place"), {
    label: "This location is not available",
    available: false,
  });
  assert.equal(describeLocation(options, null), null);
});
