/**
 * S-25 fields the profile resource already carries.
 *
 * Contact name is the account display name: the name support messages use.
 * It is written with setDisplayName and is not the profile's fullName.
 * The form has no full-name control, so a stored fullName is left as it is.
 * Agency name is companyName. The sign-in phone is read and not patched.
 *
 * Alert toggles, business type, service areas, GSTIN, billing, PAN and
 * Aadhaar are not on this resource. They are not folded into companyName,
 * about, or an opt-in.
 */

export const BUSINESS_NOT_ON_PROFILE =
  "Business type, service areas and GSTIN are not fields on the profile, so they were not saved.";

export const BILLING_NOT_ON_PROFILE =
  "Billing name, address and GSTIN are not fields on the profile, so they were not saved.";

export function billingPatch(input: {
  billingName: string;
  gstin: string | null;
  addressLines: readonly string[];
  invoiceEmail: string | null;
  contactName: string | null;
}) {
  return {
    billing: {
      billingName: input.billingName,
      gstin: input.gstin,
      addressLines: [...input.addressLines],
      invoiceEmail: input.invoiceEmail,
      contactName: input.contactName,
    },
  };
}

export function billingView(body: {
  billing?: {
    billingName?: string | null;
    gstin?: string | null;
    addressLines?: readonly string[] | null;
    invoiceEmail?: string | null;
    contactName?: string | null;
  } | null;
}) {
  const billing = body.billing;
  if (!billing) {
    return {
      billingName: "",
      gstin: null,
      addressLines: [] as string[],
      invoiceEmail: null,
      contactName: null,
    };
  }
  return {
    billingName: billing.billingName ?? "",
    gstin: billing.gstin ?? null,
    addressLines: [...(billing.addressLines ?? [])],
    invoiceEmail: billing.invoiceEmail ?? null,
    contactName: billing.contactName ?? null,
  };
}

export const IDENTITY_NOT_ON_PROFILE =
  "A PAN number and identity documents are not fields on the profile. Nothing was stored.";

export function sellerProfilePatch(input: { contactName: string; agencyName: string }) {
  return {
    displayName: input.contactName,
    companyName: input.agencyName,
  };
}

export function sellerProfileView(body: {
  fullName: string | null;
  displayName?: string | null;
  companyName: string | null;
  signInPhone: string | null;
  status?: string | null;
}): {
  contactName: string;
  profileFullName: string | null;
  agencyName: string;
  mobile: string;
  accountStatus: "active" | "suspended" | null;
} {
  const accountStatus: "active" | "suspended" | null =
    body.status === "suspended" ? "suspended" : body.status === "active" ? "active" : null;
  return {
    contactName: body.displayName ?? "",
    profileFullName: body.fullName,
    agencyName: body.companyName ?? "",
    mobile: body.signInPhone ?? "",
    accountStatus,
  };
}
