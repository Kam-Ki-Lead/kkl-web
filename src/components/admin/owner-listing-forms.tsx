"use client";

import { useActionState, useState } from "react";
import {
  decideOwnerListing,
  respondToOwnerListing,
  type OwnerListingActionState,
} from "@/app/actions/owner-listings";
import { Button } from "@/components/ui/button";
import { Field, Select, TextArea } from "@/components/ui/field";

/**
 * CR02 — the staff controls on an owner submission.
 *
 * Two separate forms, on purpose. A message to the owner and a note for
 * colleagues are different acts with different audiences, and one textarea with
 * a checkbox beside it is how a note ends up on somebody's screen.
 *
 * WHY THE MODE TRAVELS ON THE BUTTON
 * ----------------------------------
 * It used to travel in a hidden input driven by client state, and that was
 * unsafe. A server action's response re-renders the server tree around this
 * form, and that re-render was observed to remount it: the toggle reverted to
 * its default and a typed message was wiped. A staff member who had selected
 * "Internal note", hit a validation error, retyped and pressed again would have
 * sent their note to the owner.
 *
 * Now the mode is `name="mode"` on the submit button itself. Whatever is
 * submitted is what the button the person pressed said it would do, because it
 * is the same render. State can still reset, but it can no longer lie: the
 * button's label, the explanatory line and the submitted value cannot disagree.
 *
 * WHY THE CONTROLS ARE RE-SYNCED FROM THE ACTION STATE
 * ---------------------------------------------------
 * React 19 resets a form's DOM once its action completes — that is deliberate,
 * and right for a form whose submission succeeded. It is wrong for one that was
 * refused, because it throws away what the person typed and leaves a `<select>`
 * showing its first option while the component's own state still believes
 * otherwise. So each action echoes back what was submitted, and the effects
 * below put the controls where the echo says they should be after every
 * response: restored on a refusal, cleared on a success.
 */
export function OwnerListingReplyForm({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState<OwnerListingActionState, FormData>(
    respondToOwnerListing,
    {},
  );
  const [internal, setInternal] = useState(false);
  const [body, setBody] = useState("");
  // React's documented way to adjust state when an input changes: compare
  // against the last value seen and set during render, not in an effect. The
  // input here is the action's response — on a refusal its echo carries the
  // text and the mode back, on a success it carries only the mode so the box
  // empties.
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.values !== undefined) {
      setInternal(state.values.mode === "internal");
      setBody(state.values.body ?? "");
    }
  }

  return (
    <form action={action} className="flex flex-col gap-[12px]">
      <input type="hidden" name="listingId" value={listingId} />

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

      <div className="flex flex-wrap gap-[8px]">
        <button
          type="button"
          aria-pressed={!internal}
          onClick={() => setInternal(false)}
          className={`min-h-[44px] rounded-[8px] border px-[14px] text-[14px] font-semibold ${
            internal ? "border-line bg-white text-body" : "border-brand bg-chip-neutral-bg text-brand"
          }`}
        >
          Message the owner
        </button>
        <button
          type="button"
          aria-pressed={internal}
          onClick={() => setInternal(true)}
          className={`min-h-[44px] rounded-[8px] border px-[14px] text-[14px] font-semibold ${
            internal ? "border-brand bg-chip-neutral-bg text-brand" : "border-line bg-white text-body"
          }`}
        >
          Internal note
        </button>
      </div>

      <Field
        id="owner-listing-body"
        label={internal ? "Internal note" : "Message to the owner"}
        helper={
          internal
            ? "Stays in this console. The owner's own view of the listing has no field that could carry it."
            : "The owner sees this on their own view of the listing."
        }
      >
        <TextArea
          id="owner-listing-body"
          name="body"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </Field>

      <div>
        {/* The mode rides on the button, not on hidden client state. */}
        <Button type="submit" name="mode" value={internal ? "internal" : "public"} disabled={pending}>
          {pending ? "Sending…" : internal ? "Add internal note" : "Send message"}
        </Button>
      </div>
    </form>
  );
}

const DECISIONS: readonly { value: string; label: string }[] = [
  { value: "in_review", label: "Pick it up — being reviewed" },
  { value: "changes_requested", label: "Ask the owner for changes" },
  { value: "cleared", label: "Clear it — review found nothing wrong" },
  { value: "declined", label: "Decline it" },
];

/**
 * Recording a decision.
 *
 * The reason is required, not optional. It is kept with the decision, it is in
 * the audit log, and where the owner is told the outcome it is what they read —
 * "Changes needed" with no explanation is not a decision, it is a dead end.
 */
export function OwnerListingDecisionForm({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState<OwnerListingActionState, FormData>(
    decideOwnerListing,
    {},
  );
  const [decision, setDecision] = useState("in_review");
  const [reason, setReason] = useState("");
  // Same adjust-during-render pattern as the reply form. Without it the select
  // reverted to its first option after a refused decision, and the next click
  // recorded a decision nobody had chosen.
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.values !== undefined) {
      const echoed = state.values.decision ?? "";
      if (DECISIONS.some((d) => d.value === echoed)) setDecision(echoed);
      setReason(state.values.reason ?? "");
    }
  }

  return (
    <form action={action} className="flex flex-col gap-[12px]">
      <input type="hidden" name="listingId" value={listingId} />

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

      <Field id="owner-decision" label="Decision">
        <Select
          id="owner-decision"
          name="decision"
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
        >
          {DECISIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </Select>
      </Field>

      {decision === "cleared" ? (
        <p className="t-caption rounded-[8px] border border-[#F3DFB4] bg-[#FFF7E8] px-[13px] py-[10px] text-body">
          <strong className="text-ink">Clearing does not publish the listing.</strong> It records
          that review found nothing wrong. Whether an owner&rsquo;s listing publishes, when, and on
          what terms is part of the owner policy still to be confirmed.
        </p>
      ) : null}

      <Field
        id="owner-decision-reason"
        label="Reason"
        helper="Required. Kept with the decision, written to the audit log, and shown to the owner where they are told the outcome."
      >
        <TextArea
          id="owner-decision-reason"
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
    </form>
  );
}
