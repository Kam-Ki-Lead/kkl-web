"use client";

import { useActionState } from "react";
import {
  replyToTicket,
  resolveTicket,
  type ReplyFormState,
} from "@/app/actions/seller-support";
import { Button } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";
import { Card } from "@/components/ui/card";

/**
 * S-24 reply and resolve.
 *
 * Two separate forms, so "Send reply" and "Mark as resolved" cannot be confused
 * for one another by a keyboard press. A resolved ticket keeps its reply box:
 * the approved copy says replying reopens it, and taking the box away would make
 * that impossible.
 */
export function TicketReplyForm({
  reference,
  resolved,
  scope = "seller",
}: {
  reference: string;
  resolved: boolean;
  scope?: "seller" | "builder";
}) {
  const [state, action, pending] = useActionState<ReplyFormState, FormData>(replyToTicket, {});

  return (
    <div className="flex flex-col gap-[12px]">
      {resolved ? (
        <Card className="bg-chip-success-bg p-[16px]">
          <p className="text-[15px] font-semibold text-success">This ticket is resolved.</p>
          <p className="t-body mt-[2px] text-body">
            Replying reopens it, so use the box below if anything is still outstanding.
          </p>
        </Card>
      ) : null}

      <form action={action} className="flex flex-col gap-[12px]">
        <input type="hidden" name="reference" value={reference} />
        <input type="hidden" name="scope" value={scope} />

        {state.error ? (
          <p
            role="alert"
            className="rounded-[8px] bg-chip-danger-bg px-[14px] py-[10px] text-[14px] text-danger"
          >
            {state.error}
          </p>
        ) : null}

        <Field id="reply-body" label="Reply">
          <TextArea
            id="reply-body"
            name="body"
            rows={4}
            defaultValue={state.value ?? ""}
            invalid={Boolean(state.error)}
            aria-describedby={state.error ? undefined : undefined}
          />
        </Field>

        <div>
          <Button type="submit" size="action" disabled={pending}>
            {pending ? "Sending…" : "Send reply"}
          </Button>
        </div>
      </form>

      {resolved ? null : (
        <form action={resolveTicket}>
          <input type="hidden" name="reference" value={reference} />
          <input type="hidden" name="scope" value={scope} />
          <Button type="submit" variant="secondary" size="action">
            Mark as resolved
          </Button>
        </form>
      )}
    </div>
  );
}
