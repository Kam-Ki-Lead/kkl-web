import type { PriceRange } from "@/lib/domain/types";

/**
 * Indian price formatting, as it appears throughout the approved package:
 * "₹78L – ₹1.4Cr", "₹52L – ₹85L", "₹1.05Cr – ₹1.6Cr".
 */
export function formatInr(amount: number): string {
  if (amount >= 10_000_000) {
    return `₹${trim(amount / 10_000_000)}Cr`;
  }
  if (amount >= 100_000) {
    return `₹${trim(amount / 100_000)}L`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

function trim(value: number): string {
  // Two decimals below 10 (₹1.05Cr), one above (₹1.4Cr), none when whole (₹78L).
  const decimals = value < 10 ? 2 : 1;
  return String(Number(value.toFixed(decimals)));
}

export function formatPriceRange(price: PriceRange): string | null {
  const { minInr, maxInr } = price;
  if (minInr === null && maxInr === null) return null;
  if (minInr !== null && maxInr !== null) {
    return minInr === maxInr ? formatInr(minInr) : `${formatInr(minInr)} – ${formatInr(maxInr)}`;
  }
  return minInr !== null ? `${formatInr(minInr)} onwards` : `Up to ${formatInr(maxInr as number)}`;
}

/** "2, 3 BHK" */
export function formatConfigurations(configurations: readonly string[]): string {
  if (configurations.length === 0) return "";
  const numbers = configurations.map((c) => c.replace(/\s*BHK\s*/i, "").trim());
  return `${numbers.join(", ")} BHK`;
}

/**
 * A location path as the approved screens read it: the two most specific
 * segments, most specific first.
 *
 * ["Kolkata","New Town","Action Area I"] -> "Action Area I, New Town"
 * ["Kolkata","Rajarhat"]                 -> "Rajarhat, Kolkata"
 *
 * Taking the last two rather than dropping the city keeps a two-segment path
 * from rendering as a bare locality with no city at all.
 */
export function formatAreaPath(path: readonly string[]): string {
  return path.slice(-2).reverse().join(", ");
}

/**
 * Exact rupees, never abbreviated.
 *
 * Distinct from `formatInr`, which shortens to L and Cr for property prices. A
 * ledger entry, an invoice total or a credit balance has to be exact: "₹1.04L"
 * on a receipt for ₹1,04,000 is not a figure anyone can reconcile.
 */
export function formatExactInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

/** Credits are whole units — 1 INR = 1 credit (confirmed). */
export function formatCredits(credits: number): string {
  return credits.toLocaleString("en-IN");
}

/** "₹4,200 credits", the form the approved Seller screens use. */
export function formatCreditBalance(credits: number): string {
  return `${formatExactInr(credits)} credits`;
}

/** Signed, for ledger rows: a debit reads −₹1,040, a credit +₹2,000. */
export function formatSignedInr(amount: number): string {
  return `${amount < 0 ? "−" : "+"}${formatExactInr(Math.abs(amount))}`;
}

/*
 * Dates are formatted in Asia/Kolkata explicitly.
 *
 * Without a zone, a server in UTC and a browser in IST render the same instant
 * as different days: a hydration mismatch, and a wrong date on a receipt. The
 * audience is in one timezone, so it is named rather than inferred from wherever
 * the code happens to run.
 */
const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

const DATE_TIME = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

export function formatDate(iso: string | null): string {
  return iso ? DATE.format(new Date(iso)) : "—";
}

export function formatDateTime(iso: string | null): string {
  return iso ? DATE_TIME.format(new Date(iso)) : "—";
}
