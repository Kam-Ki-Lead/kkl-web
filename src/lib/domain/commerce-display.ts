import type { MarketplaceLead, ContactAccessState } from "@/lib/domain/types";

/**
 * How the screens say "there is no answer to that yet".
 *
 * Written once, because the alternative is twelve slightly different
 * sentences and a reader who cannot tell whether they mean the same thing.
 * Each of these stands in for a value the backend legitimately does not have,
 * and none of them is a placeholder that could be mistaken for data: no ₹0, no
 * zero score, no `98••••••45`.
 *
 * The layouts do not change. A price cell still holds one line of text in the
 * same slot; it just says something true.
 */

export const UNPRICED_LABEL = "Not priced yet";
export const UNPRICED_DETAIL =
  "No lead price is configured, so this lead cannot be bought. What a lead costs is "
  + "an open commercial decision.";

export const NO_QUALIFICATION_LABEL = "No qualification call yet";
export const NO_QUALIFICATION_DETAIL =
  "Nobody has spoken to this enquirer, so there is no call summary, intent score or "
  + "consent record to show.";

export const NOT_SCORED_LABEL = "Not scored";

/** A price, or the sentence that says why there is none. */
export function priceLabel(credits: number | null, format: (n: number) => string): string {
  return credits === null ? UNPRICED_LABEL : format(credits);
}

/**
 * The first blocker a screen should explain beside a disabled action.
 *
 * First, not all of them: a person deciding whether to press a button needs
 * the reason it is off, and a list of five reasons is a worse answer than the
 * one that is actually in the way. The full list stays on the object for
 * anybody who wants it.
 */
export function primaryBlocker(lead: Pick<MarketplaceLead, "blockers">):
  { readonly code: string; readonly reason: string } | null {
  return lead.blockers[0] ?? null;
}

export type PurchaseHoldKind = "unpriced" | "unverified" | "funds" | "refused" | null;

/**
 * Why a marketplace purchase cannot be confirmed, from the lead's own blockers.
 *
 * A missing price stays the unpriced state. Verification, balance and every
 * other refusal use the sentence the service sent. This does not consult a
 * sample account's verification or suspension.
 */
export function purchaseHold(input: {
  priceCredits: number | null;
  balanceCredits: number;
  blockers: readonly { readonly code: string; readonly reason: string }[];
}): { readonly kind: PurchaseHoldKind; readonly reason: string | null; readonly shortfall: number } {
  const shortfall =
    input.priceCredits === null ? 0 : Math.max(0, input.priceCredits - input.balanceCredits);
  const byCode = (code: string) => input.blockers.find((blocker) => blocker.code === code);
  const unpriced = byCode("lead_price_not_configured");
  if (input.priceCredits === null || unpriced) {
    return { kind: "unpriced", reason: unpriced?.reason ?? null, shortfall };
  }
  const verification = byCode("verification_required");
  if (verification) return { kind: "unverified", reason: verification.reason, shortfall };
  const funds = byCode("insufficient_credits");
  if (funds) return { kind: "funds", reason: funds.reason, shortfall };
  const first = input.blockers[0];
  if (first) return { kind: "refused", reason: first.reason, shortfall };
  return { kind: null, reason: null, shortfall };
}

/**
 * The contact line for a recipient's enquiry.
 *
 * Returns what to *render*, never a value to unmask. Under
 * `awaiting_decision` — every deployment today — that is a sentence saying
 * the rule has not been confirmed, and deliberately not a masked number: a
 * mask implies a real value is being withheld under a rule somebody agreed
 * to, and no such rule exists.
 */
export function contactAccessLine(access: ContactAccessState): {
  readonly text: string;
  readonly tone: "muted" | "warning" | "success";
  readonly actionable: boolean;
} {
  switch (access.state) {
    case "available":
      return { text: access.label, tone: "success", actionable: false };
    case "locked":
      return { text: access.label, tone: "warning", actionable: access.selectedMode === "paid_unlock" };
    default:
      return { text: access.label, tone: "muted", actionable: false };
  }
}
