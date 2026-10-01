/**
 * Guest is a person with no session. Count is a successful read, including zero.
 * Unavailable is a signed-in read that failed.
 */
export type ShortlistHeaderState =
  | { readonly kind: "guest" }
  | { readonly kind: "count"; readonly total: number }
  | { readonly kind: "unavailable" };

export function shortlistVisibleLabel(state: ShortlistHeaderState): string {
  if (state.kind === "guest") return "Shortlist";
  if (state.kind === "unavailable") return "Shortlist (unavailable)";
  return `Shortlist (${state.total})`;
}

export function shortlistAccessibleName(state: ShortlistHeaderState): string {
  if (state.kind === "guest") return "Shortlist";
  if (state.kind === "unavailable") return "Shortlist, count unavailable";
  return `Shortlist (${state.total}), ${state.total} saved`;
}

export function shortlistHref(state: ShortlistHeaderState): string {
  return state.kind === "guest" ? "/auth?next=/account/shortlist" : "/account/shortlist";
}
