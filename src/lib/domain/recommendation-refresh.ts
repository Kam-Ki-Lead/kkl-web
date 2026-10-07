/**
 * Showing recommendations that went out of date, and what must not happen.
 *
 * Three things are involved and conflating them is how somebody's visit
 * request quietly disappears:
 *
 *   recommendations     what we would offer today, recomputed from the
 *                       answers as they now stand
 *   selected projects   what the buyer actually picked. Never removed; one
 *                       that no longer fits is FLAGGED for a person
 *   visit requests      what somebody asked to see. Never touched, never
 *                       cancelled, never duplicated, and never a confirmed
 *                       booking
 *
 * This module is pure: it turns the backend's refresh payload into the words
 * a screen shows, and it refuses to describe a flagged selection as a
 * withdrawn one.
 */

export const MATCH_STATES = [
  "not_rechecked",
  "matching",
  "no_longer_matching",
  "not_assessable",
] as const;
export type MatchState = (typeof MATCH_STATES)[number];

export type RefreshedSelection = {
  readonly selectionId: string;
  readonly listingId: string | null;
  readonly freeTextLabel: string | null;
  readonly enquiryId: string | null;
  readonly matchState: string;
  readonly detail: string | null;
};

export type ResolvedArea = {
  readonly usable: boolean;
  readonly narrowedBy: string | null;
  readonly selection: string | null;
  readonly unresolved: readonly {
    readonly optionId: string;
    readonly status: string;
    readonly reason: string | null;
  }[];
  readonly searchedNodeCount: number;
  readonly note: string | null;
};

export type RefreshResult = {
  readonly runId: string;
  readonly refreshedAt: string | null;
  readonly wasStale: boolean;
  readonly staleBecause: readonly string[];
  readonly area: ResolvedArea | null;
  readonly matchCount: number;
  readonly unavailableReason: string | null;
  readonly selections: readonly RefreshedSelection[];
  readonly visitRequestsPreserved: number;
  readonly needsAttention: boolean;
  readonly summary: string;
  readonly guarantees: readonly string[];
};

export type StalenessNotice = {
  readonly stale: boolean;
  readonly because: readonly string[];
  readonly headline: string;
  readonly detail: string;
};

/**
 * What to show beside a run before anything is recomputed.
 *
 * Reading staleness is a read. Nothing here triggers a refresh, because a
 * page load must not quietly recompute what somebody is about to act on.
 */
export function stalenessNotice(input: {
  readonly staleSince: string | null;
  readonly staleBecause: readonly string[];
} | null): StalenessNotice {
  const because = input?.staleBecause ?? [];
  if (!input?.staleSince) {
    return {
      stale: false,
      because: [],
      headline: "Recommendations are up to date with the current answers.",
      detail: "Nothing has changed since they were last computed.",
    };
  }
  return {
    stale: true,
    because,
    headline: "These recommendations are out of date.",
    detail:
      (because.length > 0
        ? `${because.join(", ")} changed after they were computed. `
        : "A matching answer changed after they were computed. ")
      + "Recomputing re-reads the current answers. It never cancels, replaces or "
      + "duplicates a visit request, and never removes a selection.",
  };
}

const MATCH_WORDS: Record<MatchState, { label: string; tone: "success" | "warning" | "muted" }> = {
  not_rechecked: { label: "not re-checked yet", tone: "muted" },
  matching: { label: "still matches", tone: "success" },
  no_longer_matching: { label: "no longer matches — flagged for a person", tone: "warning" },
  not_assessable: { label: "cannot be re-checked", tone: "muted" },
};

export function matchStateLabel(state: string): { label: string; tone: "success" | "warning" | "muted" } {
  return MATCH_WORDS[state as MatchState]
    ?? { label: state.replace(/_/g, " "), tone: "muted" };
}

/** How a selection reads on screen, visit request and all. */
export function describeSelection(selection: RefreshedSelection): {
  readonly title: string;
  readonly state: string;
  readonly tone: "success" | "warning" | "muted";
  readonly visit: string | null;
  readonly detail: string | null;
} {
  const { label, tone } = matchStateLabel(selection.matchState);
  return {
    title: selection.listingId
      ? `Listing ${selection.listingId}`
      : selection.freeTextLabel ?? "A project they named",
    state: label,
    tone,
    visit: selection.enquiryId
      ? `Visit requested — enquiry ${selection.enquiryId}. A request, not a confirmed booking. `
        + "Preserved exactly as it was."
      : null,
    detail: selection.detail,
  };
}

/**
 * The line shown after a refresh.
 *
 * It never says a selection was removed or a request was cancelled, because
 * neither happens. Where something no longer fits, it says who decides.
 */
export function refreshNotice(result: RefreshResult): string {
  const recomputed = result.matchCount === 0
    ? result.unavailableReason
      ? `No project in the current inventory meets these answers (${result.unavailableReason}).`
      : "No project in the current inventory meets these answers."
    : `${result.matchCount} project${result.matchCount === 1 ? "" : "s"} meet the current answers.`;
  const flagged = result.needsAttention
    ? " A previous selection no longer fits. It is flagged, not removed — the buyer or a "
      + "staff member decides what to do with it."
    : "";
  const visits = result.visitRequestsPreserved > 0
    ? ` ${result.visitRequestsPreserved} visit request${
      result.visitRequestsPreserved === 1 ? " is" : "s are"} untouched.`
    : "";
  const area = result.area && !result.area.usable
    ? " The area answer could not be resolved, so the search was not narrowed by it."
    : "";
  return `${recomputed}${flagged}${visits}${area}`;
}
