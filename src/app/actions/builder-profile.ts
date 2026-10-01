"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServices } from "@/lib/services";
import { profileStoreKind } from "@/lib/services/backend/config";
import { writeBuilderProfile } from "@/lib/services/backend/builder-profile";
import { ServiceError, ValidationError } from "@/lib/services/contracts";
import type { BuilderAccount } from "@/lib/domain/types";

/**
 * B-24 profile.
 *
 * Saves company details and alert preferences. It cannot change verification,
 * subscription or account status — those are decided elsewhere (by an
 * administrator, by a gateway), and there is deliberately no action here that
 * could set any of them.
 */

const schema = z.object({
  companyName: z.string().trim().min(2, "Enter the company name as it should appear on listings."),
  contactName: z.string().trim().min(2, "Enter the name support should use."),
  email: z
    .string()
    .trim()
    .refine((v) => v === "" || z.string().email().safeParse(v).success, {
      message: "Enter a valid email address, or leave it blank.",
    }),
  reraId: z.string().trim(),
});

export type BuilderProfileState = {
  readonly status: "idle" | "saved";
  readonly errors?: Readonly<Record<string, string>>;
  readonly values?: Readonly<Record<string, string>>;
  readonly saved?: BuilderAccount;
};

export async function saveBuilderProfile(
  _previous: BuilderProfileState,
  formData: FormData,
): Promise<BuilderProfileState> {
  const raw = {
    companyName: String(formData.get("companyName") ?? ""),
    contactName: String(formData.get("contactName") ?? ""),
    email: String(formData.get("email") ?? ""),
    reraId: String(formData.get("reraId") ?? ""),
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !errors[key]) errors[key] = issue.message;
    }
    return { status: "idle", errors, values: raw };
  }

  const email = parsed.data.email === "" ? null : parsed.data.email;

  if (profileStoreKind() === "backend") {
    try {
      const written = await writeBuilderProfile({
        companyName: parsed.data.companyName,
        contactName: parsed.data.contactName,
        email,
      });
      revalidatePath("/builder/profile");
      revalidatePath("/builder");
      return { status: "saved", saved: written.account };
    } catch (error) {
      if (error instanceof ValidationError) {
        return { status: "idle", errors: error.fields, values: raw };
      }
      const message =
        error instanceof ServiceError
          ? error.message
          : "The details could not be saved. Please try again.";
      return { status: "idle", errors: { form: message }, values: raw };
    }
  }

  const services = getServices().builder.account;
  await services.saveCompany({
    companyName: parsed.data.companyName,
    contactName: parsed.data.contactName,
    email,
    reraId: parsed.data.reraId === "" ? null : parsed.data.reraId,
  });
  const saved = await services.saveAlerts({
    newEnquiry: formData.get("newEnquiry") === "on",
    siteVisitRequest: formData.get("siteVisitRequest") === "on",
    subscriptionReminders: formData.get("subscriptionReminders") === "on",
  });

  revalidatePath("/builder/profile");
  revalidatePath("/builder");
  return { status: "saved", saved };
}
