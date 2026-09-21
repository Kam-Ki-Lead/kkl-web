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

/** Credits are whole units — 1 INR = 1 credit (confirmed). */
export function formatCredits(credits: number): string {
  return credits.toLocaleString("en-IN");
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
