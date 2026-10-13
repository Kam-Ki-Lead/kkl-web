"use server";

import { redirect } from "next/navigation";
import { runtimeConfig } from "@/lib/config/runtime";
import { ServiceError } from "@/lib/services/contracts";
import { authStoreKind } from "@/lib/services/backend/config";
import { confirmEnquiryDestination } from "@/app/actions/enquiry";
import {
  codeRequestBody,
  localIndianMobile,
  safeNext,
} from "@/lib/auth/contract";
import { accountForRole, demoAccountFor, readDemoRole } from "@/lib/auth/demo-access";
import {
  demoSignInWorks,
  endDemoSession,
  startDemoSession,
} from "@/lib/auth/demo-session";
import {
  clearChallenge,
  exchangeCode,
  readChallenge,
  requestAuthCode,
  revokeSession,
  withIssuedAccess,
  writeSession,
} from "@/lib/auth/backend";

/**
 * P-06 verification, as a server action.
 *
 * It is a server action rather than a click handler so the step works before —
 * or without — client JavaScript. A form that silently degrades to a GET loses
 * the `next` target and the entered number, which would drop a half-finished
 * enquiry on the floor.
 *
 * `otpStep` is one action handling both phases, because progressive enhancement
 * needs the form's action to BE a server action. Wrapping two actions in a
 * client closure and passing that to useActionState looks equivalent and is
 * not: the closure only exists once JavaScript has run, so the form does
 * nothing at all before hydration.
 *
 * With `KKL_AUTH` unset this still authenticates nobody: any six digits
 * continue, and `000000` is the invalid state. With `KKL_AUTH=backend` the
 * code is the published authenticator's, a failure is shown, and the sample
 * step does not stand in. The role on the request is never read from the form.
 */

export type OtpState = {
  readonly step: "mobile" | "code";
  readonly mobile: string;
  readonly error?: string;
  /** `local` means the development channel accepted the code and nothing was sent. */
  readonly delivery?: "local" | "other";
};

/** The pending-enquiry handoff, recognised so the submission happens here. */
const ENQUIRY_CONFIRM = "/enquiry/confirm";

/**
 * Single entry point for both phases, so the form can post to a real server
 * action and work before hydration.
 */
export async function otpStep(previous: OtpState, formData: FormData): Promise<OtpState> {
  return String(formData.get("phase")) === "request"
    ? requestCode(previous, formData)
    : verifyCode(previous, formData);
}

export async function requestCode(_previous: OtpState, formData: FormData): Promise<OtpState> {
  const mobile = localIndianMobile(String(formData.get("mobile") ?? ""));
  if (!mobile) {
    return { step: "mobile", mobile: String(formData.get("mobile") ?? "").replace(/\D/g, ""), error: "Enter a 10-digit Indian mobile number." };
  }

  /*
   * A review account signs in here, with no code step at all, and lands on its
   * own console.
   *
   * Ahead of the branch below, not inside it, because the server this is for —
   * staging — has sign-in switched to kkl-backend and no one-time-code
   * provider configured, so the branch below would ask a real API to send a
   * code it cannot send. `demoSignInAllowed()` is what decides whether this
   * runs; see demo-access.ts for the rule and for why the cookie it writes is
   * not a credential. Every other number falls through, and on a server where
   * the shortcut is off these numbers do too.
   *
   * The landing is the account's own console, never the requested `next`:
   * `safeNext("")` defaults to /account, which is the Buyer's console and the
   * wrong room for three of the four.
   *
   * `demoSignInWorks()` is both halves of the question — allowed here, and
   * able to open the console it signs in to. Where it is false these numbers
   * fall through like any other, which is what sends staging to the real code
   * path.
   */
  const demo = demoAccountFor(mobile);
  if (demo && demoSignInWorks()) {
    await startDemoSession(demo);
    redirect(demo.landing);
  }

  if (authStoreKind() !== "backend") {
    if (!runtimeConfig.isSampleMode) {
      return {
        step: "mobile",
        mobile,
        error: "Verification is not available yet. Please try again later.",
      };
    }
    return { step: "code", mobile };
  }

  // `role` and `intent` are not read. A new number becomes the backend's
  // default account type; an existing account keeps the role on its row.
  const result = await requestAuthCode(codeRequestBody(mobile).phone);
  if (!result.ok) {
    return { step: "mobile", mobile, error: result.problem.message };
  }
  return { step: "code", mobile, delivery: result.challenge.delivery };
}

export async function verifyCode(previous: OtpState, formData: FormData): Promise<OtpState> {
  const intent = String(formData.get("intent") ?? "");
  const mobile = localIndianMobile(String(formData.get("mobile") ?? "")) ?? previous.mobile;

  if (intent === "change-number") {
    if (authStoreKind() === "backend") await clearChallenge();
    return { step: "mobile", mobile };
  }

  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  const next = safeNext(String(formData.get("next") ?? ""));

  if (!/^\d{6}$/.test(code)) {
    return { step: "code", mobile, error: "Enter the six-digit code.", delivery: previous.delivery };
  }

  if (authStoreKind() !== "backend") {
    if (!runtimeConfig.isSampleMode) {
      return {
        step: "code",
        mobile,
        error: "Verification is not available yet. Please try again later.",
      };
    }
    // The approved prototype's stated sample behaviour: any six digits pass,
    // 000000 shows the invalid state. Nothing is verified against anything.
    if (code === "000000") {
      return {
        step: "code",
        mobile,
        error: "That code is not correct. Check the digits and try again.",
      };
    }
    redirect(next === ENQUIRY_CONFIRM ? await confirmEnquiryDestination() : next);
  }

  const result = await exchangeCode(code);
  if (!result.ok) {
    const challenge = await readChallenge();
    const expiredLocally = result.problem.message === "That code has expired. Request a new one.";
    return {
      step: expiredLocally ? "mobile" : "code",
      mobile,
      error: result.problem.message,
      delivery: challenge?.delivery ?? previous.delivery,
    };
  }

  await writeSession(result.session);

  let destination: string;
  try {
    destination = next === ENQUIRY_CONFIRM
      ? await withIssuedAccess(result.session.accessToken, () => confirmEnquiryDestination())
      : next;
  } catch (error) {
    if (error instanceof ServiceError) {
      return { step: "code", mobile, error: error.message, delivery: previous.delivery };
    }
    throw error;
  }

  redirect(destination);
}

/**
 * One review account, straight in.
 *
 * The role is a key into the fixed table in demo-access.ts, never a path or a
 * destination from the form — a bypass whose landing page comes out of a
 * request body is a redirect anybody can aim. Refuses outright wherever the
 * shortcut is off, by doing nothing at all.
 */
export async function demoAccountSignIn(formData: FormData): Promise<void> {
  if (!demoSignInWorks()) return;
  const role = readDemoRole(String(formData.get("role") ?? ""));
  if (!role) return;
  const account = accountForRole(role);
  await startDemoSession(account);
  redirect(account.landing);
}

/** Ends this session, or every session, then returns to sign-in. */
export async function signOut(formData: FormData): Promise<void> {
  // Unconditional: a stale demo cookie on a server that no longer allows one
  // is ignored by `hasDemoSession`, but there is no reason to leave it behind.
  await endDemoSession();
  if (authStoreKind() === "backend") {
    try {
      await revokeSession(formData.get("everywhere") === "1");
    } catch (error) {
      if (!(error instanceof ServiceError)) throw error;
    }
  }
  redirect("/auth");
}
