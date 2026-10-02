/**
 * Role-specific alert choices on the profile patch.
 * These are preferences. They are not sent alerts.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  alertFieldsSubmitted,
  alertSavedMessage,
  builderAlertsPatch,
  explicitBoolean,
  readBuilderAlerts,
  readSellerAlerts,
  builderProfilePatch,
  sellerAlertsPatch,
  sellerProfilePatch,
} from "../src/lib/services/backend/alert-preferences.ts";

test("an unchecked box is an explicit false and a checked box is true", () => {
  const unchecked = new FormData();
  unchecked.append("lowBalance", "false");
  assert.equal(explicitBoolean(unchecked, "lowBalance"), false);

  const checked = new FormData();
  checked.append("lowBalance", "false");
  checked.append("lowBalance", "true");
  assert.equal(explicitBoolean(checked, "lowBalance"), true);

  const absent = new FormData();
  assert.equal(explicitBoolean(absent, "lowBalance"), false);
  assert.equal(alertFieldsSubmitted(absent, ["lowBalance"]), false);
  assert.equal(alertFieldsSubmitted(unchecked, ["lowBalance"]), true);
});

test("a seller patch sends explicit false and omits a key that was not included", () => {
  const patch = sellerProfilePatch({
    contactName: "Review Seller",
    agencyName: "Review Agency",
    alerts: { newLeadsInMyAreas: true, lowBalance: false },
  });
  assert.deepEqual(patch.alerts, { newLeadsInMyAreas: true, lowBalance: false });
  assert.equal("viewedLeadOnSale" in patch.alerts, false);
  assert.equal("delivery" in patch.alerts, false);
  assert.equal("newEnquiry" in patch.alerts, false);
  assert.equal("whatsappOptIn" in patch, false);
  assert.equal("emailOptIn" in patch, false);
  assert.deepEqual(patch.displayName, "Review Seller");
  assert.deepEqual(patch.companyName, "Review Agency");
});

test("a seller patch without alert choices does not send an alerts object", () => {
  const patch = sellerProfilePatch({
    contactName: "Review Seller",
    agencyName: "Review Agency",
  });
  assert.equal("alerts" in patch, false);
});

test("seller alert keys drop the other role, delivery, and consent", () => {
  const patch = sellerAlertsPatch({
    newLeadsInMyAreas: false,
    viewedLeadOnSale: true,
    lowBalance: false,
    newEnquiry: true,
    delivery: { available: true },
    whatsappOptIn: true,
    emailOptIn: true,
  });
  assert.deepEqual(patch, {
    alerts: {
      newLeadsInMyAreas: false,
      viewedLeadOnSale: true,
      lowBalance: false,
    },
  });
});

test("a builder patch sends explicit false and omits a key that was not included", () => {
  const patch = builderProfilePatch({
    contactName: "Review Builder",
    companyName: "Review Projects",
    email: "desk@example.invalid",
    alerts: { newEnquiry: false, subscriptionReminders: true },
  });
  assert.deepEqual(patch.alerts, { newEnquiry: false, subscriptionReminders: true });
  assert.equal("siteVisitRequest" in patch.alerts, false);
  assert.equal("delivery" in patch.alerts, false);
  assert.equal("newLeadsInMyAreas" in patch.alerts, false);
  assert.equal("whatsappOptIn" in patch, false);
  assert.equal("emailOptIn" in patch, false);
  assert.equal("fullName" in patch, false);
  assert.equal("reraId" in patch, false);
});

test("builder alert keys drop the other role and delivery", () => {
  const patch = builderAlertsPatch({
    newEnquiry: true,
    newLeadsInMyAreas: true,
    delivery: { available: false },
  });
  assert.deepEqual(patch, { alerts: { newEnquiry: true } });
});

test("the other role's choices are not writable on this form", () => {
  const sellerOnBuilder = readSellerAlerts({
    newEnquiry: true,
    siteVisitRequest: false,
    subscriptionReminders: false,
    delivery: { available: false },
  });
  assert.equal(sellerOnBuilder.writable, false);
  assert.equal(sellerOnBuilder.choices.newLeadsInMyAreas, false);
  const builderOnSeller = readBuilderAlerts({
    newLeadsInMyAreas: true,
    viewedLeadOnSale: false,
    lowBalance: false,
    delivery: { available: false },
  });
  assert.equal(builderOnSeller.writable, false);
  assert.equal(builderOnSeller.choices.newEnquiry, false);
});

test("a null alerts object is not writable and does not look saved as delivered", () => {
  const seller = readSellerAlerts(null);
  assert.equal(seller.writable, false);
  assert.equal(seller.deliveryAvailable, false);
  assert.deepEqual(seller.choices, {
    newLeadsInMyAreas: false,
    viewedLeadOnSale: false,
    lowBalance: false,
  });
  const builder = readBuilderAlerts(undefined);
  assert.equal(builder.writable, false);
  assert.equal(builder.deliveryAvailable, false);
});

test("saved preferences follow the returned delivery capability", () => {
  const stored = readBuilderAlerts({
    newEnquiry: true,
    siteVisitRequest: false,
    subscriptionReminders: false,
    delivery: { available: false },
  });
  assert.equal(stored.writable, true);
  assert.equal(stored.deliveryAvailable, false);
  assert.equal(stored.choices.newEnquiry, true);
  assert.equal(stored.choices.siteVisitRequest, false);
  assert.equal(
    alertSavedMessage(false),
    "Your alert preferences are saved. Alert delivery is not available yet.",
  );
  const ready = alertSavedMessage(true);
  assert.equal(ready, "Your alert preferences are saved.");
  assert.equal(ready.includes("sent"), false);
  assert.equal(alertSavedMessage(stored.deliveryAvailable).includes("not available yet"), true);
});

test("only a real true is read as chosen", () => {
  const seller = readSellerAlerts({
    newLeadsInMyAreas: true,
    viewedLeadOnSale: false,
    lowBalance: "yes",
    delivery: { available: true },
  });
  assert.equal(seller.choices.newLeadsInMyAreas, true);
  assert.equal(seller.choices.viewedLeadOnSale, false);
  assert.equal(seller.choices.lowBalance, false);
  assert.equal(seller.deliveryAvailable, true);
});
