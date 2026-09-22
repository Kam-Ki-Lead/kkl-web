"use client";

import { useActionState } from "react";
import { startSubscription, type SubscribeFormState } from "@/app/actions/builder-subscription";
import { Button } from "@/components/ui/button";
import type { BuilderSubscriptionState } from "@/lib/domain/types";

/**
 * B-03's action.
 *
 * The label follows the state rather than always saying "Subscribe": starting,
 * renewing and reactivating are different things to a Builder even though they
 * reach the same service call.
 *
 * No amount is submitted. There is no price to submit, and a frontend that
 * could name one is a frontend that could change it.
 */
export function SubscribeForm({
  idempotencyKey,
  state,
  blocked,
}: {
  idempotencyKey: string;
  state: BuilderSubscriptionState;
  blocked: string | null;
}) {
  const [result, action, pending] = useActionState<SubscribeFormState, FormData>(
    startSubscription,
    {},
  );

  const label =
    state === "none"
      ? "Activate a subscription"
      : state === "expired" || state === "grace"
        ? "Reactivate"
        : "Renew now";

  return (
    <form action={action} className="flex flex-col gap-[12px]">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      {result.error ? (
        <p
          role="alert"
          className="rounded-[8px] bg-chip-danger-bg px-[14px] py-[10px] text-[14px] text-danger"
        >
          {result.error}
        </p>
      ) : null}

      {blocked ? (
        <p className="rounded-[8px] bg-chip-warning-bg px-[14px] py-[10px] text-[14px] text-warning">
          {blocked}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={pending || blocked !== null}>
          {pending ? "Contacting payment…" : label}
        </Button>
        <p className="t-caption mt-[8px] text-muted">
          Payment is handled by a gateway, server-side. No card or UPI detail is entered on this
          screen or held by this application, and no amount is charged.
        </p>
      </div>
    </form>
  );
}
