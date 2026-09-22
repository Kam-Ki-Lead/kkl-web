"use client";

import { useActionState } from "react";
import { unlockContact, type UnlockFormState } from "@/app/actions/builder-enquiries";
import { Button } from "@/components/ui/button";
import { formatCreditBalance, formatExactInr } from "@/lib/format";

/**
 * Alternative B's unlock (B-17).
 *
 * The price and the resulting balance are stated before the button, because
 * this spends credits. The idempotency key is a hidden field for the same
 * reason the lead purchase carries one: a retried POST must not charge twice.
 */
export function UnlockContactForm({
  enquiryId,
  idempotencyKey,
  priceCredits,
  balanceCredits,
}: {
  enquiryId: string;
  idempotencyKey: string;
  priceCredits: number;
  balanceCredits: number;
}) {
  const [state, action, pending] = useActionState<UnlockFormState, FormData>(unlockContact, {});
  const affordable = balanceCredits >= priceCredits;

  return (
    <form action={action} className="flex flex-col gap-[10px]">
      <input type="hidden" name="id" value={enquiryId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      {state.error ? (
        <p
          role="alert"
          className="rounded-[8px] bg-chip-danger-bg px-[14px] py-[10px] text-[14px] text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <p className="t-caption text-muted">
        Unlocking costs {formatExactInr(priceCredits)}. Your balance is{" "}
        {formatCreditBalance(balanceCredits)}.
      </p>

      <div>
        <Button type="submit" disabled={pending || !affordable}>
          {pending ? "Unlocking…" : `Unlock for ${formatExactInr(priceCredits)}`}
        </Button>
      </div>

      {affordable ? null : (
        <p className="t-caption text-warning">
          Your balance does not cover this. Recharge from Billing &amp; credits first — nothing has
          been deducted.
        </p>
      )}
    </form>
  );
}
