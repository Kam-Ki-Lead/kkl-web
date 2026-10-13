/**
 * The review sign-in shortcut: four accounts, no code.
 *
 * WHY THIS EXISTS
 *
 * A review or a demo needs to walk the four consoles — Buyer, Seller, Builder
 * and Admin — and neither server a reviewer can reach will let anybody in. A
 * sample build authenticates nobody: it accepts any six digits and then writes
 * no session at all, so the header still said "Sign in" afterwards. Staging
 * signs in through kkl-backend, which has no one-time-code provider
 * configured, so it cannot send a code to anybody.
 *
 * Each account's own number, from the sample fixtures, signs straight in and
 * lands on that account's console. No code step.
 *
 * WHY IT IS A PURE MODULE THAT IMPORTS NOTHING
 *
 * This is an authentication bypass, so the thing that must be tested is the
 * gate, not the convenience. Reading configuration and cookies here would mean
 * the gate could only be exercised inside a running Next server, which in
 * practice means it would not be exercised. The inputs are passed in;
 * `demo-session.ts` is the one place that supplies them.
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
 *
 * The opt-in is its own variable rather than a relaxation of the first case,
 * so that turning the shortcut on is a decision somebody made and can be read
 * off the environment. A server that does not set it behaves exactly as it did
 * before this existed.
 */

/** The variable that turns the shortcut on where it is not on by default. */
export const DEMO_SIGNIN_ENV = "KKL_DEMO_SIGNIN";

export type DemoRole = "buyer" | "seller" | "builder" | "admin";

export type DemoAccount = {
  readonly role: DemoRole;
  /** The number the sign-in page shows for this account. */
  readonly mobile: string;
  /** Other numbers that reach the same account, and are not advertised. */
  readonly also?: readonly string[];
  /** Who the fixture says this is. */
  readonly name: string;
  /** What this account is, in the words the site uses. */
  readonly label: string;
  /** The console this account works in. */
  readonly landing: string;
};

/**
 * The four, taken from the sample fixtures rather than invented.
 *
 * Buyer       sample/account-store.ts  DEFAULT_PROFILE
 * Seller      sample/seller-store.ts   SEED_ACCOUNT  (U-10442)
 * Builder     sample/builder-store.ts  SEED_ACCOUNT  (U-20771)
 * Admin       domain/identity.ts       SAMPLE_STAFF  (S-04)
 *
 * The Admin fixture carries no number of its own — the sample Admin screens
 * have no sign-in and render as a constant staff identity — so that one is a
 * number chosen for this list. It is marked so, below, rather than passed off
 * as fixture data.
 */
export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    role: "buyer",
    /*
     * The number that was asked for, which is the one shown. The fixture's own
     * number is kept below rather than dropped: the Buyer screens are rendered
     * from that fixture, so somebody reading the sample data will try it.
     */
    mobile: "8971741611",
    also: ["9830041288"],
    name: "Priya Sen",
    label: "Buyer",
    landing: "/account",
  },
  {
    role: "seller",
    mobile: "9830044182",
    name: "Sujata Pal · Sen Properties",
    label: "Broker",
    landing: "/seller",
  },
  {
    role: "builder",
    mobile: "9830072210",
    name: "Sandeep Barua · Sample Builders Pvt Ltd",
    label: "Builder",
    landing: "/builder",
  },
  {
    /* No fixture number exists for staff; this one belongs to this list. */
    role: "admin",
    mobile: "9830000004",
    name: "A. Dutta · Operations",
    label: "Admin",
    landing: "/admin",
  },
];

/** The number asked for first. It is the Buyer's, and it is shown as such. */
export const DEMO_MOBILE = "8971741611";

/** Ten digits, however it was typed — "+91 98300 41288" and so on. */
export function normaliseMobile(mobile: string): string {
  return mobile.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
}

/** The account a typed number signs in as, or null for every other number. */
export function demoAccountFor(mobile: string): DemoAccount | null {
  const typed = normaliseMobile(mobile);
  return (
    DEMO_ACCOUNTS.find((a) => a.mobile === typed || (a.also ?? []).includes(typed)) ?? null
  );
}

export function accountForRole(role: DemoRole): DemoAccount {
  const account = DEMO_ACCOUNTS.find((a) => a.role === role);
  if (!account) throw new Error(`No demo account for role ${role}.`);
  return account;
}

/** A stored role, or null for a cookie value that is not one of the four. */
export function readDemoRole(value: string | undefined): DemoRole | null {
  return DEMO_ACCOUNTS.find((a) => a.role === value)?.role ?? null;
}

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
