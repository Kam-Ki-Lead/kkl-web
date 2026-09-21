"use server";

import { redirect } from "next/navigation";
import { runtimeConfig } from "@/lib/config/runtime";

/**
 * P-06 verification, as a server action.
 *
 * It is a server action rather than a click handler so the step works before —
 * or without — client JavaScript. A form that silently degrades to a GET loses
 * the `next` target and the entered number, which would drop a half-finished
 * enquiry on the floor.
 *
 * **This does not authenticate anyone.** In sample mode no message is sent and
 * no session is created; the step exists so the journey can be reviewed end to
 * end. Real verification belongs to kkl-backend, and nothing here writes an
 * identity claim that anything downstream trusts.
 */

export type OtpState = {
  readonly step: "mobile" | "code";
  readonly mobile: string;
  readonly error?: string;
};

function safeNext(raw: string): string {
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/account/enquiries";
}

export async function requestCode(_previous: OtpState, formData: FormData): Promise<OtpState> {
  const mobile = String(formData.get("mobile") ?? "").replace(/\D/g, "");
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return { step: "mobile", mobile, error: "Enter a 10-digit Indian mobile number." };
  }
  return { step: "code", mobile };
}

export async function verifyCode(previous: OtpState, formData: FormData): Promise<OtpState> {
  const intent = String(formData.get("intent") ?? "");
  const mobile = String(formData.get("mobile") ?? "").replace(/\D/g, "");

  if (intent === "change-number") {
    return { step: "mobile", mobile };
  }

  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  const next = safeNext(String(formData.get("next") ?? ""));

  if (!/^\d{6}$/.test(code)) {
    return { step: "code", mobile: mobile || previous.mobile, error: "Enter the six-digit code." };
  }

  // The approved prototype's stated sample behaviour: any six digits pass,
  // 000000 shows the invalid state. Nothing is verified against anything.
  if (runtimeConfig.isSampleMode && code === "000000") {
    return {
      step: "code",
      mobile: mobile || previous.mobile,
      error: "That code is not correct. Check the digits and try again.",
    };
  }

  if (!runtimeConfig.isSampleMode) {
    // There is no real verification path yet, and guessing one would be worse
    // than refusing: it would present an unverified number as verified.
    return {
      step: "code",
      mobile: mobile || previous.mobile,
      error: "Verification is not available yet. Please try again later.",
    };
  }

  redirect(next);
}
