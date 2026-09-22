"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { runtimeConfig } from "@/lib/config/runtime";

/**
 * B-01 registration.
 *
 * Nothing here creates an account or authenticates anyone. It validates the
 * fields and, in sample mode, moves the flow on so the journey can be reviewed.
 * Account creation and code delivery are kkl-backend's.
 *
 * The number is not carried in the URL, for the same reason as everywhere else
 * in this application: a mobile number in a query string ends up in history,
 * referrers and logs.
 */

const mobileSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number.");

const companySchema = z
  .string()
  .trim()
  .min(2, "Enter the company name as it should appear on listings and invoices.");

export type BuilderRegisterState = {
  readonly step: "details" | "code";
  readonly mobile: string;
  readonly company: string;
  readonly errors?: Readonly<Record<string, string>>;
};

export async function builderRegisterStep(
  previous: BuilderRegisterState,
  formData: FormData,
): Promise<BuilderRegisterState> {
  const phase = String(formData.get("phase") ?? "details");
  const mobile = String(formData.get("mobile") ?? "").replace(/\D/g, "");
  const company = String(formData.get("company") ?? "");

  if (phase === "details") {
    const errors: Record<string, string> = {};
    const m = mobileSchema.safeParse(mobile);
    const c = companySchema.safeParse(company);
    if (!m.success) errors.mobile = m.error.issues[0]?.message ?? "Check the number.";
    if (!c.success) errors.company = c.error.issues[0]?.message ?? "Check the name.";
    if (Object.keys(errors).length > 0) return { step: "details", mobile, company, errors };
    return { step: "code", mobile, company };
  }

  if (String(formData.get("intent") ?? "") === "change-number") {
    return { step: "details", mobile: previous.mobile, company: previous.company };
  }

  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  const known = { mobile: mobile || previous.mobile, company: company || previous.company };

  if (!/^\d{6}$/.test(code)) {
    return { step: "code", ...known, errors: { code: "Enter the six-digit code." } };
  }
  if (!runtimeConfig.isSampleMode) {
    return {
      step: "code",
      ...known,
      errors: { code: "Registration is not available yet. Please try again later." },
    };
  }
  if (code === "000000") {
    return {
      step: "code",
      ...known,
      errors: { code: "That code is not correct. Check the digits and try again." },
    };
  }

  redirect("/builder/verification");
}
