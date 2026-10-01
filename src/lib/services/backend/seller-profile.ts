import type { SellerAccount } from "@/lib/domain/types";
import { ServiceError, ValidationError } from "@/lib/services/contracts";
import { callAs } from "./session";
import { sellerProfilePatch, sellerProfileView } from "./seller-profile-reading";

/**
 * The signed-in account's profile, for the seller profile screen.
 *
 * Contact name writes the account display name. Agency name writes
 * companyName. The profile full name is not sent. The phone is the sign-in
 * number and stays read-only. Alert preferences are not on this resource.
 */

type BackendProfile = {
  accountId?: string;
  fullName: string | null;
  displayName?: string | null;
  companyName: string | null;
  signInPhone: string | null;
  error?: string;
  field?: string;
};

function asAccount(body: BackendProfile): SellerAccount {
  const view = sellerProfileView(body);
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
    accountStatus: "active",
    alerts: {
      newLeadsInMyAreas: false,
      viewedLeadOnSale: false,
      lowBalance: false,
    },
  };
}

export async function readSellerProfile(): Promise<{
  account: SellerAccount;
  profileFullName: string | null;
}> {
  const { status, body } = await callAs<BackendProfile>("seller", "/v1/me/profile");
  if (status === 401) throw new ServiceError("unauthenticated", "Sign in to read this profile.");
  if (status !== 200) {
    throw new ServiceError("unavailable", body.error ?? `The profile service returned ${status}.`);
  }
  return { account: asAccount(body), profileFullName: sellerProfileView(body).profileFullName };
}

export async function writeSellerProfile(input: {
  contactName: string;
  agencyName: string;
}): Promise<SellerAccount> {
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
  return asAccount(body);
}
