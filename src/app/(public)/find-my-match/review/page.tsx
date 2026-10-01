import Link from "next/link";
import type { Metadata } from "next";
import {
  budgetLabel,
  intentLabel,
  missingAnswers,
  parseRequirement,
  toQuery,
  type RequirementParams,
} from "@/lib/requirement";
import { describeLocation, loadRequirementLocations } from "@/lib/requirement-locations";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Check your requirement" };

/** P-09 — requirement review. */
export default async function RequirementReviewPage({
  searchParams,
}: {
  searchParams: Promise<RequirementParams>;
}) {
  const params = await searchParams;
  const requirement = parseRequirement(params);
  const locations = await loadRequirementLocations();
  const described = locations.ok ? describeLocation(locations.options, requirement.locationId) : null;
  const localityValue = !requirement.locationId
    ? null
    : !locations.ok
      ? "The location list could not be read"
      : described?.label ?? null;
  const missing = missingAnswers(requirement);

  const rows: ReadonlyArray<{ step: number; label: string; value: string | null }> = [
    {
      step: 1,
      label: "Locality",
      value: localityValue,
    },
    {
      step: 2,
      label: "Configuration",
      value: requirement.configurations.length
        ? `${requirement.configurations.join(", ")} BHK`
        : null,
    },
    { step: 3, label: "Budget", value: budgetLabel(requirement) },
    { step: 4, label: "Handover", value: requirement.handoverTiming },
    { step: 5, label: "Purpose", value: intentLabel(requirement.intent) },
  ];

  return (
    <div className="mx-auto max-w-[660px] px-[32px] pb-[60px] pt-[30px] max-[1060px]:px-[18px]">
      <p className="t-eyebrow text-brand">Find my match</p>
      <h1 className="t-title mt-[6px] text-ink">Check your requirement</h1>
      <p className="t-caption mt-[6px] text-muted">
        Change anything before we match. Editing a line takes you back to that step with your
        other answers intact.
      </p>

      <Card className="mt-[18px] divide-y divide-line">
        {rows.map((row) => (
          <div key={row.step} className="flex items-center justify-between gap-[14px] p-[16px]">
            <div className="min-w-0">
              <p className="t-caption text-muted">{row.label}</p>
              <p className="mt-[2px] text-[16px] font-semibold text-ink">
                {row.value ?? <span className="font-normal text-warning">Not answered</span>}
              </p>
            </div>
            <Link
              href={`/find-my-match?${toQuery(params, { step: String(row.step) })}`}
              className="flex-none text-[15px] font-semibold text-brand underline underline-offset-2"
            >
              Edit
            </Link>
          </div>
        ))}
      </Card>

      {missing.length > 0 ? (
        <p className="mt-[14px] rounded-[8px] bg-chip-warning-bg px-[14px] py-[10px] text-[14px] text-warning">
          {missing.length} {missing.length === 1 ? "answer is" : "answers are"} still missing. We
          can match without them, but the results will be broader.
        </p>
      ) : null}

      <div className="mt-[18px] flex flex-wrap gap-[12px]">
        <ButtonLink href={`/matches?${toQuery(params, {})}`}>Show matching homes</ButtonLink>
        <ButtonLink
          href={`/find-my-match?${toQuery(params, { step: "5" })}`}
          variant="secondary"
        >
          Back
        </ButtonLink>
      </div>
    </div>
  );
}
