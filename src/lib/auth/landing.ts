/**
 * Where an account lands when it signs in without asking for somewhere.
 *
 * A session has a role, and the roles work in different rooms. Signing a
 * Broker in and putting them on the Buyer's /account is not a small
 * imprecision: that screen shows their enquiries and their shortlist, neither
 * of which is where their work is, and the console they wanted is not linked
 * from it in an obvious way.
 *
 * WHY THE DEFAULT WAS /account
 * `safeNext("")` returns /account, which is right for the enquiry flow this
 * sign-in was first built for — a buyer part-way through an enquiry — and
 * wrong for everybody else. This is consulted ONLY when nothing asked for a
 * destination; a `next` that came with the request still wins, because
 * somebody being sent back to the page they were on matters more than the
 * tidiness of landing in your own console.
 *
 * The role comes from the session the API issued. It is never read from a
 * form, a cookie or a query string — a destination that arrives in a request
 * is a redirect anybody can aim.
 */

export type AccountRole = "buyer" | "seller" | "builder" | "owner" | "staff";

const CONSOLES: Record<AccountRole, string> = {
  buyer: "/account",
  seller: "/seller",
  builder: "/builder",
  // An owner lists a property and watches the enquiries on it; both live
  // under the account area. There is no separate owner console to send them to.
  owner: "/account",
  staff: "/admin",
};

/** The console this role works in. Unknown or absent roles get the account area. */
export function consoleFor(role: string | null | undefined): string {
  return CONSOLES[role as AccountRole] ?? "/account";
}
