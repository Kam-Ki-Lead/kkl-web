"use server";

import { revalidatePath } from "next/cache";
import { getServices } from "@/lib/services";

/**
 * B-02 company verification — approved validation (E-P5 correction).
 *
 * The approved screen validates on the two required documents — company PAN
 * and authorised signatory Aadhaar — and its whole error surface is one
 * submit-line message: "Upload PAN and Aadhaar at least before submitting."
 * There is no PAN-number text field in the approved design, so none is
 * validated here; the incorporation certificate and RERA registration are
 * proposed documents (D-15) and stay optional. The approved per-document
 * error box is the format-rejection state, which sample mode cannot reach —
 * no file is ever examined.
 *
 * As with the Seller's KYC, **the document bytes do not pass through this
 * action and must not.** Company papers need storage kkl-backend controls, a
 * scan, an access log and a retention rule, none of which exist. This records
 * only that files were chosen, and the screen says so — a fake upload that
 * accepted a file and discarded it would leave a Builder believing their
 * documents were submitted.
 */
export type VerificationFormState = {
  readonly submitError?: string;
};

function chose(value: FormDataEntryValue | null): boolean {
  return value instanceof File && value.size > 0;
}

export async function submitVerification(
  _previous: VerificationFormState,
  formData: FormData,
): Promise<VerificationFormState> {
  const hasPan = chose(formData.get("panDocument"));
  const hasAadhaar = chose(formData.get("aadhaarDocument"));

  if (!hasPan || !hasAadhaar) {
    return { submitError: "Upload PAN and Aadhaar at least before submitting." };
  }

  await getServices().builder.account.submitVerification({
    hasPanDocument: true,
    hasAadhaarDocument: true,
    hasCompanyDocument: chose(formData.get("companyDocument")),
    hasReraDocument: chose(formData.get("reraDocument")),
  });

  revalidatePath("/builder/verification");
  revalidatePath("/builder");
  return {};
}
