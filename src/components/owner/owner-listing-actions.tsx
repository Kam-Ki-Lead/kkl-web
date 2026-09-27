"use client";

import { useActionState } from "react";
import {
  replyOnOwnerListing,
  withdrawOwnerListing,
  type OwnerListingActionState,
} from "@/app/actions/owner-listings";
import { Button } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";

/**
 * CR02 — what an owner can do to a listing that is already with the team:
 * write to them, or take it back.
 *
 * Withdrawing asks for a reason. The team sees it, and the listing's history
 * keeps it — a listing that left the queue with no explanation is a gap for
 * whoever picks it up next.
 */
export function OwnerReplyForm({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState<OwnerListingActionState, FormData>(
    replyOnOwnerListing,
    {},
  );
  return (
    <form action={action} className="flex flex-col gap-[12px]">
      <input type="hidden" name="listingId" value={listingId} />
      {state.done ? (
        <p role="status" className="t-caption font-semibold text-success">
          {state.done}
        </p>
      ) : null}
      {state.error ? (
        <p role="alert" className="t-caption font-semibold text-danger">
          {state.error}
        </p>
      ) : null}
      <Field id="owner-reply-body" label="Write to the review team">
        <TextArea id="owner-reply-body" name="body" rows={4} />
      </Field>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send message"}
        </Button>
      </div>
    </form>
  );
}

export function OwnerWithdrawForm({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState<OwnerListingActionState, FormData>(
    withdrawOwnerListing,
    {},
  );
  return (
    <form action={action} className="flex flex-col gap-[12px]">
      <input type="hidden" name="listingId" value={listingId} />
      {state.done ? (
        <p role="status" className="t-caption font-semibold text-success">
          {state.done}
        </p>
      ) : null}
      {state.error ? (
        <p role="alert" className="t-caption font-semibold text-danger">
          {state.error}
        </p>
      ) : null}
      <Field
        id="withdraw-reason"
        label="Why are you withdrawing it?"
        helper="The review team sees this, and it stays in the listing's history."
      >
        <TextArea id="withdraw-reason" name="reason" rows={3} />
      </Field>
      <div>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Withdrawing…" : "Withdraw from review"}
        </Button>
      </div>
    </form>
  );
}
