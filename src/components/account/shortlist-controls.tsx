"use client";

import { useActionState } from "react";
import {
  addShortlistAction,
  removeShortlistAction,
  type ShortlistActionState,
} from "@/app/actions/shortlist";

const idle: ShortlistActionState = { status: "idle" };

export function ShortlistAddButton({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState(addShortlistAction, idle);
  return (
    <form action={action} className="flex flex-col items-end gap-[6px]">
      <input type="hidden" name="listingId" value={listingId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-[6px] border-[1.5px] border-line bg-white px-[16px] py-[10px] text-[15px] font-semibold text-brand hover:border-brand disabled:text-muted"
      >
        <span aria-hidden="true">♡ </span>
        {pending ? "Saving…" : "Save"}
      </button>
      {state.message ? (
        <p role="status" className="t-caption max-w-[240px] text-right text-muted">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function ShortlistRemoveButton({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState(removeShortlistAction, idle);
  return (
    <form action={action} className="flex flex-col items-end gap-[6px]">
      <input type="hidden" name="listingId" value={listingId} />
      <button
        type="submit"
        disabled={pending}
        className="text-[15px] font-semibold text-brand underline underline-offset-2 disabled:text-muted"
      >
        {pending ? "Removing…" : "Remove"}
      </button>
      {state.message ? <p role="status" className="t-caption text-muted">{state.message}</p> : null}
    </form>
  );
}
