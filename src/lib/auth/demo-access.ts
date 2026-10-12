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
 * Production refuses it. Always, whatever else is set, with no override — and
 * on its own line below rather than inside a boolean expression, so no later
 * change can bury it in an `||`.
 *
 * Below production the shortcut exists in one of two situations:
 *
 *   - A sample build that is not doing real sign-in. There is nothing to
 *     bypass: that build already accepts any six digits.
 *   - A deployment that switched it on deliberately with `KKL_DEMO_SIGNIN`.
 *     This is how staging gets it. Staging signs in through kkl-backend and
 *     has no one-time-code provider configured, so without this there is no
 *     way into a signed-in screen at all.
 *
 * The opt-in is its own variable rather than a relaxation of the first case,
 * so that turning the shortcut on is a decision somebody made and can be read
 * off the environment — not a side effect of how the rest of the server
 * happens to be configured. A server that does not set it behaves exactly as
 * it did before this existed.
 */

/** The demo number, as a person types it. */
export const DEMO_MOBILE = "8971741611";

/** The variable that turns the shortcut on where it is not on by default. */
export const DEMO_SIGNIN_ENV = "KKL_DEMO_SIGNIN";

/**
 * Where a demo sign-in lands.
 *
 * The public site, not /account. A demo session holds no backend token, so
 * every account screen asks the API as the account, is refused, and redirects
 * back to sign-in — which is what /account did, leaving the shortcut looking
 * like it had done nothing.
 */
export const DEMO_LANDING = "/";

export type DemoAccessInputs = {
  /** True when screens are rendering sample fixtures rather than real data. */
  readonly sampleData: boolean;
  /** True when sign-in is switched to kkl-backend. */
  readonly authBackend: boolean;
  /** True when the deployment declares itself production. */
  readonly production: boolean;
  /** True when `KKL_DEMO_SIGNIN` turns the shortcut on explicitly. */
  readonly optIn: boolean;
};

export function demoSignInIsAllowed({
  sampleData,
  authBackend,
  production,
  optIn,
}: DemoAccessInputs): boolean {
  if (production) return false;
  return optIn || (sampleData && !authBackend);
}

/**
 * Whether the variable's value turns it on.
 *
 * An explicit affirmative only. An empty string, "0", "false" or "off" — all
 * of which a deployment dashboard will cheerfully store when somebody meant to
 * remove the variable — leave the shortcut off.
 */
export function readDemoSignInOptIn(value: string | undefined): boolean {
  const text = (value ?? "").trim().toLowerCase();
  return text === "on" || text === "1" || text === "true" || text === "yes";
}

/** True for the demo number, however it was typed. */
export function isDemoMobile(mobile: string): boolean {
  return mobile.replace(/\D/g, "").replace(/^91/, "") === DEMO_MOBILE;
}
