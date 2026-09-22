"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServices } from "@/lib/services";

/**
 * S-03 KYC submission.
 *
 * **The document bytes do not pass through this action, and must not.** A PAN or
 * Aadhaar image is among the most sensitive things this product will ever
 * handle: it needs an upload straight to storage kkl-backend controls, a
 * scanning step, an access log and a retention rule, none of which exist. So
 * this action records only *that* files were chosen, plus the PAN number, and
 * says plainly on the screen that nothing was uploaded.
 *
 * Building a fake upload that accepted a file and discarded it would be worse
 * than refusing: a Seller would believe their documents had been submitted.
 *
 * Submitting never approves. `submitKyc` moves the account to `pending`;
 * approval is an administrator decision taken in A-06 and A-07.
 */

const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

const kycSchema = z.object({
  panNumber: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => PAN.test(v), {
      message: "A PAN is five letters, four digits and a letter — for example ABCDE1234F.",
    }),
  hasPanDocument: z.literal(true, {
    message: "Choose a photo or scan of the PAN card.",
  }),
  hasAadhaarDocument: z.literal(true, {
    message: "Choose both sides of the Aadhaar, or the e-Aadhaar PDF.",
  }),
});

export type KycFormState = {
  readonly errors?: Readonly<Record<string, string>>;
  readonly values?: Readonly<Record<string, string>>;
};

/** True when a file input actually holds a file with bytes in it. */
function chose(value: FormDataEntryValue | null): boolean {
  return value instanceof File && value.size > 0;
}

export async function submitKyc(
  _previous: KycFormState,
  formData: FormData,
): Promise<KycFormState> {
  const panNumber = String(formData.get("panNumber") ?? "");

  const parsed = kycSchema.safeParse({
    panNumber,
    hasPanDocument: chose(formData.get("panDocument")),
    hasAadhaarDocument: chose(formData.get("aadhaarDocument")),
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !errors[key]) errors[key] = issue.message;
    }
    return { errors, values: { panNumber } };
  }

  await getServices().sellerAccount.submitKyc({
    panNumber: parsed.data.panNumber,
    hasPanDocument: true,
    hasAadhaarDocument: true,
  });

  revalidatePath("/seller/kyc/status");
  redirect("/seller/kyc/status");
}
