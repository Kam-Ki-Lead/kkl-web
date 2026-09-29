import type { BuyerProfile } from "@/lib/domain/types";
import type { ProfileService } from "@/lib/services/contracts";
import { ServiceError, ValidationError } from "@/lib/services/contracts";
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

const toProfile = (p: BackendProfile): BuyerProfile => ({
  fullName: p.fullName ?? p.displayName,
  mobile: p.signInPhone ?? "Not set",
  email: p.contactEmail,
  preferredLocalityId: p.primaryLocationId,
  notifyByWhatsApp: p.whatsappOptIn,
  notifyByEmail: p.emailOptIn,
});

export const backendProfile: ProfileService = {
  async get() {
    const { status, body } = await callAs<BackendProfile>("buyer", "/v1/me/profile");
    if (status !== 200) {
      throw new ServiceError("unavailable", body.error ?? `Profile service returned ${status}.`);
    }
    return toProfile(body);
  },

  async save(input) {
    const { status, body } = await callAs<BackendProfile>("buyer", "/v1/me/profile", {
      method: "PATCH",
      body: {
        fullName: input.fullName,
        // The display name follows the full name: one field on the screen
        // should not leave two names disagreeing in the record.
        displayName: input.fullName,
        contactEmail: input.email,
        primaryLocationId: input.preferredLocalityId,
        whatsappOptIn: input.notifyByWhatsApp,
        emailOptIn: input.notifyByEmail,
      },
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
