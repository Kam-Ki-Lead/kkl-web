import Link from "next/link";
import type { Metadata } from "next";
import {
  BUDGET_OPTIONS,
  HANDOVER_OPTIONS,
  REQUIREMENT_STEPS,
  parseRequirement,
  toQuery,
  withStoredAnswers,
  type RequirementParams,
} from "@/lib/requirement";
import { describeLocation, loadRequirementLocations } from "@/lib/requirement-locations";
import { profileStoreKind } from "@/lib/services/backend/config";
import { readBuyerRequirement } from "@/lib/services/backend/buyer-records";
import { ServiceError } from "@/lib/services/contracts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Find my match" };

const STEP_TITLES = [
  "Where are you looking?",
  "What configuration do you need?",
  "What is your budget?",
  "When do you want to move in?",
  "Is this to live in, or to invest?",
];

function one(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/** P-08 — requirement capture, five steps, all state in the URL. */
export default async function FindMyMatchPage({
  searchParams,
}: {
  searchParams: Promise<RequirementParams>;
}) {
  const incoming = await searchParams;
  let stored = null;
  if (profileStoreKind() === "backend") {
    try {
      stored = await readBuyerRequirement();
    } catch (error) {
      if (!(error instanceof ServiceError)) throw error;
    }
  }
  const params = withStoredAnswers(incoming, stored);
  const step = Math.min(Math.max(Number(one(params.step)) || 1, 1), REQUIREMENT_STEPS);
  const locations = await loadRequirementLocations();
  const current = parseRequirement(params);
  const chosen = locations.ok ? describeLocation(locations.options, current.locationId) : null;

  const backQuery = toQuery(params, { step: String(step - 1) });

  return (
    <div className="mx-auto max-w-[660px] px-[32px] pb-[60px] pt-[30px] max-[1060px]:px-[18px]">
      <p className="t-eyebrow text-brand">Find my match</p>
      <h1 className="t-title mt-[6px] text-ink">{STEP_TITLES[step - 1]}</h1>
      <p className="t-caption mt-[6px] text-muted">
        Step {step} of {REQUIREMENT_STEPS}. Your answers stay in the address bar, so Back works
        and nothing is lost if you reload.
      </p>

      <div className="mt-[14px] flex gap-[6px]" aria-hidden="true">
        {Array.from({ length: REQUIREMENT_STEPS }, (_, i) => (
          <span
            key={i}
            className={`h-[4px] flex-1 rounded-full ${i < step ? "bg-brand" : "bg-brand-mist"}`}
          />
        ))}
      </div>

      <Card className="mt-[18px] p-[22px]">
        {/* A plain GET form: every step works without JavaScript. */}
        <form method="get" action="/find-my-match" className="flex flex-col gap-[16px]">
          {["locality", "bhk", "budget", "handover", "intent"].map((key) =>
            one(params[key]) && !isFieldOfStep(key, step) ? (
              <input key={key} type="hidden" name={key} value={one(params[key])} />
            ) : null,
          )}
          <input
            type="hidden"
            name="step"
            value={step === REQUIREMENT_STEPS ? REQUIREMENT_STEPS : step + 1}
          />

          {step === 1 ? (
            <fieldset className="flex flex-col gap-[10px]">
              <legend className="t-label mb-[6px] text-ink">Preferred locality</legend>
              {locations.ok ? (
                <>
                  <p className="t-caption text-muted">
                    Places come from the location records. Choosing one stores the answer. It does
                    not score a property.
                  </p>
                  {chosen && !chosen.available ? (
                    <p role="status" className="rounded-[8px] bg-chip-warning-bg px-[14px] py-[10px] text-[14px] text-warning">
                      This location is not available. It stays selected so a different place is not
                      chosen for you.
                    </p>
                  ) : null}
                  <select
                    name="locality"
                    defaultValue={current.locationId ?? ""}
                    className="min-h-[44px] rounded-[8px] border-[1.5px] border-control-border bg-white px-[13px] text-[15px] text-ink"
                  >
                    <option value="">Choose a locality</option>
                    {chosen && !chosen.available && current.locationId ? (
                      <option value={current.locationId}>This location is not available</option>
                    ) : null}
                    {locations.options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <p role="alert" className="rounded-[8px] bg-chip-danger-bg px-[14px] py-[10px] text-[14px] text-danger">
                  {locations.message} Sample localities are not shown in their place.
                </p>
              )}
            </fieldset>
          ) : null}

          {step === 2 ? (
            <fieldset className="flex flex-col gap-[10px]">
              <legend className="t-label mb-[6px] text-ink">
                Configuration — choose as many as work for you
              </legend>
              {["1", "2", "3", "4"].map((bhk) => (
                <Check
                  key={bhk}
                  name="bhk"
                  value={bhk}
                  label={`${bhk} BHK`}
                  defaultChecked={current.configurations.includes(bhk)}
                />
              ))}
            </fieldset>
          ) : null}

          {step === 3 ? (
            <fieldset className="flex flex-col gap-[10px]">
              <legend className="t-label mb-[6px] text-ink">Budget</legend>
              {BUDGET_OPTIONS.map((b) => (
                <Radio
                  key={b.label}
                  name="budget"
                  value={b.label}
                  label={b.label}
                  defaultChecked={one(params.budget) === b.label}
                />
              ))}
            </fieldset>
          ) : null}

          {step === 4 ? (
            <fieldset className="flex flex-col gap-[10px]">
              <legend className="t-label mb-[6px] text-ink">Handover timing</legend>
              {HANDOVER_OPTIONS.map((h) => (
                <Radio
                  key={h}
                  name="handover"
                  value={h}
                  label={h}
                  defaultChecked={current.handoverTiming === h}
                />
              ))}
            </fieldset>
          ) : null}

          {step === 5 ? (
            <fieldset className="flex flex-col gap-[10px]">
              <legend className="t-label mb-[6px] text-ink">This purchase is</legend>
              <Radio
                name="intent"
                value="end_use"
                label="To live in"
                hint="We favour handover timing you can actually move into."
                defaultChecked={current.intent === "end_use"}
              />
              <Radio
                name="intent"
                value="investment"
                label="As an investment"
                hint="We favour new launches and price range over move-in readiness."
                defaultChecked={current.intent === "investment"}
              />
            </fieldset>
          ) : null}

          <div className="mt-[6px] flex flex-wrap items-center gap-[14px]">
            {step === REQUIREMENT_STEPS ? (
              <Button type="submit" formAction="/find-my-match/review">
                Review my requirement
              </Button>
            ) : (
              <Button type="submit">Continue</Button>
            )}
            {step > 1 ? (
              <Link
                href={`/find-my-match?${backQuery}`}
                className="text-[15px] font-semibold text-brand underline underline-offset-2"
              >
                Back
              </Link>
            ) : null}
            <Link
              href="/search"
              className="t-caption ml-auto text-muted underline underline-offset-2"
            >
              Skip and browse instead
            </Link>
          </div>
        </form>
      </Card>

      <p id="how" className="t-caption mt-[16px] text-muted">
        {profileStoreKind() === "backend"
          ? "No matching rule is approved. Sending these answers stores them. It does not score a property, and a project is not ranked because a builder paid."
          : "How matching works: we compare your answers against published listings only. Locality and configuration must match; budget and timing move a project up or down the list. We never rank a project higher because a builder paid."}
      </p>
    </div>
  );
}

function isFieldOfStep(key: string, step: number): boolean {
  return (
    (step === 1 && key === "locality") ||
    (step === 2 && key === "bhk") ||
    (step === 3 && key === "budget") ||
    (step === 4 && key === "handover") ||
    (step === 5 && key === "intent")
  );
}

function Radio(props: {
  name: string;
  value: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-start gap-[10px] rounded-[8px] border border-line p-[12px] hover:border-brand">
      <input
        type="radio"
        name={props.name}
        value={props.value}
        defaultChecked={props.defaultChecked}
        className="mt-[3px]"
      />
      <span>
        <span className="block text-[15px] font-semibold text-ink">{props.label}</span>
        {props.hint ? <span className="t-caption block text-muted">{props.hint}</span> : null}
      </span>
    </label>
  );
}

function Check(props: { name: string; value: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-center gap-[10px] rounded-[8px] border border-line p-[12px] hover:border-brand">
      <input
        type="checkbox"
        name={props.name}
        value={props.value}
        defaultChecked={props.defaultChecked}
      />
      <span className="text-[15px] font-semibold text-ink">{props.label}</span>
    </label>
  );
}
