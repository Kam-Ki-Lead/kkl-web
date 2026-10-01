import type { BuyerRequirement } from "@/lib/domain/types";
import { ServiceError, ValidationError } from "@/lib/services/contracts";
import { requirementBody } from "./buyer-profile-reading";
import { callAs } from "./session";

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
