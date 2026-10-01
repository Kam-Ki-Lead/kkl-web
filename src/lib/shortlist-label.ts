/** Zero is a read of an empty list. Null means the list was not read. */
export function shortlistVisibleLabel(shortlistCount: number | null): string {
  return shortlistCount === null ? "Shortlist (unavailable)" : `Shortlist (${shortlistCount})`;
}

export function shortlistAccessibleName(shortlistCount: number | null): string {
  return shortlistCount === null
    ? "Shortlist, count unavailable"
    : `Shortlist (${shortlistCount}), ${shortlistCount} saved`;
}
