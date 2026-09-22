"use client";

import { useActionState } from "react";
import { createTicket, type TicketFormState } from "@/app/actions/seller-support";
import { TICKET_TOPICS } from "@/lib/domain/support-topics";
import { Button } from "@/components/ui/button";
import { Field, Select, TextArea, TextInput } from "@/components/ui/field";
import { DECISIONS } from "@/lib/config/business-rules";

/** S-23 new-ticket form. */
export function NewTicketForm({ scope = "seller" }: { scope?: "seller" | "builder" }) {
  const [state, action, pending] = useActionState<TicketFormState, FormData>(createTicket, {});
  const err = state.errors ?? {};
  const v = state.values ?? {};

  return (
    <form action={action} className="flex flex-col gap-[16px]">
      <input type="hidden" name="scope" value={scope} />
      <Field id="topic" label="Topic">
        <Select id="topic" name="topic" defaultValue={v.topic ?? TICKET_TOPICS[0]}>
          {TICKET_TOPICS.map((topic) => (
            <option key={topic} value={topic}>
              {topic}
            </option>
          ))}
        </Select>
      </Field>

      <Field id="subject" label="Subject" error={err.subject}>
        <TextInput
          id="subject"
          name="subject"
          defaultValue={v.subject ?? ""}
          invalid={Boolean(err.subject)}
          aria-describedby={err.subject ? "subject-error" : undefined}
        />
      </Field>

      <Field
        id="body"
        label="What happened?"
        error={err.body}
        helper="Include lead or order references where you have them — it saves a round trip."
      >
        <TextArea
          id="body"
          name="body"
          rows={6}
          defaultValue={v.body ?? ""}
          invalid={Boolean(err.body)}
          aria-describedby={err.body ? "body-error" : "body-helper"}
        />
      </Field>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit ticket"}
        </Button>
        {/* D-12. No response time is shown, because none has been agreed. */}
        <p className="t-caption mt-[10px] text-muted">
          {DECISIONS["D-12"].pendingCopy} — support responds on the ticket, and the reply appears
          in your list.
        </p>
        <p className="t-caption mt-[4px] text-muted">
          Attachments are not available yet. File upload needs a storage location and a scanning
          step that kkl-backend has not published, and a control that silently dropped a
          screenshot would be worse than its absence.
        </p>
      </div>
    </form>
  );
}
