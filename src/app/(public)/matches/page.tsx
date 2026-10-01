import Link from "next/link";
import type { Metadata } from "next";
import { getServices } from "@/lib/services";
import {
  budgetLabel,
  intentLabel,
  parseRequirement,
  toQuery,
  type RequirementParams,
} from "@/lib/requirement";
import { PropertyCard } from "@/components/property/property-card";
import { Chip } from "@/components/ui/chip";
import { ButtonLink } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/states";
import { profileStoreKind } from "@/lib/services/backend/config";
import { readRequirementMatches, saveBuyerRequirement } from "@/lib/services/backend/buyer-records";
import { ServiceError, ValidationError } from "@/lib/services/contracts";
import type { MatchedProperty } from "@/lib/domain/types";

export const metadata: Metadata = { title: "Matching homes" };

/** P-10 — matched properties. */
export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<RequirementParams>;
}) {
  const params = await searchParams;
  const requirement = parseRequirement(params);
  const services = getServices();
  const stored = profileStoreKind() === "backend";
  let storedMessage: string | null = null;
  let matches: readonly MatchedProperty[] = [];
  if (stored) {
    try {
      await saveBuyerRequirement(requirement);
      const result = await readRequirementMatches();
      storedMessage = result.message;
    } catch (error) {
      if (error instanceof ValidationError) {
        storedMessage = Object.values(error.fields)[0] ?? "This requirement was not accepted.";
      } else if (error instanceof ServiceError && error.kind === "unauthenticated") {
        storedMessage = "Sign in to store this requirement. Sample matches are not shown in its place.";
      } else if (error instanceof ServiceError) {
        storedMessage = error.message;
      } else {
        throw error;
      }
    }
  } else {
    matches = await services.properties.match(requirement);
  }
  const localityRecords = requirement.locationId
    ? await services.locations.getMany([requirement.locationId])
    : [];

  const localityName = localityRecords[0]?.name;
  const summary = [
    localityName,
    requirement.configurations.length ? `${requirement.configurations.join(", ")} BHK` : null,
    budgetLabel(requirement),
    requirement.handoverTiming,
    intentLabel(requirement.intent),
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto box-content max-w-[1280px] px-[32px] pb-[50px] pt-[28px] max-[1060px]:px-[18px]">
      <h1 className="t-title text-ink">Matching homes</h1>
      <p className="mt-[6px] text-[16px] text-body">
        {stored
          ? (storedMessage ??
            "The requirement is stored. No matching rule is approved, so nothing is scored.")
          : matches.length === 0
            ? "Nothing published matches every answer yet."
            : `${matches.length} published ${matches.length === 1 ? "project matches" : "projects match"} your requirement.`}
      </p>

      <div className="mt-[12px] flex flex-wrap items-center gap-[8px]">
        {summary.map((s) => (
          <Chip key={s} tone="neutral">
            {s}
          </Chip>
        ))}
        <Link
          href={`/find-my-match/review?${toQuery(params, {})}`}
          className="ml-[4px] text-[15px] font-semibold text-brand underline underline-offset-2"
        >
          Refine
        </Link>
      </div>

      {stored ? (
        <div className="mt-[20px]">
          <StateMessage
            title="No properties are scored from this requirement"
            action={
              <ButtonLink href="/auth?next=/matches" size="sm" variant="secondary">
                Sign in
              </ButtonLink>
            }
          >
            {storedMessage}
          </StateMessage>
        </div>
      ) : matches.length === 0 ? (
        <div className="mt-[20px]">
          <StateMessage
            title="No published project matches all of it"
            action={
              <>
                <ButtonLink href={`/find-my-match/review?${toQuery(params, {})}`} size="sm">
                  Change an answer
                </ButtonLink>
                <ButtonLink href="/search" size="sm" variant="secondary">
                  Browse everything
                </ButtonLink>
              </>
            }
          >
            {localityName && requirement.configurations.length
              ? `Nothing in ${localityName} is published with ${requirement.configurations.join(", ")} BHK at that budget. Widening the budget or the locality usually finds something.`
              : "Widening the budget or the locality usually finds something."}
          </StateMessage>
        </div>
      ) : (
        <ul className="mt-[20px] grid grid-cols-3 gap-[18px] max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
          {matches.map(({ property, matchScore }) => (
            <li key={property.id} className="relative">
              <span className="absolute left-[10px] top-[10px] z-10 rounded-full bg-brand px-[10px] py-[3px] text-[12px] font-bold text-white">
                {matchScore}% match
              </span>
              <PropertyCard property={property} actions="buttons" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
