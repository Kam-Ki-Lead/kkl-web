"use server";

import { revalidatePath } from "next/cache";
import { getServices } from "@/lib/services";
import { ValidationError } from "@/lib/services/contracts";
import type { BuyerProfile } from "@/lib/domain/types";

export type ProfileFormState = {
  readonly status: "idle" | "saved" | "error";
  readonly errors?: Readonly<Record<string, string>>;
  /** What the person typed, returned on failure so nothing is retyped. */
  readonly values?: Readonly<Record<string, string | boolean>>;
  readonly saved?: BuyerProfile;
};

/**
 * P-15 save.
 *
 * Validation lives in the service, not the form, so the same rules apply however
 * the profile is changed. Field errors come back positioned, and the entered
 * values come back with them.
 */
export async function saveProfile(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const values = {
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    preferredLocalityId: String(formData.get("preferredLocalityId") ?? ""),
    notifyByWhatsApp: formData.get("notifyByWhatsApp") === "on",
    notifyByEmail: formData.get("notifyByEmail") === "on",
  };

  try {
    const saved = await getServices().profile.save({
      fullName: values.fullName,
      email: values.email.trim() === "" ? null : values.email,
      preferredLocalityId: values.preferredLocalityId || null,
      notifyByWhatsApp: values.notifyByWhatsApp,
      notifyByEmail: values.notifyByEmail,
    });
    revalidatePath("/account/profile");
    return { status: "saved", saved };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { status: "error", errors: error.fields, values };
    }
    return {
      status: "error",
      errors: { form: "The details could not be saved. Please try again." },
      values,
    };
  }
}
