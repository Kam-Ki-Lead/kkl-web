"use client";

import { useActionState } from "react";
import {
  registerSyntheticQuestions,
  resumeQualificationRun,
  retryQualificationRun,
  saveCallingWindow,
  saveOptOutSignals,
  startQualificationRunAction,
  submitQualificationReview,
  type QualificationActionState,
} from "@/app/actions/qualification";
import { Button } from "@/components/ui/button";
import { Field, Select, TextInput, TextArea } from "@/components/ui/field";
import type {
  ActionCapability,
  CallingWindowConfig,
  OptOutConfig,
} from "@/lib/services/backend/qualification-reading";

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

export function CallingWindowForm({ saved }: { saved: CallingWindowConfig | null }) {
  const [state, action, pending] = useActionState(saveCallingWindow, initial);
  const window = saved?.window ?? null;
  const configured = saved?.configured === true;
  return (
    <div className="mt-[12px]">
      <div className="rounded-[8px] border border-line bg-tint px-[13px] py-[10px]">
        <p className="t-caption text-muted">Saved configuration</p>
        <p className="t-body mt-[4px] text-body">
          {configured && window
            ? `${window.timeZone} ${window.start}–${window.end}`
            : "No calling window is saved yet (configured: false — unset, not a default)."}
        </p>
        <p className="t-caption mt-[4px] text-muted">
          Provenance: {saved?.provenance ?? "unset"}
          {saved?.setAt ? ` · set ${saved.setAt}` : ""}. staff_saved is not client approval.
          Form defaults below are for editing only — they are not the saved hours.
        </p>
      </div>
      <form action={action} className="mt-[12px] flex flex-col gap-[12px]">
        <Field id="timeZone" label="Time zone" labelSize="sm" error={state.field === "timeZone" ? state.error : undefined}>
          <TextInput
            id="timeZone"
            name="timeZone"
            defaultValue={window?.timeZone ?? ""}
            placeholder="Asia/Kolkata"
            invalid={state.field === "timeZone"}
          />
        </Field>
        <div className="grid grid-cols-2 gap-[12px]">
          <Field id="start" label="Start (HH:MM)" labelSize="sm" error={state.field === "start" ? state.error : undefined}>
            <TextInput
              id="start"
              name="start"
              defaultValue={window?.start ?? ""}
              placeholder="10:00"
              invalid={state.field === "start"}
            />
          </Field>
          <Field id="end" label="End (HH:MM)" labelSize="sm" error={state.field === "end" ? state.error : undefined}>
            <TextInput
              id="end"
              name="end"
              defaultValue={window?.end ?? ""}
              placeholder="19:00"
              invalid={state.field === "end"}
            />
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

export function OptOutSignalsForm({ saved }: { saved: OptOutConfig | null }) {
  const [state, action, pending] = useActionState(saveOptOutSignals, initial);
  const signals = saved?.signals ?? null;
  const configured = saved?.configured === true;
  return (
    <div className="mt-[12px]">
      <div className="rounded-[8px] border border-line bg-tint px-[13px] py-[10px]">
        <p className="t-caption text-muted">Saved configuration</p>
        <p className="t-body mt-[4px] text-body">
          {configured && signals
            ? `${signals.keywords.join(", ")}${signals.dtmf ? ` · DTMF ${signals.dtmf}` : ""}`
            : "No opt-out signals are saved yet (configured: false — unset, not a default)."}
        </p>
        <p className="t-caption mt-[4px] text-muted">
          Provenance: {saved?.provenance ?? "unset"}
          {saved?.setAt ? ` · set ${saved.setAt}` : ""}. staff_saved is not client approval.
          Form defaults below are for editing only.
        </p>
      </div>
      <form action={action} className="mt-[12px] flex flex-col gap-[12px]">
        <Field id="keywords" label="Keywords" labelSize="sm" helper="Comma or newline separated. None are assumed." error={state.field === "keywords" ? state.error : undefined}>
          <TextArea
            id="keywords"
            name="keywords"
            rows={3}
            defaultValue={signals?.keywords.join("\n") ?? ""}
            placeholder={"stop\nunsubscribe"}
            invalid={state.field === "keywords"}
          />
        </Field>
        <Field id="dtmf" label="DTMF digit (optional)" labelSize="sm">
          <TextInput id="dtmf" name="dtmf" defaultValue={signals?.dtmf ?? ""} placeholder="9" />
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
        <span className="t-mono">{questionSetLabel}</span>. Creation may return{" "}
        <span className="t-mono">effect: adapter_invoked</span> or{" "}
        <span className="t-mono">recorded_only</span>. Live acceptance is only{" "}
        <span className="t-mono">providerDispatch.dispatched</span>. If the server
        returns dispatched true, that already happened — report it; the console
        cannot undo it.
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

function capabilityLine(label: string, capability: ActionCapability | null | undefined): string {
  if (!capability) return `${label}: capabilities not returned`;
  if (!capability.allowed) {
    return `${label}: not allowed${capability.reason ? ` (${capability.reason})` : ""}`;
  }
  return (
    `${label}: allowed`
    + (capability.dispatchesProvider ? " and would dispatch — gated" : " without provider dispatch")
    + (capability.reason ? ` (${capability.reason})` : "")
  );
}

export function QualificationRecoveryForm({
  runId,
  resume,
  retry,
}: {
  runId: string;
  resume: ActionCapability | null;
  retry: ActionCapability | null;
}) {
  const [resumeState, resumeAction, resumePending] = useActionState(resumeQualificationRun, initial);
  const [retryState, retryAction, retryPending] = useActionState(retryQualificationRun, initial);
  const canResume = resume?.allowed === true;
  // Retry may dispatch; only offer the control when allowed AND not dispatching.
  const canRetrySafely = retry?.allowed === true && retry.dispatchesProvider === false;

  return (
    <div className="mt-[12px] flex flex-col gap-[10px]">
      <p className="t-caption text-muted">{capabilityLine("Resume", resume)}</p>
      <p className="t-caption text-muted">{capabilityLine("Retry", retry)}</p>
      <p className="t-caption text-muted">
        Resume never dispatches under this contract. Retry is offered only when
        capabilities say it does not dispatch. Due-retries stay off this console.
      </p>
      {canResume ? (
        <form action={resumeAction} className="flex flex-wrap gap-[10px]">
          <input type="hidden" name="runId" value={runId} />
          <Button type="submit" size="sm" variant="secondary" disabled={resumePending}>
            {resumePending ? "Resuming…" : "Resume incomplete run"}
          </Button>
          <Notice state={resumeState} />
        </form>
      ) : null}
      {canRetrySafely ? (
        <form action={retryAction} className="flex flex-wrap gap-[10px]">
          <input type="hidden" name="runId" value={runId} />
          <Button type="submit" size="sm" variant="secondary" disabled={retryPending}>
            {retryPending ? "Retrying…" : "Retry without provider dispatch"}
          </Button>
          <Notice state={retryState} />
        </form>
      ) : (
        <p className="t-body text-body">
          {retry?.dispatchesProvider
            ? "Retry would dispatch to a provider — not offered on this host."
            : "Safe retry is not available for this run."}
        </p>
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
