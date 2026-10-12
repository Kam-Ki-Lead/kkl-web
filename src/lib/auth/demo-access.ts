/**
 * The rule that decides whether the review sign-in shortcut exists.
 *
 * WHY THIS EXISTS
 *
 * Review needs a signed-in session to look at. The sample build authenticates
 * nobody — it accepts any six digits and then writes no session at all, so the
 * header still said "Sign in" after a "successful" sign-in. One number now
 * signs in in one step, with no code.
 *
 * WHY IT IS A PURE FUNCTION IN A FILE THAT IMPORTS NOTHING
 *
 * This is an authentication bypass, so the thing that must be tested is the
 * gate, not the convenience. Reading configuration and cookies here would mean
 * the gate could only be exercised inside a running Next server, which in
 * practice means it would not be exercised. The inputs are passed in;
 * `demo-session.ts` is the one line that supplies them.
 *
 * THE GATE
 *
 * Three independent conditions, all of which must hold:
 *
 *   1. The data source is `sample`. On a server reading the real backend the
 *      shortcut is off, whatever else is set.
 *   2. `KKL_AUTH` is not `backend`. A server doing real sign-in does not also
 *      offer a bypass.
 *   3. The deployment does not declare itself production.
 *
 * `assertDeploymentSafe()` already refuses production + sample outright, so (1)
 * alone would do. (2) and (3) are here because an auth bypass is the one place
 * where "one guard was enough" is not a defence anybody wants to make
 * afterwards.
 */

/** The demo number, as a person types it. */
export const DEMO_MOBILE = "8971741611";

export type DemoAccessInputs = {
  /** True when screens are rendering sample fixtures rather than real data. */
  readonly sampleData: boolean;
  /** True when sign-in is switched to kkl-backend. */
  readonly authBackend: boolean;
  /** True when the deployment declares itself production. */
  readonly production: boolean;
};

export function demoSignInIsAllowed({
  sampleData,
  authBackend,
  production,
}: DemoAccessInputs): boolean {
  return sampleData && !authBackend && !production;
}

/** True for the demo number, however it was typed. */
export function isDemoMobile(mobile: string): boolean {
  return mobile.replace(/\D/g, "").replace(/^91/, "") === DEMO_MOBILE;
}
