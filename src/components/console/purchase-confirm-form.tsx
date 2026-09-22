"use client";

import { useActionState } from "react";
import Link from "next/link";
import { purchaseLead, type PurchaseFormState } from "@/app/actions/lead-purchase";
import { Button } from "@/components/ui/button";

/**
 * The confirm button for S-09.
 *
 * A form posting to a server action, so it works before hydration — a purchase
 * button that silently does nothing until JavaScript loads is worse here than
 * anywhere else, because the Seller will press it again.
 *
 * `pending` disables it during the request. That is a courtesy, not the
 * duplicate-purchase control: the idempotency key in the hidden field is, and it
 * holds even when this component never runs.
 */
export function PurchaseConfirmForm({
  leadId,
  idempotencyKey,
  scope = "seller",
  cancelHref,
}: {
  leadId: string;
  idempotencyKey: string;
  /** Which marketplace this buys from. The two are separate pools. */
  scope?: "seller" | "builder";
  cancelHref?: string;
}) {
  const [state, action, pending] = useActionState<PurchaseFormState, FormData>(purchaseLead, {});

  return (
    <form action={action} className="flex flex-col gap-[12px]">
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="scope" value={scope} />

      {state.error ? (
        <p
          role="alert"
          className="rounded-[8px] bg-chip-danger-bg px-[14px] py-[10px] text-[14px] text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-[16px]">
        <Button type="submit" disabled={pending}>
          {pending ? "Deducting credits…" : "Confirm and buy"}
        </Button>
        <Link
          href={cancelHref ?? `/seller/leads/${leadId}`}
          className="text-[15px] font-semibold text-brand underline underline-offset-2"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
