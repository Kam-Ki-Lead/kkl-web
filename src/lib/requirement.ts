import type { BuyerRequirement, PurchaseIntent } from "@/lib/domain/types";

/**
 * The buyer requirement (P-08 to P-10) is carried in the URL.
 *
 * That makes back, forward, reload and share work without any client state:
 * step 3's Back really is the browser's Back, and nothing entered is lost by a
 * refresh. It also means each step can be a plain GET form that works before
 * JavaScript loads.
 */

export const REQUIREMENT_STEPS = 5;

export const HANDOVER_OPTIONS = [
  "Ready to move",
  "Within 6 months",
  "Within 1 year",
  "1–2 years, no rush",
] as const;

export const BUDGET_OPTIONS: ReadonlyArray<{
  label: string;
  minInr: number | null;
  maxInr: number | null;
}> = [
  { label: "Up to ₹50L", minInr: null, maxInr: 5_000_000 },
  { label: "₹50L – ₹1Cr", minInr: 5_000_000, maxInr: 10_000_000 },
  { label: "₹1Cr – ₹1.5Cr", minInr: 10_000_000, maxInr: 15_000_000 },
  { label: "₹1.5Cr and above", minInr: 15_000_000, maxInr: null },
];

export type RequirementParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseRequirement(params: RequirementParams): BuyerRequirement {
  const budget = BUDGET_OPTIONS.find((b) => b.label === one(params.budget));
  const rawBhk = params.bhk;
  const configurations = (Array.isArray(rawBhk) ? rawBhk : rawBhk ? [rawBhk] : [])
    .flatMap((v) => v.split(","))
    .map((c) => c.trim())
    .filter(Boolean);
  const intent = one(params.intent);

  return {
    locationId: one(params.locality) ?? null,
    configurations,
    minBudgetInr: budget?.minInr ?? null,
    maxBudgetInr: budget?.maxInr ?? null,
    handoverTiming: one(params.handover) ?? null,
    intent: intent === "end_use" || intent === "investment" ? (intent as PurchaseIntent) : null,
  };
}

/** Which answers are still missing, so review can point at the step that needs them. */
export function missingAnswers(requirement: BuyerRequirement): readonly number[] {
  const missing: number[] = [];
  if (!requirement.locationId) missing.push(1);
  if (requirement.configurations.length === 0) missing.push(2);
  if (requirement.minBudgetInr === null && requirement.maxBudgetInr === null) missing.push(3);
  if (!requirement.handoverTiming) missing.push(4);
  if (!requirement.intent) missing.push(5);
  return missing;
}

export function budgetLabel(requirement: BuyerRequirement): string | null {
  return (
    BUDGET_OPTIONS.find(
      (b) => b.minInr === requirement.minBudgetInr && b.maxInr === requirement.maxBudgetInr,
    )?.label ?? null
  );
}

export function describeLocation(
  options: readonly { readonly id: string; readonly label: string }[],
  locationId: string | null,
): { readonly label: string; readonly available: boolean } | null {
  if (!locationId) return null;
  const found = options.find((option) => option.id === locationId);
  if (!found) return { label: "This location is not available", available: false };
  return { label: found.label, available: true };
}

export function intentLabel(intent: PurchaseIntent | null): string | null {
  if (intent === "end_use") return "To live in";
  if (intent === "investment") return "As an investment";
  return null;
}

/**
 * Fill answers the address bar does not carry from a stored requirement.
 * A value already in the URL is left as the person sent it, including one
 * the location list does not recognise.
 */
export function withStoredAnswers(
  params: RequirementParams,
  stored: BuyerRequirement | null,
): RequirementParams {
  if (!stored) return params;
  const next: RequirementParams = { ...params };
  if (params.locality === undefined && stored.locationId) next.locality = stored.locationId;
  if (params.bhk === undefined && stored.configurations.length) {
    next.bhk = [...stored.configurations];
  }
  if (params.budget === undefined) {
    const label = budgetLabel(stored);
    if (label) next.budget = label;
  }
  if (params.handover === undefined && stored.handoverTiming) next.handover = stored.handoverTiming;
  if (params.intent === undefined && stored.intent) next.intent = stored.intent;
  return next;
}

/** Rebuild the query string from the answers collected so far. */
export function toQuery(params: RequirementParams, patch: Record<string, string>): string {
  const q = new URLSearchParams();
  for (const key of ["locality", "bhk", "budget", "handover", "intent"]) {
    const value = params[key];
    if (Array.isArray(value)) value.forEach((v) => v && q.append(key, v));
    else if (value) q.set(key, value);
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value) q.set(key, value);
    else q.delete(key);
  }
  return q.toString();
}
