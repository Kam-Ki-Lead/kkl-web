"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServices } from "@/lib/services";

/**
 * B-02 company verification.
 *
 * As with the Seller's KYC, **the document bytes do not pass through this
 * action and must not.** Company incorporation papers and a PAN need storage
 * kkl-backend controls, a scan, an access log and a retention rule, none of
 * which exist. This records only that files were chosen, and the screen says so
 * — a fake upload that accepted a file and discarded it would leave a Builder
 * believing their documents were submitted.
 *
 * Which company documents are actually required is D-15 and is not confirmed,
 * so the screen asks for the two that are named and says the list may grow.
 */

const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

const schema = z.object({
  panNumber: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => PAN.test(v), {
      message: "A PAN is five letters, four digits and a letter — for example AAACS1234Q.",
    }),
  hasPanDocument: z.literal(true, { message: "Choose a photo or scan of the company PAN." }),
  hasCompanyDocument: z.literal(true, {
    message: "Choose the incorporation certificate or partnership deed.",
  }),
});

export type VerificationFormState = {
  readonly errors?: Readonly<Record<string, string>>;
  readonly values?: Readonly<Record<string, string>>;
};

function chose(value: FormDataEntryValue | null): boolean {
  return value instanceof File && value.size > 0;
}

export async function submitVerification(
  _previous: VerificationFormState,
  formData: FormData,
): Promise<VerificationFormState> {
  const panNumber = String(formData.get("panNumber") ?? "");
  const parsed = schema.safeParse({
    panNumber,
    hasPanDocument: chose(formData.get("panDocument")),
    hasCompanyDocument: chose(formData.get("companyDocument")),
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !errors[key]) errors[key] = issue.message;
    }
    return { errors, values: { panNumber } };
  }

  await getServices().builder.account.submitVerification({
    panNumber: parsed.data.panNumber,
    hasPanDocument: true,
    hasCompanyDocument: true,
  });

  revalidatePath("/builder/verification");
  revalidatePath("/builder");
  return {};
}
