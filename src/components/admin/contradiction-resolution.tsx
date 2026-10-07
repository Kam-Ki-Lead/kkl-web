"use client";

import { useActionState, useState } from "react";
import {
  refreshRunRecommendationsAction,
  resolveRunContradictionAction,
  type QualificationActionState,
} from "@/app/actions/qualification";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Select, TextArea, TextInput } from "@/components/ui/field";
import { Chip } from "@/components/ui/chip";
import { StateMessage } from "@/components/ui/states";
import {
  REASON_MAX,
  describeAnswerValue,
  replacementOptions,
  takesFreeText,
  type Contradiction,
  type ContradictionView,
} from "@/lib/domain/contradiction-resolution";
import { stalenessNotice } from "@/lib/domain/recommendation-refresh";
import type { RunRecommendationState } from "@/lib/services/backend/qualification-reading";

const initial: QualificationActionState = {};

function Notice({ state }: { state: QualificationActionState }) {
  if (state.error) {
    return (
      <p className="t-body mt-[10px] text-danger" role="alert">
        {state.error}
      </p>
    );
  }
  if (state.notice) {
    return (
      <p className="t-body mt-[10px] text-success" role="status">
        {state.notice}
      </p>
    );
  }
  return null;
}

/**
 * One conflict, with both sides and a way to settle it.
 *
 * The answers are shown with their evidence — what was recorded, when, and
 * through which channel — because a staff member deciding which of two
 * answers a person meant is reading the conversation, not picking a radio
 * button at random.
 *
 * `observedAt` travels with the save. If the run moved while this was open
 * the backend refuses, and the refusal says to reload. That is better than a
 * decision applied to answers somebody has since changed.
 */
