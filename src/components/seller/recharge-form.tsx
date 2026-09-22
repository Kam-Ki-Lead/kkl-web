"use client";

import { useActionState, useState } from "react";
import { startRecharge, type RechargeFormState } from "@/app/actions/recharge";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { Card } from "@/components/ui/card";
import { formatCreditBalance, formatExactInr } from "@/lib/format";

/**
 * S-15 recharge form.
 *
 * The pack buttons set the amount field rather than submitting on their own, so
 * there is one amount, one field and one submission — and the "credits after
 * recharge" line always reflects what is actually in the box.
 *
 * Pack sizes are placeholders and the screen says so: no recommended packs and
 * no bonus credits have been agreed, so none are implied by making one of them
 * look preferred.
 */
const PACKS = [1_000, 2_000, 5_000, 10_000];

export function RechargeForm({ balanceCredits }: { balanceCredits: number }) {
  const [state, action, pending] = useActionState<RechargeFormState, FormData>(startRecharge, {});
  const [amount, setAmount] = useState<string>(state.amount ?? "2000");

  const parsed = Number(amount.replace(/[₹,\s]/g, ""));
  const after = Number.isFinite(parsed) && parsed > 0 ? balanceCredits + parsed : balanceCredits;

  return (
    <form action={action} className="mt-[18px] flex flex-col gap-[16px]">
      {state.error ? (
        <p
          role="alert"
          className="rounded-[8px] bg-chip-danger-bg px-[14px] py-[10px] text-[14px] text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <fieldset>
        <legend className="t-label mb-[8px] text-ink">Choose an amount</legend>
        <div className="grid grid-cols-4 gap-[10px] max-[560px]:grid-cols-2">
          {PACKS.map((pack) => {
            const selected = parsed === pack;
            return (
              <button
                key={pack}
                type="button"
                onClick={() => setAmount(String(pack))}
                aria-pressed={selected}
                className={`min-h-[48px] rounded-[8px] border-[1.5px] text-[16px] font-bold transition-[background-color,border-color,color] duration-150 ${
                  selected
                    ? "border-brand bg-chip-neutral-bg text-brand"
                    : "border-line bg-white text-ink hover:border-[#C3C9DA]"
                }`}
              >
                {formatExactInr(pack)}
              </button>
            );
          })}
        </div>
        <p className="t-caption mt-[8px] text-muted">
          Pack sizes are placeholders. No recommended packs and no bonus credits have been set,
          so none is marked as better value.
        </p>
      </fieldset>

      <Field
        id="recharge-amount"
        label="Or enter an amount (₹)"
        helper="Whole rupees. 1 rupee buys 1 credit."
      >
        <TextInput
          id="recharge-amount"
          name="amount"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          invalid={Boolean(state.error)}
          aria-describedby={state.error ? undefined : "recharge-amount-helper"}
        />
      </Field>

      <Card className="bg-tint p-[16px]">
        <div className="flex flex-wrap items-baseline justify-between gap-[10px]">
          <span className="text-[15px] text-muted">Credits after recharge</span>
          <span className="text-[16px] font-bold text-ink">{formatCreditBalance(after)}</span>
        </div>
        <p className="t-caption mt-[6px] text-muted">
          A preview of what the server will do with this amount. Your balance is whatever the
          ledger says after the payment — this page never sets it.
        </p>
      </Card>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Contacting payment…" : "Continue to payment"}
        </Button>
        <p className="t-caption mt-[10px] text-muted">
          Payment is handled by a payment gateway, server-side. No card or UPI detail is entered
          on this screen or held by this application.
        </p>
      </div>
    </form>
  );
}
