import type { BuyerProfile } from "@/lib/domain/types";
import type { ProfileService } from "@/lib/services/contracts";
import { ServiceError, ValidationError } from "@/lib/services/contracts";
import { buyerProfilePatch, buyerProfileView } from "./buyer-profile-reading";
import { callAs } from "./session";

/**
 * P-15 — the Buyer profile, served by kkl-backend.
 *
 * The mobile number is read-only here and arrives masked. It is the number
 * that signs in, changed by re-verification rather than by typing over it, and
 * kkl-backend refuses a profile edit that tries to touch it.
 *
 * The two notification opt-ins are consent. They default to off, only the
 * person themselves sets them, and nothing in this adapter infers one.
 *
 * Full name writes the profile column only. The account name is a separate
 * field and is not copied from the full name.
 */

type BackendProfile = {
  displayName: string;
  signInPhone: string | null;
  contactEmail: string | null;
  fullName: string | null;
  primaryLocationId: string | null;
  whatsappOptIn: boolean;
  emailOptIn: boolean;
};

const toProfile = (p: BackendProfile): BuyerProfile => buyerProfileView(p).profile;

export async function readBuyerProfile(): Promise<{
  profile: BuyerProfile;
  accountName: string;
}> {
  const { status, body } = await callAs<BackendProfile>("buyer", "/v1/me/profile");
  if (status === 401) throw new ServiceError("unauthenticated", "Sign in to read this profile.");
  if (status !== 200) {
    throw new ServiceError("unavailable", body.error ?? `Profile service returned ${status}.`);
  }
  return buyerProfileView(body);
}

export const backendProfile: ProfileService = {
  async get() {
    return (await readBuyerProfile()).profile;
  },

  async save(input) {
    const { status, body } = await callAs<BackendProfile>("buyer", "/v1/me/profile", {
      method: "PATCH",
      body: buyerProfilePatch({
        fullName: input.fullName,
        email: input.email,
        preferredLocalityId: input.preferredLocalityId,
        notifyByWhatsApp: input.notifyByWhatsApp,
        notifyByEmail: input.notifyByEmail,
      }),
    });

    if (status === 422) {
      // kkl-backend names one field at a time; the form shows errors by field,
      // so the backend's field name is mapped to the form's.
      const field = body.field ?? "fullName";
      const formField = { contactEmail: "email", primaryLocationId: "preferredLocalityId" }[field] ?? field;
      throw new ValidationError({ [formField]: body.error ?? "This value was not accepted." });
    }
    if (status !== 200) {
      throw new ServiceError("unavailable", body.error ?? `Profile service returned ${status}.`);
    }
    return toProfile(body);
  },
};
