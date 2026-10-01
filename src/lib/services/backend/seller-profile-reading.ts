/**
 * S-25 fields the profile resource already carries.
 *
 * Contact name is the profile's full name and display name, kept the same so
 * one field on the screen cannot leave two names disagreeing. Agency name is
 * companyName. The sign-in phone is read and not patched.
 *
 * Alert toggles, business type, service areas, GSTIN, billing, PAN and
 * Aadhaar are not on this resource. They are not folded into companyName,
 * about, or an opt-in.
 */

export const BUSINESS_NOT_ON_PROFILE =
  "Business type, service areas and GSTIN are not fields on the profile, so they were not saved.";

export const BILLING_NOT_ON_PROFILE =
  "Billing name, address and GSTIN are not fields on the profile, so they were not saved.";

export const IDENTITY_NOT_ON_PROFILE =
  "A PAN number and identity documents are not fields on the profile. Nothing was stored.";

export function sellerProfilePatch(input: { contactName: string; agencyName: string }) {
  return {
    fullName: input.contactName,
    displayName: input.contactName,
    companyName: input.agencyName,
  };
}

export function sellerProfileView(body: {
  fullName: string | null;
  displayName?: string | null;
  companyName: string | null;
  signInPhone: string | null;
}) {
  return {
    contactName: body.fullName ?? "",
    agencyName: body.companyName ?? "",
    mobile: body.signInPhone ?? "",
  };
}
