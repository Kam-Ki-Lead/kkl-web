/**
 * Who is acting, said out loud.
 *
 * Until Admin existed, every service call was implicitly "the one sample
 * Seller" or "the one sample Builder", and the console you were looking at was
 * the only thing that decided which records you got. That does not survive
 * contact with a staff console: an administrator acts *on* accounts, so the
 * account has to be a parameter rather than an assumption.
 *
 * So every service that can touch more than one account takes an actor and a
 * subject explicitly. That is a modelling decision, not a security one, and the
 * distinction matters enough to state twice:
 *
 * **Nothing here authorizes anything.** These are labels travelling with a
 * request in a build that has no sign-in. A `StaffRef` is a value this process
 * made up, not a claim anybody proved. A real implementation derives the actor
 * from an authenticated session server-side and checks permissions against it
 * on every call — it must never accept one from the client, which is exactly
 * what this file's shape would otherwise invite.
 *
 * What making it explicit does buy, today: a service that has to be told which
 * account it is operating on cannot quietly operate on the wrong one, and a
 * reviewer reading a call site can see whose records are about to change.
 */

/** The four kinds of account in the product. */
export type AccountRole = "buyer" | "seller" | "builder" | "staff";

/** An account a request is about. */
export type AccountRef = {
  readonly accountId: string;
  readonly role: AccountRole;
};

/**
 * A member of staff, as recorded against an action.
 *
 * Present so that an audit entry can name an actor. In sample mode there is one
 * staff identity and it is not signed in to anything.
 */
export type StaffRef = {
  readonly staffId: string;
  readonly name: string;
  readonly team: string;
};

/**
 * The consoles a request can arrive from.
 *
 * Several actions — buying a lead, recharging, raising a ticket — exist in both
 * the Seller and the Builder console over separate records, and the form has to
 * say which. That field is **untrusted input**: it arrives from a browser and a
 * browser can send anything.
 *
 * `parseConsoleScope` is therefore a *validator*, not a check: it maps a string
 * to one of two known values and falls back to the Seller. It stops a junk
 * value selecting no service at all. It does not establish that the caller may
 * act as a Builder, because in this build nothing can — there is no session to
 * derive that from. A real implementation reads the role from the
 * authenticated identity and ignores whatever the form said.
 */
export type ConsoleScope = "seller" | "builder";

export function parseConsoleScope(raw: unknown): ConsoleScope {
  return raw === "builder" ? "builder" : "seller";
}

/**
 * The staff identity every Admin action in sample mode is recorded against.
 *
 * One name, fixed, because there is no staff sign-in. A_01 collects an address
 * and a password and authenticates nobody; see `src/app/admin/login/page.tsx`.
 */
export const SAMPLE_STAFF: StaffRef = {
  staffId: "S-04",
  name: "A. Dutta",
  team: "Operations",
};
