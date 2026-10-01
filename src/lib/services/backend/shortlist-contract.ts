const LISTING_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A published listing id. A catalogue slug is not one. */
export function isPublishedListingId(value: string): boolean {
  return LISTING_ID.test(value);
}

export function shortlistAddBody(listingId: string): { listingId: string } {
  return { listingId };
}

export type ShortlistAddResult = "added" | "already" | "missing" | "not_public" | "unauthenticated" | "rejected";

export function shortlistAddResult(status: number): ShortlistAddResult {
  if (status === 201) return "added";
  if (status === 200) return "already";
  if (status === 404) return "missing";
  if (status === 409) return "not_public";
  if (status === 401) return "unauthenticated";
  return "rejected";
}

export function shortlistRemoveResult(status: number): "removed" | "unauthenticated" | "rejected" {
  if (status === 200) return "removed";
  if (status === 401) return "unauthenticated";
  return "rejected";
}
