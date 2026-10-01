import type { BuyerRequirement } from "@/lib/domain/types";
import { ServiceError, ValidationError } from "@/lib/services/contracts";
import { profileStoreKind } from "./config";
import { requirementBody } from "./buyer-profile-reading";
import {
  shortlistAddBody,
  shortlistAddResult,
  shortlistRemoveResult,
  type ShortlistAddResult,
} from "./shortlist-contract";
import { callAs, isFrameworkSignal } from "./session";
import { hasBrowserSession } from "@/lib/auth/backend";
import type { ShortlistHeaderState } from "@/lib/shortlist-label";

/**
 * The signed-in account's requirement and shortlist.
 *
 * A requirement is stored. Matching is refused by the service until a rule
 * is approved, and this module does not score anything in its place.
 * A shortlist accepts only a published listing. This module does not publish
 * one in order to add a row.
 */

type RequirementBody = {
  requirement?: BuyerRequirement | null;
  error?: string;
  field?: string;
};

type MatchesBody = RequirementBody & {
  matches?: readonly unknown[];
  matching?: { available?: boolean; code?: string; message?: string };
};

export type ShortlistItem = {
  readonly listingId: string;
  readonly reference: string | null;
  readonly title: string | null;
  readonly status: string | null;
  readonly locationId: string | null;
  readonly priceInr: number | null;
  readonly priceMinInr: number | null;
  readonly priceMaxInr: number | null;
  readonly savedAt: string | null;
};

type ShortlistBody = {
  items?: readonly ShortlistItem[];
  total?: number;
  limit?: number;
  offset?: number;
  error?: string;
};

export async function readBuyerRequirement(): Promise<BuyerRequirement | null> {
  const { status, body } = await callAs<RequirementBody>("buyer", "/v1/me/requirement");
  if (status === 401) throw new ServiceError("unauthenticated", "Sign in to read this requirement.");
  if (status !== 200) {
    throw new ServiceError("unavailable", body.error ?? `The requirement service returned ${status}.`);
  }
  return body.requirement ?? null;
}

export async function saveBuyerRequirement(requirement: BuyerRequirement): Promise<BuyerRequirement | null> {
  const { status, body } = await callAs<RequirementBody & BuyerRequirement>("buyer", "/v1/me/requirement", {
    method: "PUT",
    body: requirementBody(requirement),
  });
  if (status === 401) throw new ServiceError("unauthenticated", "Sign in to store this requirement.");
  if (status === 422) {
    throw new ValidationError({ [body.field ?? "form"]: body.error ?? "This requirement was not accepted." });
  }
  if (status !== 200) {
    throw new ServiceError("unavailable", body.error ?? `The requirement service returned ${status}.`);
  }
  return body.requirement ?? null;
}

export async function readRequirementMatches(): Promise<{
  requirement: BuyerRequirement | null;
  message: string;
}> {
  const { status, body } = await callAs<MatchesBody>("buyer", "/v1/me/requirement/matches");
  if (status === 401) throw new ServiceError("unauthenticated", "Sign in to read matched properties.");
  if (status !== 200) {
    throw new ServiceError("unavailable", body.error ?? `The requirement service returned ${status}.`);
  }
  return {
    requirement: body.requirement ?? null,
    message:
      body.matching?.message ??
      "The requirement is stored. No matching rule is approved, so nothing is scored.",
  };
}

export async function readShortlist(): Promise<{
  items: readonly ShortlistItem[];
  total: number;
}> {
  const { status, body } = await callAs<ShortlistBody>("buyer", "/v1/me/shortlist");
  if (status === 401) throw new ServiceError("unauthenticated", "Sign in to read this shortlist.");
  if (status !== 200) {
    throw new ServiceError("unavailable", body.error ?? `The shortlist service returned ${status}.`);
  }
  return { items: body.items ?? [], total: body.total ?? 0 };
}

/**
 * The header count.
 * No session is a normal shortlist entry. An empty signed-in list is zero.
 * Unavailable is only a signed-in read that failed.
 */
export async function headerShortlistCount(): Promise<ShortlistHeaderState> {
  if (profileStoreKind() !== "backend") return { kind: "guest" };
  // No cookie is a guest. Calling the shortlist here would redirect the
  // whole page to sign-in, which is not a failed shortlist read.
  if (!(await hasBrowserSession())) return { kind: "guest" };
  try {
    const list = await readShortlist();
    return { kind: "count", total: list.total };
  } catch (error) {
    if (isFrameworkSignal(error)) throw error;
    if (error instanceof ServiceError && error.kind === "unauthenticated") return { kind: "guest" };
    return { kind: "unavailable" };
  }
}

const ADD_MESSAGE: Record<Exclude<ShortlistAddResult, "added" | "already" | "rejected">, string> = {
  missing: "No published property with that id is visible on this account.",
  not_public: "This property is not public, so it was not shortlisted.",
  unauthenticated: "Sign in to save a property.",
};

export async function addToShortlist(listingId: string): Promise<"added" | "already"> {
  const { status, body } = await callAs<{ error?: string }>("buyer", "/v1/me/shortlist", {
    method: "POST",
    body: shortlistAddBody(listingId),
  });
  const result = shortlistAddResult(status);
  if (result === "added" || result === "already") return result;
  if (result === "rejected") {
    throw new ServiceError("unavailable", body.error ?? `The shortlist service returned ${status}.`);
  }
  const kind = result === "unauthenticated" ? "unauthenticated" : result === "missing" ? "not_found" : "forbidden";
  throw new ServiceError(kind, body.error ?? ADD_MESSAGE[result]);
}

export async function removeFromShortlist(listingId: string): Promise<{ removed: boolean }> {
  const { status, body } = await callAs<{ removed?: boolean; error?: string }>(
    "buyer",
    `/v1/me/shortlist/${encodeURIComponent(listingId)}`,
    { method: "DELETE" },
  );
  const result = shortlistRemoveResult(status);
  if (result === "removed") return { removed: body.removed === true };
  if (result === "unauthenticated") {
    throw new ServiceError("unauthenticated", "Sign in to change this shortlist.");
  }
  throw new ServiceError("unavailable", body.error ?? `The shortlist service returned ${status}.`);
}
