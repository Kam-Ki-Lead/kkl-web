"use client";

import { useActionState } from "react";
import {
  registerSyntheticQuestions,
  resumeQualificationRun,
  saveCallingWindow,
  saveOptOutSignals,
  startQualificationRunAction,
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

export function CallingWindowForm({
  saved,
}: {
  saved: { timeZone: string; start: string; end: string } | null;
}) {
  const [state, action, pending] = useActionState(saveCallingWindow, initial);
  return (
    <div className="mt-[12px]">
      <div className="rounded-[8px] border border-line bg-tint px-[13px] py-[10px]">
        <p className="t-caption text-muted">Saved configuration</p>
        <p className="t-body mt-[4px] text-body">
          {saved
            ? `${saved.timeZone} ${saved.start}–${saved.end}`
            : "No calling window is saved yet."}
        </p>
        <p className="t-caption mt-[4px] text-muted">
          The fixture review window is not the client&apos;s calling hours.
        </p>
      </div>
      <form action={action} className="mt-[12px] flex flex-col gap-[12px]">
        <Field id="timeZone" label="Time zone" labelSize="sm" error={state.field === "timeZone" ? state.error : undefined}>
          <TextInput id="timeZone" name="timeZone" defaultValue={saved?.timeZone ?? "Asia/Kolkata"} invalid={state.field === "timeZone"} />
        </Field>
        <div className="grid grid-cols-2 gap-[12px]">
          <Field id="start" label="Start (HH:MM)" labelSize="sm" error={state.field === "start" ? state.error : undefined}>
            <TextInput id="start" name="start" defaultValue={saved?.start ?? "10:00"} invalid={state.field === "start"} />
          </Field>
          <Field id="end" label="End (HH:MM)" labelSize="sm" error={state.field === "end" ? state.error : undefined}>
            <TextInput id="end" name="end" defaultValue={saved?.end ?? "19:00"} invalid={state.field === "end"} />
          </Field>
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save calling window"}
        </Button>
        <Notice state={state} />
      </form>
    </div>
  );
}

export function OptOutSignalsForm({
  saved,
}: {
  saved: { dtmf: string | null; keywords: readonly string[] } | null;
}) {
  const [state, action, pending] = useActionState(saveOptOutSignals, initial);
  return (
    <div className="mt-[12px]">
      <div className="rounded-[8px] border border-line bg-tint px-[13px] py-[10px]">
        <p className="t-caption text-muted">Saved configuration</p>
        <p className="t-body mt-[4px] text-body">
          {saved
            ? `${saved.keywords.join(", ")}${saved.dtmf ? ` · DTMF ${saved.dtmf}` : ""}`
            : "No opt-out signals are saved yet."}
        </p>
      </div>
      <form action={action} className="mt-[12px] flex flex-col gap-[12px]">
        <Field id="keywords" label="Keywords" labelSize="sm" helper="Comma or newline separated. None are assumed." error={state.field === "keywords" ? state.error : undefined}>
          <TextArea
            id="keywords"
            name="keywords"
            rows={3}
            defaultValue={saved?.keywords.join("\n") ?? "stop\nunsubscribe"}
            invalid={state.field === "keywords"}
          />
        </Field>
        <Field id="dtmf" label="DTMF digit (optional)" labelSize="sm">
          <TextInput id="dtmf" name="dtmf" defaultValue={saved?.dtmf ?? "9"} />
        </Field>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save opt-out signals"}
        </Button>
        <Notice state={state} />
      </form>
    </div>
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

export function StartQualificationRunForm({
  leadId,
  questionSetId,
  questionSetLabel,
}: {
  leadId: string;
  questionSetId: string;
  questionSetLabel: string;
}) {
  const [state, action, pending] = useActionState(startQualificationRunAction, initial);
  return (
    <form action={action} className="mt-[12px] flex flex-col gap-[12px]">
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="questionSetId" value={questionSetId} />
      <p className="t-caption text-muted">
        Starts a run against the synthetic fixture lead and set{" "}
        <span className="t-mono">{questionSetLabel}</span>. Without Exotel this stays{" "}
        <span className="t-mono">not_configured</span> — not a live dial.
      </p>
      <Field id="channel" label="Channel" labelSize="sm">
        <Select id="channel" name="channel" defaultValue="voice">
          <option value="voice">Voice</option>
          <option value="whatsapp">WhatsApp</option>
        </Select>
      </Field>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Starting…" : "Start non-dispatched run"}
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
}: {
  runId: string;
  canResume: boolean;
}) {
  const [state, action, pending] = useActionState(resumeQualificationRun, initial);
  return (
    <div className="mt-[12px] flex flex-col gap-[10px]">
      <p className="t-caption text-muted">
        Resume does not place a call. Retry and due-retries invoke dial() and are not offered
        here — missing Exotel credentials are not authorisation to retry.
      </p>
      {canResume ? (
        <form action={action} className="flex flex-wrap gap-[10px]">
          <input type="hidden" name="runId" value={runId} />
          <Button type="submit" size="sm" variant="secondary" disabled={pending}>
            {pending ? "Resuming…" : "Resume incomplete run"}
          </Button>
          <Notice state={state} />
        </form>
      ) : (
        <p className="t-body text-body">Resume is available only when the run state is incomplete.</p>
      )}
    </div>
  );
}

export function DueRetriesNotice() {
  return (
    <p className="t-body mt-[10px] text-body">
      Due provider retries call dial(). This console does not submit that request. Use an
      isolated simulated-provider environment when dispatch behaviour must be exercised.
    </p>
  );
}
