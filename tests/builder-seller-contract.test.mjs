/**
 * Builder draft mapping and the seller profile patch.
 * These are not rows in kkl_review.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  builderBlockers,
  configurationPayload,
  deleteFailureQuery,
  deleteFollowUp,
  DraftDeleteRefusal,
  draftDeleteResult,
  fieldsNotStored,
  listingListPresentation,
  listingsMatchingStatus,
  priceWasNotCopied,
  sectionPatch,
  sectionSaveMessage,
  toBuilderDraft,
} from "../src/lib/services/backend/builder-draft.ts";
import { sellerProfilePatch } from "../src/lib/services/backend/alert-preferences.ts";
import { sellerProfileView } from "../src/lib/services/backend/seller-profile-reading.ts";

test("a price range is not written as priceInr or as a configuration price", () => {
  const patch = sectionPatch(
    "pricing",
    { configurations: ["2", "3"], priceMinInr: "5000000", priceMaxInr: "9000000" },
    [{ configuration: "3 BHK", priceInr: 7200000, areaSqft: 980, available: 4 }],
  );
  assert.equal(priceWasNotCopied(patch), true);
  assert.equal("priceInr" in patch, false);
  assert.equal(patch.priceMinInr, 5000000);
  assert.equal(patch.priceMaxInr, 9000000);
  assert.deepEqual(patch.configurations, [
    { configuration: "3 BHK", priceInr: 7200000, areaSqft: 980, available: 4 },
    { configuration: "2 BHK" },
  ]);
  assert.deepEqual(fieldsNotStored("pricing", patch), []);
  assert.deepEqual(
    fieldsNotStored("pricing", { priceMinInr: "5000000", priceMaxInr: "9000000", configurations: ["2"] }),
    [],
  );
});

test("stored configuration order is kept, and an available count of zero stays", () => {
  const payload = configurationPayload(
    ["3", "1"],
    [
      { configuration: "3 BHK", priceInr: 7200000, areaSqft: 1100, available: 0 },
      { configuration: "1 BHK", priceInr: null, areaSqft: null, available: null },
    ],
  );
  assert.deepEqual(payload, [
    { configuration: "3 BHK", priceInr: 7200000, areaSqft: 1100, available: 0 },
    { configuration: "1 BHK" },
  ]);
});

test("a mixed-status list keeps published on All and matches each tab", () => {
  const listings = [
    { id: "d", status: "draft" },
    { id: "p", status: "published" },
    { id: "u", status: "unpublished" },
    { id: "s", status: "submitted" },
  ];
  assert.deepEqual(
    listingsMatchingStatus(listings).map((listing) => listing.id),
    ["d", "p", "u", "s"],
  );
  assert.deepEqual(
    listingsMatchingStatus(listings, "published").map((listing) => listing.id),
    ["p"],
  );
  assert.deepEqual(
    listingsMatchingStatus(listings, "unpublished").map((listing) => listing.id),
    ["u"],
  );
  assert.deepEqual(
    listingsMatchingStatus(listings, "draft").map((listing) => listing.id),
    ["d"],
  );
  const submitted = listingListPresentation("submitted");
  assert.equal(submitted.recordStatus, "submitted");
  assert.equal(submitted.detailLine.includes("Draft."), false);
  assert.equal(listingListPresentation("published").status, "published");
  assert.equal(listingListPresentation("unpublished").status, "unpublished");
  assert.equal(
    sectionSaveMessage("media", []),
    "An https video link is stored as an address. It is not an uploaded file. Photographs and the photograph count were not stored.",
  );
  assert.equal(sectionSaveMessage("pricing", ["Lowest price", "Highest price"]).includes("Not stored"), true);
});

test("a configuration the checkboxes cannot show is kept, with its price", () => {
  const payload = configurationPayload(
    ["1"],
    [{ configuration: "studio", priceInr: 4100000, areaSqft: null, available: null }],
  );
  assert.deepEqual(payload, [
    { configuration: "studio", priceInr: 4100000 },
    { configuration: "1 BHK" },
  ]);
});

test("basics, location and specifications omit fields the listing does not carry", () => {
  const basics = sectionPatch("basics", {
    title: "Riverside",
    propertyType: "Apartment",
    description: "A draft",
    possessionTarget: "Dec 2027",
  });
  assert.deepEqual(basics, {
    title: "Riverside",
    propertyType: "Apartment",
    description: "A draft",
    possessionTarget: "Dec 2027",
  });

  const location = sectionPatch("location", { locality: "loc-1", addressLine: "12 Main Road" });
  assert.deepEqual(location, { locationId: "loc-1", addressLine: "12 Main Road" });

  const specifications = sectionPatch("specifications", {
    areaMin: "985 sq ft",
    areaMax: "1420 sq ft",
    totalUnits: "40",
    amenities: ["Gymnasium"],
    reraRegistered: true,
    reraNumber: "WBRERA/P/NOR/2024/000001",
  });
  assert.deepEqual(specifications, {
    totalUnits: 40,
    reraId: "WBRERA/P/NOR/2024/000001",
    amenities: ["Gymnasium"],
    carpetAreaMin: "985 sq ft",
    carpetAreaMax: "1420 sq ft",
  });
  assert.equal("reraRegistered" in specifications, false);
  assert.deepEqual(sectionPatch("media", { photoCount: "3", videoUrl: "https://example.test/tour" }), {
    videoUrl: "https://example.test/tour",
  });
  assert.deepEqual(sectionPatch("media", { photoCount: "3" }), {});
});

test("a stored configuration price is shown and is not folded into the range", () => {
  const draft = toBuilderDraft({
    id: "listing-1",
    status: "draft",
    title: "Riverside",
    priceInr: 8000000,
    configurations: [
      { configuration: "3 BHK", priceInr: 7200000, areaSqft: null, available: null },
      { configuration: "4 BHK", priceInr: null, areaSqft: null, available: null },
    ],
  });
  assert.equal(draft.priceMinInr, null);
  assert.equal(draft.priceMaxInr, null);
  assert.equal(draft.listingPriceInr, 8000000);
  assert.equal(draft.enquiryCount, null);
  assert.deepEqual(draft.configurations, ["3", "4"]);
  assert.deepEqual(draft.configurationPrices, [{ label: "3 BHK", priceInr: 7200000 }]);
  const messages = builderBlockers(draft).map((blocker) => blocker.message);
  assert.equal(messages.some((message) => message.includes("one priceInr")), false);
  assert.equal(messages.some((message) => message.includes("No request publishes")), true);
});

test("the seller profile patch is only the supported names", () => {
  const patch = sellerProfilePatch({
    contactName: "Review Seller",
    agencyName: "Review Agency",
  });
  assert.deepEqual(patch, {
    displayName: "Review Seller",
    companyName: "Review Agency",
  });
  assert.equal("fullName" in patch, false);
  assert.equal("whatsappOptIn" in patch, false);
  assert.equal("emailOptIn" in patch, false);
  assert.equal("gstin" in patch, false);
  const view = sellerProfileView({
    fullName: "Kept Profile Name",
    displayName: "Review Seller",
    companyName: "Review Agency",
    signInPhone: "+91 •••• 0102",
  });
  assert.deepEqual(view, {
    contactName: "Review Seller",
    profileFullName: "Kept Profile Name",
    agencyName: "Review Agency",
    mobile: "+91 •••• 0102",
    accountStatus: null,
  });
  assert.equal(
    sellerProfileView({
      fullName: null,
      displayName: "Review Seller",
      companyName: null,
      signInPhone: null,
      status: "suspended",
    }).accountStatus,
    "suspended",
  );
});

test("deleting a draft follows the published statuses", () => {
  assert.deepEqual(draftDeleteResult(200, { deleted: true }), { ok: true });
  assert.equal(draftDeleteResult(409, { code: "not_a_draft" }).ok, false);
  assert.equal(
    draftDeleteResult(409, { code: "not_a_draft", error: "Only a draft can be deleted." }).ok,
    false,
  );
  const referenced = draftDeleteResult(409, { code: "listing_referenced" });
  assert.equal(referenced.ok, false);
  if (!referenced.ok) assert.equal(referenced.code, "listing_referenced");
  const missing = draftDeleteResult(404, {});
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.kind, "not_found");
  assert.equal(draftDeleteResult(200, {}).ok, false);
  const otherAccount = draftDeleteResult(404, { error: "Not found" });
  assert.equal(otherAccount.ok, false);
  if (!otherAccount.ok) {
    assert.equal(otherAccount.code, "not_found");
    assert.equal(deleteFailureQuery(otherAccount.code), "not_found");
    const refusal = new DraftDeleteRefusal(otherAccount.code, otherAccount.message);
    assert.equal(refusal.code, "not_found");
    assert.equal(refusal.message.includes("deleted"), false);
  }
  const submitted = draftDeleteResult(409, {
    code: "not_a_draft",
    error: "Only a draft can be deleted. A listing with the review team is withdrawn, and a published listing is taken down by staff.",
  });
  assert.equal(submitted.ok, false);
  if (!submitted.ok) assert.equal(deleteFailureQuery(submitted.code), "not_a_draft");
  const enquiryConflict = draftDeleteResult(409, {
    code: "listing_referenced",
    error: "This draft is referenced by an enquiry, so it was not deleted.",
  });
  assert.equal(enquiryConflict.ok, false);
  if (!enquiryConflict.ok) {
    assert.equal(deleteFailureQuery(enquiryConflict.code), "listing_referenced");
    assert.match(enquiryConflict.message, /was not deleted/);
  }
  assert.equal(deleteFailureQuery("unauthenticated"), "unavailable");
  assert.equal(deleteFailureQuery("deleted"), "unavailable");
  assert.deepEqual(deleteFollowUp(draftDeleteResult(200, { deleted: true })), { type: "deleted" });
  assert.deepEqual(deleteFollowUp(draftDeleteResult(401, {})), { type: "sign-in" });
  assert.deepEqual(deleteFollowUp(draftDeleteResult(404, {})), { type: "refused", code: "not_found" });
  assert.deepEqual(deleteFollowUp(draftDeleteResult(409, { code: "not_a_draft" })), {
    type: "refused",
    code: "not_a_draft",
  });
  assert.deepEqual(deleteFollowUp(draftDeleteResult(409, { code: "listing_referenced" })), {
    type: "refused",
    code: "listing_referenced",
  });
  assert.notEqual(deleteFollowUp(draftDeleteResult(401, {})).type, "deleted");
  assert.notEqual(deleteFollowUp(draftDeleteResult(200, {})).type, "deleted");
});
