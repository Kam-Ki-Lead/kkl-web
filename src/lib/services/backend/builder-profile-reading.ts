/**
 * B-24 fields the profile resource already carries.
 *
 * Contact name is the account display name: the name support messages use.
 * It is not the profile full name, and this form does not send fullName.
 * Company name is companyName. Email is contactEmail.
 *
 * RERA registration is a listing field. The three alert toggles are not
 * whatsappOptIn or emailOptIn. Verification and subscription are not profile
 * fields. None of those are written from this form.
 */

export const RERA_NOT_ON_PROFILE =
  "Add the RERA registration number on the property listing. This profile does not store it.";

export const ALERTS_NOT_ON_PROFILE =
  "These choices are unavailable. This profile does not store them, and no alert is sent.";

export function builderProfilePatch(input: {
  contactName: string;
  companyName: string;
  email: string | null;
}) {
  return {
    displayName: input.contactName,
    companyName: input.companyName,
    contactEmail: input.email,
  };
}

export function builderProfileView(body: {
  accountId?: string;
  fullName: string | null;
  displayName?: string | null;
  companyName: string | null;
  signInPhone: string | null;
  contactEmail?: string | null;
  status?: string | null;
}): {
  id: string;
  contactName: string;
  profileFullName: string | null;
  companyName: string;
  mobile: string;
  email: string | null;
  accountStatus: "active" | "suspended" | null;
} {
  const accountStatus: "active" | "suspended" | null =
    body.status === "suspended" ? "suspended" : body.status === "active" ? "active" : null;
  return {
    id: body.accountId ?? "profile",
    contactName: body.displayName ?? "",
    profileFullName: body.fullName,
    companyName: body.companyName ?? "",
    mobile: body.signInPhone ?? "",
    email: body.contactEmail ?? null,
    accountStatus,
  };
}
