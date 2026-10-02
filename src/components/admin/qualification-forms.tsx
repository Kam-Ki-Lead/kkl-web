"use client";

import { useActionState } from "react";
import {
  registerSyntheticQuestions,
  runDueQualificationRetries,
  saveCallingWindow,
  saveOptOutSignals,
  submitQualificationRecovery,
  submitQualificationReview,
  type QualificationActionState,
} from "@/app/actions/qualification";
import { Button } from "@/components/ui/button";
import { Field, Select, TextInput, TextArea } from "@/components/ui/field";

const initial: QualificationActionState = {};

function Notice({ state }: { state: QualificationActionState }) {
  if (state.error) {
    return <p className="t-body mt-[10px] text-danger" role="alert">{state.error}</p>;
  }
  if (state.notice) {
    return <p className="t-body mt-[10px] text-success">{state.notice}</p>;
  }
  return null;
}

export function CallingWindowForm() {
  const [state, action, pending] = useActionState(saveCallingWindow, initial);
  return (
    <form action={action} className="mt-[12px] flex flex-col gap-[12px]">
      <Field id="timeZone" label="Time zone" labelSize="sm" error={state.field === "timeZone" ? state.error : undefined}>
        <TextInput id="timeZone" name="timeZone" defaultValue="Asia/Kolkata" invalid={state.field === "timeZone"} />
      </Field>
      <div className="grid grid-cols-2 gap-[12px]">
        <Field id="start" label="Start (HH:MM)" labelSize="sm" error={state.field === "start" ? state.error : undefined}>
          <TextInput id="start" name="start" defaultValue="10:00" invalid={state.field === "start"} />
        </Field>
        <Field id="end" label="End (HH:MM)" labelSize="sm" error={state.field === "end" ? state.error : undefined}>
          <TextInput id="end" name="end" defaultValue="19:00" invalid={state.field === "end"} />
        </Field>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save calling window"}
      </Button>
      <Notice state={state} />
    </form>
  );
}

export function OptOutSignalsForm() {
  const [state, action, pending] = useActionState(saveOptOutSignals, initial);
  return (
    <form action={action} className="mt-[12px] flex flex-col gap-[12px]">
      <Field id="keywords" label="Keywords" labelSize="sm" helper="Comma or newline separated. None are assumed." error={state.field === "keywords" ? state.error : undefined}>
        <TextArea id="keywords" name="keywords" rows={3} defaultValue={"stop\nunsubscribe"} invalid={state.field === "keywords"} />
      </Field>
      <Field id="dtmf" label="DTMF digit (optional)" labelSize="sm">
        <TextInput id="dtmf" name="dtmf" defaultValue="9" />
      </Field>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save opt-out signals"}
      </Button>
      <Notice state={state} />
    </form>
  );
}

export function SyntheticQuestionSetForm() {
  const [state, action, pending] = useActionState(registerSyntheticQuestions, initial);
  return (
    <form action={action} className="mt-[12px] flex flex-col gap-[12px]">
      <Field id="versionLabel" label="Version label" labelSize="sm" helper="Lowercase. Activates the synthetic SYNTHETIC prompts only." error={state.field === "versionLabel" ? state.error : undefined}>
        <TextInput id="versionLabel" name="versionLabel" defaultValue={`synthetic-${Date.now().toString(36).slice(-6)}`} invalid={state.field === "versionLabel"} />
      </Field>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Registering…" : "Register synthetic question set"}
      </Button>
      <Notice state={state} />
    </form>
  );
}

export function QualificationReviewForm({ runId }: { runId: string }) {
  const [state, action, pending] = useActionState(submitQualificationReview, initial);
  return (
    <form action={action} className="mt-[12px] flex flex-col gap-[12px]">
      <input type="hidden" name="runId" value={runId} />
      <Field id="decision" label="Decision" labelSize="sm" error={state.field === "decision" ? state.error : undefined}>
        <Select id="decision" name="decision" defaultValue="facts_recorded" invalid={state.field === "decision"}>
          <option value="facts_recorded">Facts recorded</option>
          <option value="needs_follow_up">Needs follow-up</option>
        </Select>
      </Field>
      <Field id="reason" label="Reason" labelSize="sm" error={state.field === "reason" ? state.error : undefined}>
        <TextArea id="reason" name="reason" rows={3} required invalid={state.field === "reason"} />
      </Field>
      <p className="t-caption text-muted">
        A review does not set a qualification level and does not change marketplace consent.
      </p>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Record review"}
      </Button>
      <Notice state={state} />
    </form>
  );
}

export function QualificationRecoveryForm({
  runId,
  canResume,
  canRetry,
}: {
  runId: string;
  canResume: boolean;
  canRetry: boolean;
}) {
  const [state, action, pending] = useActionState(submitQualificationRecovery, initial);
  if (!canResume && !canRetry) return null;
  return (
    <form action={action} className="mt-[12px] flex flex-wrap gap-[10px]">
      <input type="hidden" name="runId" value={runId} />
      {canResume ? (
        <Button type="submit" name="action" value="resume" size="sm" variant="secondary" disabled={pending}>
          Resume incomplete run
        </Button>
      ) : null}
      {canRetry ? (
        <Button type="submit" name="action" value="retry" size="sm" variant="secondary" disabled={pending}>
          Retry failed call
        </Button>
      ) : null}
      <Notice state={state} />
    </form>
  );
}

export function DueRetriesForm() {
  const [state, action, pending] = useActionState(runDueQualificationRetries, initial);
  return (
    <form action={action} className="mt-[12px]">
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Running…" : "Process due provider retries"}
      </Button>
      <p className="t-caption mt-[8px] text-muted">
        Suppression is checked again. Results stay providerVerified false — not a live dial claim.
      </p>
      <Notice state={state} />
    </form>
  );
}
