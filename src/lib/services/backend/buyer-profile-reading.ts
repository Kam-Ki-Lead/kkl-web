/**
 * P-15 fields the profile resource already carries.
 *
 * Full name is the profile column. The account name (`displayName`) is a
 * different value, used by support messages, and this form does not edit it.
 * Email, the preferred area and the two contact preferences are profile
 * fields. The sign-in phone is read and not patched.
 */

export function requirementBody(requirement: {
  locationId: string | null;
  configurations: readonly string[];
  minBudgetInr: number | null;
  maxBudgetInr: number | null;
  handoverTiming: string | null;
  intent: "end_use" | "investment" | null;
}) {
  return {
    locationId: requirement.locationId,
    configurations: [...requirement.configurations],
    minBudgetInr: requirement.minBudgetInr,
    maxBudgetInr: requirement.maxBudgetInr,
    handoverTiming: requirement.handoverTiming,
    intent: requirement.intent,
  };
}

export function buyerProfilePatch(input: {
  fullName: string;
  email: string | null;
  preferredLocalityId: string | null;
  notifyByWhatsApp: boolean;
  notifyByEmail: boolean;
}) {
  return {
    fullName: input.fullName,
    contactEmail: input.email,
    primaryLocationId: input.preferredLocalityId,
    whatsappOptIn: input.notifyByWhatsApp,
    emailOptIn: input.notifyByEmail,
  };
}

export function buyerProfileView(body: {
  fullName: string | null;
  displayName?: string | null;
  signInPhone: string | null;
  contactEmail: string | null;
  primaryLocationId: string | null;
  whatsappOptIn: boolean;
  emailOptIn: boolean;
}) {
  return {
    accountName: body.displayName ?? "",
    profile: {
      fullName: body.fullName ?? "",
      mobile: body.signInPhone ?? "Not set",
      email: body.contactEmail,
      preferredLocalityId: body.primaryLocationId,
      notifyByWhatsApp: body.whatsappOptIn,
      notifyByEmail: body.emailOptIn,
    },
  };
}
