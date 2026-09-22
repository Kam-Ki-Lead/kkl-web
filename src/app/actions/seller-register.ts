"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { runtimeConfig } from "@/lib/config/runtime";

/**
 * S-01 registration.
 *
 * **Nothing here creates an account or authenticates anyone.** It validates the
 * two fields, and in sample mode moves the flow to the next step so the journey
 * can be reviewed. Account creation, code delivery and verification are
 * kkl-backend's, and a frontend that could create a verified seller is a
 * frontend that could create a seller who may buy leads.
 *
 * The number is not carried in the URL to the next step. The same rule as the
 * Buyer enquiry flow: a mobile number in a query string ends up in history,
 * referrers and logs.
 */

const mobileSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number.");

const nameSchema = z
  .string()
  .trim()
  .min(2, "Enter your agency name, or your own name if you work independently.");

export type RegisterState = {
  readonly step: "details" | "code";
  readonly mobile: string;
  readonly agency: string;
  readonly errors?: Readonly<Record<string, string>>;
};

export async function registerStep(
  previous: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const phase = String(formData.get("phase") ?? "details");
  const mobile = String(formData.get("mobile") ?? "").replace(/\D/g, "");
  const agency = String(formData.get("agency") ?? "");

  if (phase === "details") {
    const errors: Record<string, string> = {};
    const m = mobileSchema.safeParse(mobile);
    const a = nameSchema.safeParse(agency);
    if (!m.success) errors.mobile = m.error.issues[0]?.message ?? "Check the number.";
    if (!a.success) errors.agency = a.error.issues[0]?.message ?? "Check the name.";
    if (Object.keys(errors).length > 0) {
      return { step: "details", mobile, agency, errors };
    }
    return { step: "code", mobile, agency };
  }

  if (String(formData.get("intent") ?? "") === "change-number") {
    return { step: "details", mobile: previous.mobile, agency: previous.agency };
  }

  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  const known = { mobile: mobile || previous.mobile, agency: agency || previous.agency };

  if (!/^\d{6}$/.test(code)) {
    return { step: "code", ...known, errors: { code: "Enter the six-digit code." } };
  }

  if (!runtimeConfig.isSampleMode) {
    // There is no real registration path. Guessing one would present an
    // unverified number as verified and an account as created.
    return {
      step: "code",
      ...known,
      errors: { code: "Registration is not available yet. Please try again later." },
    };
  }

  // The prototype's stated sample behaviour: any six digits pass, 000000 shows
  // the invalid state. Nothing is verified against anything.
  if (code === "000000") {
    return {
      step: "code",
      ...known,
      errors: { code: "That code is not correct. Check the digits and try again." },
    };
  }

  redirect("/seller/onboarding");
}
