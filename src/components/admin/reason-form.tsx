"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Select, TextArea } from "@/components/ui/field";
import type { AdminFormState } from "@/app/actions/admin";

/**
 * The decision panel every staff action goes through (A-04, A-06, A-09, A-20).
 *
 * One component, because the approved design uses one panel for all of them:
 * a title, a sentence saying what the decision does, an optional reason
 * category, a required free-text reason, and a confirm alongside a way out.
 *
 * The reason field is not validated here. It is validated in the store, which
 * refuses before it changes anything, and the refusal comes back as form state.
 * A client-side check would be a courtesy that a second screen could forget;
 * putting the gate where the record changes means it cannot be skipped and,
 * incidentally, that it still holds with scripting off.
 */
export function ReasonForm({
  action,
  title,
  body,
  confirmLabel,
  destructive,
  categories,
  hidden,
  cancel,
}: {
  action: (state: AdminFormState, formData: FormData) => Promise<AdminFormState>;
  title: string;
  body: string;
  confirmLabel: string;
  destructive?: boolean;
  categories?: readonly string[];
  /** Fields naming the record and the decision. Never the actor. */
  hidden: Readonly<Record<string, string>>;
  cancel?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(action, {});

  if (state.done) {
    return (
      <Card className="border-[#BFE0CE] bg-chip-success-bg p-[18px]">
        <h3 className="t-card-title text-success">Recorded</h3>
        <p className="t-body mt-[6px] text-body">{state.done}</p>
        <p className="t-caption mt-[8px] text-muted">
          An audit entry was written with your reason. Nothing here moved money or changed any
          real account.
        </p>
      </Card>
    );
  }

  return (
    <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[20px]">
      <form action={formAction} className="flex flex-col gap-[14px]">
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}

        <div>
          <h3 className="t-card-title text-ink">{title}</h3>
          <p className="t-body mt-[6px] text-body">{body}</p>
        </div>

        {state.error ? (
          <p
            role="alert"
            id="reason-error"
            className="rounded-[8px] bg-chip-danger-bg px-[13px] py-[10px] text-[14px] font-semibold text-danger"
          >
            {state.error}
          </p>
        ) : null}

        {categories ? (
          <Field id="reasonCategory" label="Reason category">
            <Select id="reasonCategory" name="reasonCategory" defaultValue={categories[0]}>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <Field
          id="reason"
          label="Reason"
          helper="Written to the audit log. Where the person is told the outcome, they see this."
        >
          <TextArea
            id="reason"
            name="reason"
            rows={3}
            aria-describedby={state.error ? "reason-error reason-helper" : "reason-helper"}
            aria-invalid={state.error ? true : undefined}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-[12px]">
          <Button type="submit" variant={destructive ? "destructive" : "primary"} disabled={pending}>
            {pending ? "Recording…" : confirmLabel}
          </Button>
          {cancel}
        </div>
      </form>
    </Card>
  );
}
