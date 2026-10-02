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
 * A purchase of a lead with no applied pricing version may proceed only at the
 * amount the confirmation screen showed.
 *
 * That path omits the expected price and version, and the service then charges
 * the row price. The action re-reads the lead and refuses when the two amounts
 * differ, so the wallet is not charged a different figure. A lead that already
 * has a version is not decided here: the service compares both the amount and
 * the version and returns the current quote when either differs.
 */
export function purchaseQuoteRefusal(quoted: string, current: number | null): string | null {
  if (!/^\d+$/.test(quoted)) {
    return "This confirmation does not include the price that was shown. Open the lead again before buying. Nothing was charged.";
  }
  if (current === null) {
    return "This lead no longer has a price. Nothing was charged.";
  }
  const shown = Number(quoted);
  if (shown !== current) {
    return `The price changed from ${shown.toLocaleString("en-IN")} credits to ${current.toLocaleString("en-IN")} credits. Nothing was charged. Confirm the new amount before buying.`;
  }
  return null;
}

function positiveCreditCount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) return null;
  return value;
}

/**
 * The expected price and version, or nothing.
 *
 * Both travel together. A lead with no applied version omits them so the
 * service charges the row price. A version without a positive price is not a
 * quote this screen can send.
 */
export function purchaseExpectedFields(input: {
  expectedPriceCredits: number;
  expectedConfigurationVersion: number | null;
}): { readonly expectedPriceCredits: number; readonly expectedConfigurationVersion: number } | null {
  const version = input.expectedConfigurationVersion;
  const credits = positiveCreditCount(input.expectedPriceCredits);
  if (version === null || credits === null) return null;
  if (!Number.isSafeInteger(version) || version < 1) return null;
  return { expectedPriceCredits: credits, expectedConfigurationVersion: version };
}

export type PriceChangedQuote = {
  readonly leadId: string;
  readonly priceCredits: number;
  readonly configurationId: string | null;
  readonly configurationVersion: number;
};

/**
 * The quote on a `price_changed` response, when it can be confirmed.
 *
 * A missing version, a missing amount, or any other shape is not turned into
 * a quote. The screen then asks the buyer to open the lead again.
 */
export function readPriceChangedQuote(body: unknown): PriceChangedQuote | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (record.code !== "price_changed") return null;
  const quote = record.quote;
  if (!quote || typeof quote !== "object") return null;
  const row = quote as Record<string, unknown>;
  const priceCredits = positiveCreditCount(row.priceCredits);
  const configurationVersion = positiveCreditCount(row.configurationVersion);
  if (typeof row.leadId !== "string" || priceCredits === null || configurationVersion === null) return null;
  const configurationId = row.configurationId === null
    ? null
    : typeof row.configurationId === "string" ? row.configurationId : undefined;
  if (configurationId === undefined) return null;
  return { leadId: row.leadId, priceCredits, configurationId, configurationVersion };
}

/**
 * A changed quote is a new purchase, so it needs a new idempotency key.
 *
 * A retry of the confirmation that was just submitted keeps the key it already
 * used. Minting another one would make the service treat the retry as a
 * different purchase.
 */
export function nextPurchaseIdempotencyKey(input: {
  previousKey: string;
  sentCredits: number;
  sentVersion: number | null;
  quoteCredits: number;
  quoteVersion: number;
  mint: () => string;
}): string {
  const samePayload = input.sentCredits === input.quoteCredits && input.sentVersion === input.quoteVersion;
  return samePayload ? input.previousKey : input.mint();
}

/** What the confirmation screen says when the service returns a new quote. */
export function priceChangedMessage(input: {
  shownCredits: number;
  shownVersion: number | null;
  priceCredits: number;
  configurationVersion: number;
}): string {
  const amount = input.priceCredits.toLocaleString("en-IN");
  const version = input.configurationVersion.toLocaleString("en-IN");
  const amountClause = input.priceCredits === input.shownCredits
    ? `The price is still ${amount} credits`
    : `The price is now ${amount} credits`;
  const versionClause = input.shownVersion === input.configurationVersion
    ? `the pricing version is still version ${version}`
    : `the pricing version is now version ${version}`;
  return `${amountClause}, and ${versionClause}. Nothing was charged. Confirm this quote before buying.`;
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