function ConflictForm({
  runId,
  conflict,
  observedAt,
  state,
  action,
  pending,
}: {
  runId: string;
  conflict: Contradiction;
  observedAt: string | null;
  state: QualificationActionState;
  action: (payload: FormData) => void;
  pending: boolean;
}) {
  const [mode, setMode] = useState<"keep" | "enter">("keep");
  // Held in state rather than left uncontrolled. React resets an uncontrolled
  // field when a form action completes, which on a refusal threw away the
  // sentence somebody had just written — and the refusal is exactly when they
  // need it back.
  const [reason, setReason] = useState("");
  const [replacement, setReplacement] = useState("");
  const options = replacementOptions(conflict.question);
  const freeText = takesFreeText(conflict.question);
  const prompt = conflict.question?.prompt ?? conflict.questionKey;

  return (
    <form action={action} className="mt-[14px] border-t border-line pt-[14px]">
      <input type="hidden" name="runId" value={runId} />
      <input type="hidden" name="questionKey" value={conflict.questionKey} />
      <input type="hidden" name="observedAt" value={observedAt ?? ""} />
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="hasOptions" value={options.length > 0 ? "yes" : "no"} />
      <input
        type="hidden"
        name="schemaType"
        value={conflict.question?.answerSchema?.type ?? ""}
      />

      <p className="t-caption text-muted">{conflict.questionKey}</p>
      <h3 className="t-card-title mt-[2px] text-ink">{prompt}</h3>

      <ul className="mt-[10px] flex flex-col gap-[8px]">
        {conflict.answers.map((answer) => (
          <li
            key={answer.answerId}
            className="rounded-[8px] border border-line px-[12px] py-[10px]"
          >
            <label className="flex items-start gap-[10px]">
              <input
                type="radio"
                name="keepAnswerId"
                value={answer.answerId}
                className="mt-[5px]"
                onChange={() => setMode("keep")}
                aria-label={`Keep ${describeAnswerValue(conflict.question, answer.value)}`}
              />
              <span className="flex-1">
                <span className="text-[15px] font-semibold text-ink">
                  {describeAnswerValue(conflict.question, answer.value)}
                </span>
                {answer.rawText ? (
                  <span className="t-body mt-[2px] block text-body">“{answer.rawText}”</span>
                ) : null}
                <span className="t-caption mt-[2px] block text-muted">
                  {answer.source ?? "source not recorded"}
                  {answer.recordedAt ? ` · ${answer.recordedAt}` : ""}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      <div className="mt-[12px] flex flex-wrap gap-[10px]">
        <Button
          type="button"
          size="sm"
          variant={mode === "keep" ? "primary" : "secondary"}
          onClick={() => setMode("keep")}
        >
          Keep one of these
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "enter" ? "primary" : "secondary"}
          onClick={() => setMode("enter")}
        >
          Enter a different answer
        </Button>
      </div>

      {mode === "enter" ? (
        <div className="mt-[12px]">
          <Field
            id={`value-${conflict.questionKey}`}
            label="The answer that stands"
            labelSize="sm"
            helper={
              options.length > 0
                ? "One of the question's own options. Anything else is refused by the service."
                : "Checked against this question's schema before it is stored."
            }
            error={state.field === "value" ? state.error : undefined}
          >
            {options.length > 0 ? (
              <Select
                id={`value-${conflict.questionKey}`}
                name="value"
                value={replacement}
                onChange={(event) => setReplacement(event.target.value)}
                invalid={state.field === "value"}
              >
                <option value="">Choose an option…</option>
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
            ) : (
              <TextInput
                id={`value-${conflict.questionKey}`}
                name="value"
                type={conflict.question?.answerSchema?.type === "integer" ? "number" : "text"}
                value={replacement}
                onChange={(event) => setReplacement(event.target.value)}
                invalid={state.field === "value"}
              />
            )}
          </Field>
          {freeText && options.length === 0 ? (
            <p className="t-caption mt-[6px] text-muted">
              This question takes free text, so what you enter is stored as written.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-[12px]">
        <Field
          id={`reason-${conflict.questionKey}`}
          label="Why this is the answer that stands"
          labelSize="sm"
          helper={`Required. Up to ${REASON_MAX} characters. Kept with the resolution and read by whoever looks at this run next.`}
          error={state.field === "reason" ? state.error : undefined}
        >
          <TextArea
            id={`reason-${conflict.questionKey}`}
            name="reason"
            rows={3}
            required
            maxLength={REASON_MAX}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            invalid={state.field === "reason"}
          />
        </Field>
      </div>

      {state.field === "choice" ? (
        <p className="t-body mt-[8px] text-danger" role="alert">
          {state.error}
        </p>
      ) : null}

      <p className="t-caption mt-[10px] text-muted">
        Both answers are kept as evidence. Resolving records which one stands and why — it
        does not contact anybody, does not lift a suppression and does not grant consent.
        Resuming a conversation is separate from dispatching to a provider.
      </p>

      <Button type="submit" size="sm" className="mt-[10px]" disabled={pending}>
        {pending ? "Saving…" : "Record this resolution"}
      </Button>
      {/* Field-level problems are shown beside their control. Anything else,
          and every success, is reported by the panel: a saved resolution
          removes this conflict, so a confirmation rendered here would vanish
          with the form that produced it. */}
      {state.error && !state.field ? (
        <p className="t-body mt-[10px] text-danger" role="alert">{state.error}</p>
      ) : null}
    </form>
  );
}

/** A-25 — the resolution panel on a qualification run. */
export function ContradictionPanel({
  runId,
  view,
  loadError,
}: {
  runId: string;
  view: ContradictionView | null;
  loadError: string | null;
}) {
  if (loadError) {
    return (
      <Card className="p-[18px]">
        <h2 className="t-card-title text-ink">Contradictions</h2>
        <StateMessage tone="error" title="The conflicts on this run could not be loaded">
          {loadError}
        </StateMessage>
      </Card>
    );
  }
  if (!view) return null;
  const settled = view.resolved;

  return (
    <ContradictionPanelBody runId={runId} view={view} settled={settled} />
  );
}

function ContradictionPanelBody({
  runId,
  view,
  settled,
}: {
  runId: string;
  view: ContradictionView;
  settled: ContradictionView["resolved"];
}) {
  // One action for the whole panel. A resolution that saves removes the
  // conflict it settled, so the confirmation has to outlive that form.
  const [state, action, pending] = useActionState(resolveRunContradictionAction, initial);

  return (
    <Card className="p-[18px]">
      <h2 className="t-card-title text-ink">Contradictions</h2>
      <p className="t-caption mt-[2px] text-muted">
        {view.note
          ?? "Resolving records which answer stands and why. It does not contact anybody."}
      </p>
      <Notice state={state.field ? {} : state} />

      {view.unresolved.length === 0 ? (
        <p className="t-body mt-[10px] text-body">
          Nothing on this run is waiting for a person to settle.
        </p>
      ) : (
        view.unresolved.map((conflict) => (
          <ConflictForm
            key={conflict.questionKey}
            runId={runId}
            conflict={conflict}
            observedAt={view.observedAt}
            state={state}
            action={action}
            pending={pending}
          />
        ))
      )}

      {settled.length > 0 ? (
        <div className="mt-[16px] border-t border-line pt-[12px]">
          <h3 className="t-caption text-muted">Already settled</h3>
          <ul className="mt-[8px] flex flex-col gap-[8px]">
            {settled.map((record) => (
              <li key={record.id} className="text-[15px] text-body">
                <span className="font-semibold text-ink">{record.questionKey}</span>
                {" · "}
                <Chip tone="neutral">
                  {record.resolution === "kept" ? "kept an answer" : "replacement entered"}
                </Chip>
                <span className="mt-[2px] block">“{record.reason}”</span>
                <span className="t-caption block text-muted">
                  {record.actorRole ?? "role not recorded"}
                  {record.recordedAt ? ` · ${record.recordedAt}` : ""}
                </span>
              </li>
            ))}
          </ul>
          <p className="t-caption mt-[8px] text-muted">
            Append-only. A resolution cannot be edited or removed, here or in the database.
          </p>
        </div>
      ) : null}
    </Card>
  );
}

/**
 * Whether this run's recommendations still describe its current answers, and
 * a way to recompute them.
 *
 * Recomputing is an action, never something a page load does: a screen that
 * quietly recalculates what somebody is about to act on tells two different
 * stories on two refreshes.
 */
export function RecommendationFreshnessPanel({
  runId,
  state: recommendations,
}: {
  runId: string;
  state: RunRecommendationState | null;
}) {
  const [actionState, action, pending] = useActionState(
    refreshRunRecommendationsAction,
    initial,
  );
  const notice = stalenessNotice(recommendations);

  return (
    <Card className="p-[18px]">
      <h2 className="t-card-title text-ink">Recommendations</h2>
      <p
        className="t-body mt-[6px] text-body"
        {...(notice.stale ? { role: "status" } : {})}
      >
        <span className={notice.stale ? "font-semibold text-ink" : ""}>{notice.headline}</span>{" "}
        {notice.detail}
      </p>
      {notice.because.length > 0 ? (
        <p className="t-caption mt-[6px] text-muted">
          Changed since: {notice.because.join(", ")}
        </p>
      ) : null}
      <form action={action} className="mt-[12px]">
        <input type="hidden" name="runId" value={runId} />
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          {pending ? "Recomputing…" : "Recompute from the current answers"}
        </Button>
      </form>
      <p className="t-caption mt-[10px] text-muted">
        Current recommendations, the projects the buyer picked and the visit requests
        somebody raised are three different things. Recomputing changes only the first. A
        selection that no longer fits is flagged for a person, not removed, and a visit
        request is never cancelled, replaced or duplicated — nor is it a confirmed booking.
      </p>
      <Notice state={actionState} />
    </Card>
  );
}
