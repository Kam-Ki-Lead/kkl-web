"use client";

import { useActionState } from "react";
import Link from "next/link";
import { publishListing, type PublishFormState } from "@/app/actions/builder-listings";
import { Button } from "@/components/ui/button";

/**
 * B-13 publish.
 *
 * The button is disabled when the listing or the account is not ready, and the
 * reasons are already on screen above it — a Builder should know why before
 * pressing, not after. The action re-checks anyway: a disabled button is a
 * courtesy, not a control, and the service refuses regardless.
 */
export function PublishForm({
  listingId,
  canPublish,
  previousHref,
  alreadyPublished,
}: {
  listingId: string;
  canPublish: boolean;
  previousHref: string | null;
  alreadyPublished: boolean;
}) {
  const [state, action, pending] = useActionState<PublishFormState, FormData>(publishListing, {});

  return (
    <form action={action} className="flex flex-col gap-[12px] border-t border-line pt-[16px]">
      <input type="hidden" name="listingId" value={listingId} />

      {state.error ? (
        <p
          role="alert"
          className="rounded-[8px] bg-chip-danger-bg px-[14px] py-[10px] text-[14px] text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-[10px]">
        <Button type="submit" disabled={pending || !canPublish}>
          {pending
            ? "Publishing…"
            : alreadyPublished
              ? "Republish with changes"
              : "Publish listing"}
        </Button>
        {previousHref ? (
          <Link href={previousHref} className="t-caption text-brand underline underline-offset-2">
            ← Previous section
          </Link>
        ) : null}
      </div>
    </form>
  );
}
