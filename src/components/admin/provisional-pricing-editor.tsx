"use client";

import { useActionState, useState } from "react";
import {
  applyProvisionalPricing,
  previewProvisionalPrice,
  saveProvisionalPricing,
  type PricingApplicationState,
  type PricingPreviewState,
  type PricingSaveState,
} from "@/app/actions/provisional-pricing";
import { Button } from "@/components/ui/button";
import { Field, Select, TextArea, TextInput } from "@/components/ui/field";
import {
  blankPricingDraft,
  formatProvisionalInr,
  type PricingDraft,
  type PricingLevelView,
} from "@/lib/services/backend/provisional-pricing-reading";

function replaceBand(draft: PricingDraft, index: number, patch: Partial<PricingDraft["bands"][number]>): PricingDraft {
  return {
    ...draft,
    bands: draft.bands.map((band, bandIndex) => (bandIndex === index ? { ...band, ...patch } : band)),
  };
}

export function ProvisionalPricingEditor({
  initial,
  versionNote,
}: {
  initial: PricingDraft;
  versionNote: string;
}) {
  const [state, action, pending] = useActionState<PricingSaveState, FormData>(saveProvisionalPricing, {});
  const [draft, setDraft] = useState<PricingDraft>(initial.bands.length ? initial : blankPricingDraft());
  const incoming = state.draft;
  const [seen, setSeen] = useState<PricingDraft | undefined>(undefined);
  if (incoming && incoming !== seen) {
    setSeen(incoming);
    setDraft(incoming.bands.length ? incoming : blankPricingDraft());
  }

  const bands = draft.bands.length ? draft.bands : blankPricingDraft().bands;
  const levels = draft.levels.length ? draft.levels : blankPricingDraft().levels;

  return (
    <form action={action} className="flex flex-col gap-[16px]">
      <p className="t-body text-body">{versionNote}</p>
      {state.savedVersion ? (
        <p role="status" className="t-body font-semibold text-ink">
          Version {state.savedVersion} was saved. It is provisional and is not used for purchases.
        </p>
      ) : null}
      {state.error ? (
        <p role="alert" className="t-body text-danger">
          {state.error}
        </p>
      ) : null}

      <Field id="pricing-note" label="Note" helper="Optional. Stored with this version. A name, phone number, or email is refused.">
        <TextArea
          id="pricing-note"
          name="note"
          rows={3}
          value={draft.note}
          onChange={(event) => setDraft({ ...draft, note: event.target.value })}
        />
      </Field>

      <div className="flex flex-col gap-[12px]">
        <h3 className="t-card-title text-ink">Budget bands and base prices</h3>
        <p className="t-caption text-muted">
          Amounts are rupees with at most two decimal places. The minimum is inclusive and the maximum is exclusive.
          Leave the maximum empty for one open-ended band, and make that band the highest. A gap is stored and is not filled.
          Base prices stay blank until they are typed. No workbook rate is filled in as a starting price.
        </p>
        {bands.map((band, index) => (
          <div key={index} className="grid grid-cols-1 gap-[10px] md:grid-cols-[1.3fr_1fr_1fr_1fr_auto] md:items-end">
            <Field id={`band-label-${index}`} label={index === 0 ? "Label" : `Label ${index + 1}`} labelSize="sm">
              <TextInput
                id={`band-label-${index}`}
                name="bandLabel"
                value={band.label}
                onChange={(event) => setDraft(replaceBand(draft, index, { label: event.target.value }))}
              />
            </Field>
            <Field id={`band-min-${index}`} label="Minimum ₹" labelSize="sm">
              <TextInput
                id={`band-min-${index}`}
                name="bandMin"
                inputMode="decimal"
                value={band.minInr}
                onChange={(event) => setDraft(replaceBand(draft, index, { minInr: event.target.value }))}
              />
            </Field>
            <Field id={`band-max-${index}`} label="Maximum ₹" labelSize="sm" helper={index === 0 ? "Empty means no upper bound." : undefined}>
              <TextInput
                id={`band-max-${index}`}
                name="bandMax"
                inputMode="decimal"
                value={band.maxInr}
                onChange={(event) => setDraft(replaceBand(draft, index, { maxInr: event.target.value }))}
              />
            </Field>
            <Field id={`band-base-${index}`} label="Base price ₹" labelSize="sm">
              <TextInput
                id={`band-base-${index}`}
                name="bandBase"
                inputMode="decimal"
                value={band.basePriceInr}
                onChange={(event) => setDraft(replaceBand(draft, index, { basePriceInr: event.target.value }))}
              />
            </Field>
            <Button
              type="button"
              variant="quietDanger"
              size="sm"
              className="mb-[2px]"
              onClick={() => {
                const next = bands.filter((_, bandIndex) => bandIndex !== index);
                setDraft({
                  ...draft,
                  bands: next.length ? next : blankPricingDraft().bands,
                });
              }}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setDraft({
            ...draft,
            bands: [...bands, { label: "", minInr: "", maxInr: "", basePriceInr: "" }],
          })}
        >
          Add a band
        </Button>
      </div>

      <div className="flex flex-col gap-[12px]">
        <h3 className="t-card-title text-ink">Qualification-level multipliers</h3>
        <p className="t-caption text-muted">
          A multiplier is a decimal such as 1.35, or a ratio such as 27/20. A level does not list questions.
        </p>
        {levels.map((level, index) => (
          <div key={index} className="grid grid-cols-1 gap-[10px] md:grid-cols-[1fr_1fr_auto] md:items-end">
            <Field id={`level-number-${index}`} label="Level" labelSize="sm">
              <TextInput
                id={`level-number-${index}`}
                name="levelNumber"
                inputMode="numeric"
                value={level.level}
                onChange={(event) => setDraft({
                  ...draft,
                  levels: levels.map((item, levelIndex) => (
                    levelIndex === index ? { ...item, level: event.target.value } : item
                  )),
                })}
              />
            </Field>
            <Field id={`level-multiplier-${index}`} label="Multiplier" labelSize="sm">
              <TextInput
                id={`level-multiplier-${index}`}
                name="levelMultiplier"
                value={level.multiplier}
                onChange={(event) => setDraft({
                  ...draft,
                  levels: levels.map((item, levelIndex) => (
                    levelIndex === index ? { ...item, multiplier: event.target.value } : item
                  )),
                })}
              />
            </Field>
            <Button
              type="button"
              variant="quietDanger"
              size="sm"
              className="mb-[2px]"
              onClick={() => {
                const next = levels.filter((_, levelIndex) => levelIndex !== index);
                setDraft({
                  ...draft,
                  levels: next.length ? next : blankPricingDraft().levels,
                });
              }}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setDraft({ ...draft, levels: [...levels, { level: "", multiplier: "" }] })}
        >
          Add a level
        </Button>
      </div>

      <div className="flex flex-col gap-[12px]">
        <h3 className="t-card-title text-ink">Question definitions</h3>
        <p className="t-caption text-muted">
          A prompt is stored with this version. It is a definition only, and it is not an approved mapping onto a qualification level.
        </p>
        {draft.questions.map((question, index) => (
          <div key={index} className="grid grid-cols-1 gap-[10px] md:grid-cols-[1fr_auto] md:items-end">
            <Field id={`question-${index}`} label={`Prompt ${index + 1}`} labelSize="sm">
              <TextInput
                id={`question-${index}`}
                name="questionPrompt"
                value={question.prompt}
                onChange={(event) => setDraft({
                  ...draft,
                  questions: draft.questions.map((item, questionIndex) => (
                    questionIndex === index ? { prompt: event.target.value } : item
                  )),
                })}
              />
            </Field>
            <Button
              type="button"
              variant="quietDanger"
              size="sm"
              className="mb-[2px]"
              onClick={() => setDraft({
                ...draft,
                questions: draft.questions.filter((_, questionIndex) => questionIndex !== index),
              })}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setDraft({ ...draft, questions: [...draft.questions, { prompt: "" }] })}
        >
          Add a question
        </Button>
      </div>

      <div>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving…" : "Save provisional version"}
        </Button>
      </div>
    </form>
  );
}

export function ProvisionalPricePreview({
  configurationId,
  version,
  levels,
}: {
  configurationId: string | null;
  version: number | null;
  levels: readonly PricingLevelView[];
}) {
  const [state, action, pending] = useActionState<PricingPreviewState, FormData>(previewProvisionalPrice, {});
  const [budgetInr, setBudgetInr] = useState("");
  const [qualificationLevel, setQualificationLevel] = useState("");
  const [roundingKey, setRoundingKey] = useState(0);
  const echoed = state.budgetInr !== undefined || state.qualificationLevel !== undefined;
  const [seenEcho, setSeenEcho] = useState<PricingPreviewState | undefined>(undefined);
  if (echoed && state !== seenEcho) {
    setSeenEcho(state);
    setRoundingKey((value) => value + 1);
    if (state.budgetInr !== undefined) setBudgetInr(state.budgetInr);
    if (state.qualificationLevel !== undefined) setQualificationLevel(state.qualificationLevel);
  }

  if (!configurationId || version === null) {
    return (
      <p className="t-body text-body">Save a provisional configuration before previewing a price.</p>
    );
  }

  const preview = state.preview;

  return (
    <form action={action} className="flex flex-col gap-[14px]">
      <p className="t-body text-body">
        This preview uses version {version}. The budget and the qualification level are both typed here.
      </p>
      <input type="hidden" name="configurationId" value={configurationId} />
      {state.error && state.field !== "budgetInr" && state.field !== "qualificationLevel" ? (
        <p role="alert" className="t-body text-danger">{state.error}</p>
      ) : null}
      <div className="grid grid-cols-1 gap-[12px] md:grid-cols-2">
        <Field
          id="preview-budget"
          label="Budget for this preview"
          helper="Rupees with at most two decimal places, typed for this calculation."
          error={state.field === "budgetInr" ? state.error : undefined}
        >
          <TextInput
            id="preview-budget"
            name="budgetInr"
            inputMode="decimal"
            value={budgetInr}
            invalid={state.field === "budgetInr"}
            onChange={(event) => setBudgetInr(event.target.value)}
          />
        </Field>
        <Field
          id="preview-level"
          label="Qualification level supplied for this preview"
          helper="This level is selected for the calculation. It is not an AI qualification, and the questions do not select it."
          error={state.field === "qualificationLevel" ? state.error : undefined}
        >
          <Select
            id="preview-level"
            name="qualificationLevel"
            value={qualificationLevel}
            invalid={state.field === "qualificationLevel"}
            onChange={(event) => setQualificationLevel(event.target.value)}
          >
            <option value="">Select a level</option>
            {levels.map((level) => (
              <option key={level.level} value={String(level.level)}>
                Level {level.level}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <label className="flex items-start gap-[10px] text-[14px] text-body" htmlFor="preview-rounding">
        <input type="hidden" name="demonstrateRounding" value="false" />
        <input
          key={roundingKey}
          id="preview-rounding"
          name="demonstrateRounding"
          type="checkbox"
          value="true"
          defaultChecked={state.demonstrate === true}
          className="mt-[3px] h-[18px] w-[18px]"
        />
        <span>
          Show the spreadsheet’s nearest-₹100 demonstration.
          <span className="mt-[2px] block text-[13px] text-muted">
            The demonstration is separate from the exact calculation and is not a confirmed rounding rule.
          </span>
        </span>
      </label>
      <div>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Calculating…" : "Preview price"}
        </Button>
      </div>
      {preview ? <PreviewResult preview={preview} /> : null}
    </form>
  );
}

function PreviewResult({
  preview,
}: {
  preview: NonNullable<PricingPreviewState["preview"]>;
}) {
  return (
    <div className="flex flex-col gap-[8px] border-t border-line pt-[14px]" aria-live="polite">
      <p className="t-body font-semibold text-ink">
        Version {preview.configurationVersion}. {preview.levelStatement}
      </p>
      <p className="t-body text-body">{preview.questionStatement}</p>
      <p className="t-body text-body">{preview.boundaryText}</p>
      <p className="t-body text-body">
        Base price {formatProvisionalInr(preview.basePriceInr)} × {preview.multiplierText}, for a budget of {formatProvisionalInr(preview.budgetInr)}.
      </p>
      <p className="t-body font-semibold text-ink">{preview.exactText}</p>
      <p className="t-body text-body">{preview.roundingText}</p>
      <p className="t-body text-body">{preview.creditsText}</p>
      <p className="t-body text-body">{preview.message}</p>
      <p className="t-caption text-muted">{preview.purchaseMessage}</p>
    </div>
  );
}

export function ApplyToUnsoldLeads({
  configurationId,
  version,
  bands,
  levels,
}: {
  configurationId: string | null;
  version: number | null;
  bands: number;
  levels: number;
}) {
  const [state, action, pending] = useActionState<PricingApplicationState, FormData>(applyProvisionalPricing, {});

  if (!configurationId || version === null) {
    return (
      <p className="t-body text-body">Save a provisional version before applying it to unsold leads.</p>
    );
  }

  const applied = state.application;

  return (
    <form action={action} className="flex flex-col gap-[12px]">
      <p className="t-body text-body">
        This action is separate from saving a version and from previewing a calculation.
        Applying version {version} is the step that updates unsold leads. It covers {bands} {bands === 1 ? "band" : "bands"} and {levels} {levels === 1 ? "level" : "levels"}.
        Purchased orders stay as they were. A buyer who already saw a price is not charged a different amount unless they confirm the new one.
      </p>
      <input type="hidden" name="configurationId" value={configurationId} />
      {state.error ? <p role="alert" className="t-body text-danger">{state.error}</p> : null}
      {applied ? (
        <div className="flex flex-col gap-[6px]" aria-live="polite">
          <p className="t-body font-semibold text-ink">
            Version {version} was applied. {applied.unsoldLeadsUpdated.toLocaleString("en-IN")} unsold {applied.unsoldLeadsUpdated === 1 ? "lead was" : "leads were"} updated.
          </p>
          <p className="t-body text-body">
            {applied.purchasedOrdersLeftUnchanged.toLocaleString("en-IN")} purchased {applied.purchasedOrdersLeftUnchanged === 1 ? "order was" : "orders were"} left unchanged.
            {applied.quotesAwaitingConfirmation.toLocaleString("en-IN")} open {applied.quotesAwaitingConfirmation === 1 ? "quote now needs" : "quotes now need"} a fresh confirmation before anyone is charged.
          </p>
        </div>
      ) : null}
      <div>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Applying…" : "Apply to unsold leads"}
        </Button>
      </div>
    </form>
  );
}
