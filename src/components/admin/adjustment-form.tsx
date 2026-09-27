"use client";

import { useActionState, useState } from "react";
import { adjustCredits, type AdminFormState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { formatExactInr } from "@/lib/format";

const DIRECTIONS = [
  {
    key: "credit",
    label: "Credit the account",
    note: "Adds credits — used for goodwill or a confirmed error",
  },
  {
    key: "debit",
    label: "Debit the account",
    note: "Removes credits — used to correct an earlier over-credit",
  },
] as const;

/**
 * A-19's form.
 *
 * The running "balance after" is computed here purely so the person can see
 * what they are about to do. It is a preview and nothing reads it: the store
 * recomputes from the ledger, because a figure a browser calculated is not a
 * balance.
 *
 * Validation is the store's. Both gates — a whole number of at least one
 * credit, and a reason — are checked where the entry is written, so a second
 * screen reaching for the same service cannot skip them, and so the refusal
 * still happens with scripting off.
 */
export function AdjustmentForm({
  accountId,
  currentBalanceInr,
  live,
}: {
  accountId: string;
  currentBalanceInr: number;
  live: boolean;
}) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(adjustCredits, {});
  // The radio group IS the submitted field — `name="direction"` — rather than a
  // hidden input mirroring this state. React 19 resets a form's DOM once its
  // action completes, so a refused adjustment could leave the highlighted
  // option and the mirrored value disagreeing, and the next press would move
  // credit in the direction nobody chose. This state now only drives the
  // "balance after" preview, where being briefly wrong costs nothing.
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");

  const parsed = Number(amount.replace(/[^0-9]/g, ""));
  const delta = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  const after = direction === "debit" ? Math.max(0, currentBalanceInr - delta) : currentBalanceInr + delta;

  return (
    <Card className="p-[20px]">
      <form action={action} className="flex flex-col gap-[16px]">
        <input type="hidden" name="accountId" value={accountId} />

        {state.error ? (
          <p
            role="alert"
            id="adjust-error"
            className="rounded-[8px] bg-chip-danger-bg px-[13px] py-[10px] text-[14px] font-semibold text-danger"
          >
            {state.error}
          </p>
        ) : null}

        <fieldset className="flex flex-col gap-[8px]">
          <legend className="t-label text-body">Direction</legend>
          {DIRECTIONS.map((option) => {
            const active = direction === option.key;
            return (
              <label
                key={option.key}
                className={`flex cursor-pointer gap-[11px] rounded-[8px] border-[1.5px] px-[14px] py-[12px] ${
                  active ? "border-brand bg-tint" : "border-line bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="direction"
                  value={option.key}
                  checked={active}
                  onChange={() => setDirection(option.key)}
                  className="mt-[4px] h-[16px] w-[16px] flex-none accent-[#1B3BB3]"
                />
                <span className="min-w-0">
                  <span
                    className={`block text-[15px] font-semibold ${active ? "text-brand" : "text-ink"}`}
                  >
                    {option.label}
                  </span>
                  {/* The approved notes are not one colour: the credit note is
                      slate #3C4763, the debit note the muted caption. Matched
                      as approved rather than harmonised. */}
                  <span className={`t-caption block ${option.key === "credit" ? "text-slate" : "text-muted"}`}>
                    {option.note}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>

        <Field id="amount" label="Amount in credits" helper="A whole number, at least 1.">
          <TextInput
            id="amount"
            name="amount"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-describedby={state.error ? "adjust-error amount-helper" : "amount-helper"}
          />
        </Field>

        {delta > 0 ? (
          <p className="rounded-[8px] bg-tint px-[13px] py-[10px] text-[15px] text-body">
            Balance after this adjustment:{" "}
            <strong className="text-ink">{formatExactInr(after)}</strong>
            <span className="t-caption mt-[2px] block text-muted">
              A preview, computed in the browser. The recorded figure is derived from the ledger
              on the server.
            </span>
          </p>
        ) : null}

        <Field
          id="reason"
          label="Reason"
          helper="Mandatory. Written to the audit log and attached to the ledger entry, so the account holder sees it in their own billing history."
        >
          <TextArea id="reason" name="reason" rows={3} aria-describedby="reason-helper" />
        </Field>

        {live ? null : (
          <p className="t-caption rounded-[8px] bg-[#FFF7E8] px-[13px] py-[10px] text-body">
            This account has no console in this build, so there is no ledger to post into. The
            adjustment will be recorded in the audit log only, and the screen will say so rather
            than implying an entry the account holder can see.
          </p>
        )}

        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Recording…" : "Record this adjustment"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
