/**
 * Builder draft mapping and the seller profile patch.
 * These are not rows in kkl_review.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  builderBlockers,
  configurationPayload,
  priceWasNotCopied,
  sectionPatch,
  toBuilderDraft,
} from "../src/lib/services/backend/builder-draft.ts";
import {
  sellerProfilePatch,
  sellerProfileView,
} from "../src/lib/services/backend/seller-profile-reading.ts";

test("a price range is not written as priceInr or as a configuration price", () => {
  const patch = sectionPatch(
    "pricing",
    { configurations: ["2", "3"], priceMinInr: "5000000", priceMaxInr: "9000000" },
    [{ configuration: "3 BHK", priceInr: 7200000, areaSqft: 980, available: 4 }],
  );
  assert.equal(priceWasNotCopied(patch), true);
  assert.equal("priceInr" in patch, false);
  assert.deepEqual(patch.configurations, [
    { configuration: "2 BHK" },
    { configuration: "3 BHK", priceInr: 7200000, areaSqft: 980, available: 4 },
  ]);
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
  });
  assert.equal(sectionPatch("media", { photoCount: "3", videoUrl: "https://example.test" }).constructor, Object);
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
    fullName: "Review Seller",
    displayName: "Review Seller",
    companyName: "Review Agency",
  });
  assert.equal("whatsappOptIn" in patch, false);
  assert.equal("emailOptIn" in patch, false);
  assert.equal("gstin" in patch, false);
  const view = sellerProfileView({
    fullName: "Review Seller",
    companyName: "Review Agency",
    signInPhone: "+91 •••• 0102",
  });
  assert.deepEqual(view, {
    contactName: "Review Seller",
    agencyName: "Review Agency",
    mobile: "+91 •••• 0102",
  });
});
