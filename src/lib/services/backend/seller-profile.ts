import type { BillingDetails, SellerAccount } from "@/lib/domain/types";
import { ServiceError, ValidationError } from "@/lib/services/contracts";
import { callAs } from "./session";
import { readSellerAlerts, sellerProfilePatch } from "./alert-preferences";
import { billingPatch, billingView, sellerProfileView } from "./seller-profile-reading";

/**
 * The signed-in account's profile, for the seller profile screen.
 *
 * Contact name writes the account display name. Agency name writes
 * companyName. The profile full name is not sent. The phone is the sign-in
 * number and stays read-only. Alert choices are the seller keys when the
 * form submitted them. Consent opt-ins are not sent.
 */

type BackendProfile = {
  accountId?: string;
  fullName: string | null;
  displayName?: string | null;
  companyName: string | null;
  signInPhone: string | null;
  status?: string | null;
  alerts?: {
    newLeadsInMyAreas?: boolean;
    viewedLeadOnSale?: boolean;
    lowBalance?: boolean;
    delivery?: { available?: boolean } | null;
  } | null;
  billing?: {
    billingName?: string | null;
    gstin?: string | null;
    addressLines?: readonly string[] | null;
    invoiceEmail?: string | null;
    contactName?: string | null;
  } | null;
  error?: string;
  field?: string;
};

function asAccount(body: BackendProfile): SellerAccount {
  const view = sellerProfileView(body);
  const alerts = readSellerAlerts(body.alerts);
  return {
    id: body.accountId ?? "profile",
    contactName: view.contactName,
    agencyName: view.agencyName,
    mobile: view.mobile,
    // These are required by the form's account type and are not read from
    // the profile. The profile screen does not present them as saved status.
    businessType: "individual_broker",
    areas: [],
    gstin: null,
    kycStatus: "not_submitted",
    accountStatus: view.accountStatus ?? "active",
    alerts: alerts.choices,
  };
}

function alertReading(body: BackendProfile) {
  return readSellerAlerts(body.alerts);
}

export async function readSellerProfile(): Promise<{
  account: SellerAccount;
  profileFullName: string | null;
  accountStatus: "active" | "suspended" | null;
  alertsWritable: boolean;
  deliveryAvailable: boolean;
}> {
  const { status, body } = await callAs<BackendProfile>("seller", "/v1/me/profile");
  if (status === 401) throw new ServiceError("unauthenticated", "Sign in to read this profile.");
  if (status !== 200) {
    throw new ServiceError("unavailable", body.error ?? `The profile service returned ${status}.`);
  }
  const view = sellerProfileView(body);
  const alerts = alertReading(body);
  return {
    account: asAccount(body),
    profileFullName: view.profileFullName,
    accountStatus: view.accountStatus,
    alertsWritable: alerts.writable,
    deliveryAvailable: alerts.deliveryAvailable,
  };
}

export async function writeSellerProfile(input: {
  contactName: string;
  agencyName: string;
  alerts?: {
    newLeadsInMyAreas: boolean;
    viewedLeadOnSale: boolean;
    lowBalance: boolean;
  };
}): Promise<{ account: SellerAccount; deliveryAvailable: boolean }> {
  const { status, body } = await callAs<BackendProfile>("seller", "/v1/me/profile", {
    method: "PATCH",
    body: sellerProfilePatch(input),
  });
  if (status === 422) {
    const field =
      body.field === "companyName"
        ? "agencyName"
        : body.field === "displayName"
          ? "contactName"
          : "form";
    throw new ValidationError({ [field]: body.error ?? "This value was not accepted." });
  }
  if (status === 401) throw new ServiceError("unauthenticated", "Sign in to save this profile.");
  if (status !== 200) {
    throw new ServiceError("unavailable", body.error ?? `The profile service returned ${status}.`);
  }
  return { account: asAccount(body), deliveryAvailable: alertReading(body).deliveryAvailable };
}

export async function readSellerBilling(): Promise<BillingDetails> {
  const { status, body } = await callAs<BackendProfile>("seller", "/v1/me/profile");
  if (status === 401) throw new ServiceError("unauthenticated", "Sign in to read billing details.");
  if (status !== 200) {
    throw new ServiceError("unavailable", body.error ?? `The profile service returned ${status}.`);
  }
  return billingView(body);
}

export async function writeSellerBilling(input: BillingDetails): Promise<BillingDetails> {
  const { status, body } = await callAs<BackendProfile>("seller", "/v1/me/profile", {
    method: "PATCH",
    body: billingPatch(input),
  });
  if (status === 422) {
    const field = body.field === "billing" ? "form" : (body.field ?? "form");
    throw new ValidationError({ [field]: body.error ?? "This value was not accepted." });
  }
  if (status === 401) throw new ServiceError("unauthenticated", "Sign in to save billing details.");
  if (status !== 200) {
    throw new ServiceError("unavailable", body.error ?? `The profile service returned ${status}.`);
  }
  return billingView(body);
}
