"use client";

import { useActionState, useState } from "react";
import {
  respondToLeadRequest,
  setLeadRequestStatus,
  type AdminLeadRequestFormState,
} from "@/app/actions/lead-requests";
import type { LeadRequestStatus } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Select, TextArea, TextInput } from "@/components/ui/field";

/**
 * CR03 — the staff composer on a lead request.
 *
 * Same rule as the support console's reply form, for the same reason: the
 * mode toggle is the one control that changes where text ends up, so it says
 * what it does in a full sentence, and the default is **public** — a staff
 * note shown to the requester is a leak, a reply also visible to staff is
 * not. The server reads the mode as a boolean and nothing else.
 *
 * The status form moves the request through the proposed statuses (D-17). A
 * move is appended to the request's history and written to the audit log; the
 * note, when left, is shown to the requester on their own view.
 *
 * WHY THE MODE TRAVELS ON THE SUBMIT BUTTON
 * -----------------------------------------
 * It used to travel in a hidden input driven by the toggle's client state, and
 * that was not safe. React 19 resets a form's DOM once its action completes,
 * and a refused submission therefore left the toggle and the component's own
 * state able to disagree — a staff member who selected "Internal note", hit a
 * validation error, retyped and pressed again could have sent their note to the
 * user. Carrying the mode on the button means the value submitted is the one
 * the button the person pressed said it would do, in the same render as its
 * label and the sentence above the field. The three cannot disagree.
 */
export function LeadRequestActions({
  requestId,
  currentStatus,
}: {
  requestId: string;
  currentStatus: LeadRequestStatus;
}) {
  const [replyState, replyAction, replying] = useActionState<
    AdminLeadRequestFormState,
    FormData
  >(respondToLeadRequest, {});
  const [statusState, statusAction, moving] = useActionState<
    AdminLeadRequestFormState,
    FormData
  >(setLeadRequestStatus, {});
  const [internal, setInternal] = useState(false);

  return (
    <Card className="p-[20px]">
      <form action={replyAction} className="flex flex-col gap-[14px]">
        <input type="hidden" name="requestId" value={requestId} />

        <div role="group" aria-label="Reply mode" className="flex flex-wrap gap-[8px]">
          {[
            { key: false, label: "Reply to the requester" },
            { key: true, label: "Internal note" },
          ].map((option) => (
            <button
              key={String(option.key)}
              type="button"
              aria-pressed={internal === option.key}
              onClick={() => setInternal(option.key)}
              className={`min-h-[40px] rounded-[8px] border-[1.5px] px-[14px] text-[14px] font-semibold transition-[background-color,border-color,color] duration-150 ${
                internal === option.key
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-white text-body hover:border-[#C6CCE0]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <p
          className={`rounded-[8px] px-[13px] py-[10px] text-[14px] font-semibold ${
            internal ? "bg-[#EFF1F7] text-ink" : "bg-tint text-brand"
          }`}
        >
          {internal
            ? "Internal note — the requester never sees this. It stays in this console; their own view of the request has no field that could carry it."
            : "Reply — this appears on the requester's own view of this request in the Seller console."}
        </p>

        {replyState.error ? (
          <p
            role="alert"
            className="rounded-[8px] bg-chip-danger-bg px-[13px] py-[10px] text-[14px] font-semibold text-danger"
          >
            {replyState.error}
          </p>
        ) : null}
        {replyState.done ? (
          <p
            role="status"
            className="rounded-[8px] bg-chip-success-bg px-[13px] py-[10px] text-[14px] font-semibold text-success"
          >
            {replyState.done}
          </p>
        ) : null}

        <Field id="reply-body" label={internal ? "Internal note" : "Reply"}>
          <TextArea id="reply-body" name="body" rows={4} />
        </Field>

        <div>
          <Button type="submit" name="mode" value={internal ? "internal" : "public"} size="action" disabled={replying}>
            {replying ? "Sending…" : internal ? "Add internal note" : "Send reply"}
          </Button>
        </div>
      </form>

      <form
        action={statusAction}
        className="mt-[16px] flex flex-col gap-[10px] border-t border-line pt-[16px]"
      >
        <input type="hidden" name="requestId" value={requestId} />
        {statusState.error ? (
          <p
            role="alert"
            className="rounded-[8px] bg-chip-danger-bg px-[13px] py-[10px] text-[14px] font-semibold text-danger"
          >
            {statusState.error}
          </p>
        ) : null}
        {statusState.done ? (
          <p
            role="status"
            className="rounded-[8px] bg-chip-success-bg px-[13px] py-[10px] text-[14px] font-semibold text-success"
          >
            {statusState.done}
          </p>
        ) : null}
        <Field
          id="request-status"
          label="Move the request"
          helper="Appended to the request's history and the audit log. The note is shown to the requester."
        >
          <Select id="request-status" name="status" defaultValue={currentStatus}>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under review</option>
            <option value="needs_clarification">Needs clarification</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="closed">Closed</option>
          </Select>
        </Field>
        <Field id="status-note" label="Note with the move (optional)">
          <TextInput id="status-note" name="note" />
        </Field>
        <div>
          <Button type="submit" variant="secondary" size="action" disabled={moving}>
            {moving ? "Recording…" : "Update status"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
