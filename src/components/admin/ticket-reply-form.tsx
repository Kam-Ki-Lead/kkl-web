"use client";

import { useActionState, useState } from "react";
import { replyToTicket, resolveTicket, type AdminFormState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, TextArea } from "@/components/ui/field";

/**
 * A-23's reply composer.
 *
 * The mode toggle is the one control on this screen that changes where text
 * ends up, so it says what it does in a full sentence above the field rather
 * than relying on the tab's label. The default is **public**, deliberately: a
 * staff note shown to a user is a leak, while a reply also visible to staff is
 * not, so the safer default is the one the user can see.
 *
 * The mode is a form field, which means it is untrusted input. The server reads
 * it as a boolean and nothing else — it cannot name a thread, an account or an
 * author. Where a public reply is delivered comes from the ticket's own record.
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
export function TicketReplyForm({
  reference,
  liveConsole,
  resolved,
}: {
  reference: string;
  liveConsole: "seller" | "builder" | null;
  resolved: boolean;
}) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(replyToTicket, {});
  const [resolveState, resolveAction, resolving] = useActionState<AdminFormState, FormData>(
    resolveTicket,
    {},
  );
  const [internal, setInternal] = useState(false);

  return (
    <Card className="p-[20px]">
      <form action={action} className="flex flex-col gap-[14px]">
        <input type="hidden" name="reference" value={reference} />

        <div role="group" aria-label="Reply mode" className="flex flex-wrap gap-[8px]">
          {[
            { key: false, label: "Reply to the user" },
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
            ? "Internal note — the user never sees this. It stays in this console; their support thread has no field that could carry it."
            : liveConsole
              ? `Reply — this goes into the requester's own support thread in the ${liveConsole === "seller" ? "Seller" : "Builder"} console.`
              : "Reply — this requester has no console in this build, so the reply is recorded on this thread and delivered nowhere."}
        </p>

        {state.error ? (
          <p
            role="alert"
            id="reply-error"
            className="rounded-[8px] bg-chip-danger-bg px-[13px] py-[10px] text-[14px] font-semibold text-danger"
          >
            {state.error}
          </p>
        ) : null}
        {state.done ? (
          <p
            role="status"
            className="rounded-[8px] bg-chip-success-bg px-[13px] py-[10px] text-[14px] font-semibold text-success"
          >
            {state.done}
          </p>
        ) : null}

        <Field id="body" label={internal ? "Internal note" : "Reply"}>
          <TextArea id="body" name="body" rows={4} />
        </Field>

        <div>
          <Button type="submit" name="mode" value={internal ? "internal" : "public"} size="action" disabled={pending}>
            {pending ? "Sending…" : internal ? "Add internal note" : "Send reply"}
          </Button>
        </div>
      </form>

      {resolved ? (
        <p className="t-caption mt-[16px] border-t border-line pt-[14px] text-muted">
          This ticket is resolved. The requester&rsquo;s own thread shows it resolved too.
        </p>
      ) : (
        <form action={resolveAction} className="mt-[16px] flex flex-col gap-[10px] border-t border-line pt-[16px]">
          <input type="hidden" name="reference" value={reference} />
          {resolveState.error ? (
            <p
              role="alert"
              id="resolve-error"
              className="rounded-[8px] bg-chip-danger-bg px-[13px] py-[10px] text-[14px] font-semibold text-danger"
            >
              {resolveState.error}
            </p>
          ) : null}
          <Field
            id="resolve-reason"
            label="Resolve this ticket"
            helper="A reason is required, and goes to the audit log. Resolving also closes it in the requester's console."
          >
            <TextArea id="resolve-reason" name="reason" rows={2} aria-describedby="resolve-reason-helper" />
          </Field>
          <div>
            <Button type="submit" variant="secondary" size="action" disabled={resolving}>
              {resolving ? "Recording…" : "Mark as resolved"}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
