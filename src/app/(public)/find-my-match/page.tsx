import Link from "next/link";
import type { Metadata } from "next";
import { getServices } from "@/lib/services";
import {
  BUDGET_OPTIONS,
  HANDOVER_OPTIONS,
  REQUIREMENT_STEPS,
  parseRequirement,
  toQuery,
  type RequirementParams,
} from "@/lib/requirement";
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
  const params = await searchParams;
  const step = Math.min(Math.max(Number(one(params.step)) || 1, 1), REQUIREMENT_STEPS);
  const localities = (await getServices().properties.getHomepage()).localities;
  const current = parseRequirement(params);

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
            className={`h-[4px] flex-1 rounded-full ${i < step ? "bg-brand" : "bg-[#DDE2EF]"}`}
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
              {localities.map((l) => (
                <Radio
                  key={l.id}
                  name="locality"
                  value={l.id}
                  label={`${l.name}, Kolkata`}
                  hint={`${l.listingCount} ${l.listingCount === 1 ? "listing" : "listings"}`}
                  defaultChecked={current.locationId === l.id}
                />
              ))}
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
        How matching works: we compare your answers against published listings only. Locality and
        configuration must match; budget and timing move a project up or down the list. We never
        rank a project higher because a builder paid.
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
