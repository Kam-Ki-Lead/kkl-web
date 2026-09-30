"use client";

import { useActionState, useState } from "react";
import {
  decideVerification,
  startVerification,
  submitVerification,
  type VerificationFormState,
} from "@/app/actions/verification";
import { Button } from "@/components/ui/button";
import { Field, Select, TextArea } from "@/components/ui/field";
import type { GatedAction, VerificationOutcome } from "@/lib/domain/types";

/** CR07 — opens a case for an action that requires one. */
export function StartVerificationForm({
  action,
  label,
}: {
  action: GatedAction;
  label: string;
}) {
  const [state, submit, pending] = useActionState<VerificationFormState, FormData>(
    startVerification,
    {},
  );
  return (
    <form action={submit} className="mt-[10px] flex flex-col gap-[8px]">
      <input type="hidden" name="action" value={action} />
      {state.done ? (
        <p role="status" className="t-caption font-semibold text-success">
          {state.done}
        </p>
      ) : null}
      {state.error ? (
        <p role="alert" className="t-caption font-semibold text-danger">
          {state.error}
        </p>
      ) : null}
      <div>
        <Button type="submit" size="action" variant="secondary" disabled={pending}>
          {pending ? "Opening…" : `Start the check for ${label.toLowerCase()}`}
        </Button>
      </div>
    </form>
  );
}

/**
 * Hands a case to the sample verification service.
 *
 * The button says which service it is going to. There is no real provider: none
 * has been selected, and a control that implied one would be the start of a
 * compliance claim nobody has made.
 */
export function SubmitVerificationForm({
  reference,
  persisted = false,
}: {
  reference: string;
  persisted?: boolean;
}) {
  const [state, submit, pending] = useActionState<VerificationFormState, FormData>(
    submitVerification,
    {},
  );
  return (
    <form action={submit} className="mt-[10px] flex flex-col gap-[8px]">
      <input type="hidden" name="reference" value={reference} />
      {state.done ? (
        <p role="status" className="t-caption font-semibold text-body">
          {state.done}
        </p>
      ) : null}
      {state.error ? (
        <p role="alert" className="t-caption font-semibold text-danger">
          {state.error}
        </p>
      ) : null}
      <div>
        <Button type="submit" size="action" disabled={pending}>
          {pending
            ? "Sending…"
            : persisted
              ? "Record that this check cannot be carried out"
              : "Send to the sample verification service"}
        </Button>
      </div>
      <p className="t-caption text-muted">
        {persisted
          ? "No identity document is collected. The case stays on this account. No provider is configured, so this does not pass the check."
          : "No identity document is collected and nothing leaves this build. The service is a labelled stand-in so each outcome can be reviewed; no provider has been chosen."}
      </p>
    </form>
  );
}

const DECISIONS: readonly { value: VerificationOutcome; label: string }[] = [
  { value: "verified", label: "Verified — the check passed" },
  { value: "failed", label: "Did not pass" },
  { value: "needs_review", label: "Send back for review" },
  { value: "expired", label: "Expired — an earlier check no longer counts" },
];

/**
 * CR07 — a staff decision on a case.
 *
 * The reason is required. So is the reminder underneath: a verification decision
 * is not an account suspension and not a listing moderation, and the three must
 * stay separate. It is written on the screen because the three were conflated in
 * the demo and the confusion was expensive.
 *
 * The select is uncontrolled apart from the state mirror, and the reason survives
 * a refusal: React 19 resets a form's DOM once its action completes, so a refused
 * decision would otherwise come back with the first option selected and the typed
 * reason gone — and the next press would record something nobody chose.
 */
export function VerificationDecisionForm({ reference }: { reference: string }) {
  const [state, submit, pending] = useActionState<VerificationFormState, FormData>(
    decideVerification,
    {},
  );
  const [outcome, setOutcome] = useState<string>("verified");
  const [reason, setReason] = useState("");
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    // A refusal keeps what was typed; a recorded decision clears it.
    if (state.error === undefined) setReason("");
  }

  return (
    <form action={submit} className="flex flex-col gap-[12px]">
      <input type="hidden" name="reference" value={reference} />

      {state.done ? (
        <p role="status" className="t-caption font-semibold text-success">
          {state.done}
        </p>
      ) : null}
      {state.error ? (
        <p role="alert" className="t-caption font-semibold text-danger">
          {state.error}
        </p>
      ) : null}

      <Field id="verification-outcome" label="Decision">
        <Select
          id="verification-outcome"
          name="outcome"
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
        >
          {DECISIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        id="verification-reason"
        label="Reason"
        helper="Required. Kept with the decision, written to the audit log, and shown to the person where they are told the outcome."
      >
        <TextArea
          id="verification-reason"
          name="reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Recording…" : "Record decision"}
        </Button>
      </div>

      <p className="t-caption text-muted">
        This decides verification only. It does not suspend or restore the account, and it does not
        publish, hold or take down a listing — those are separate decisions on separate screens.
      </p>
    </form>
  );
}
