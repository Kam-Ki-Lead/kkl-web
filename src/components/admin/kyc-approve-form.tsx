"use client";

import { useActionState } from "react";
import { decideApplication, type AdminFormState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

/**
 * The approve control on A-06.
 *
 * Its own form rather than a link, because approving takes no free-text reason
 * — the checklist is the reason — so there is nothing to collect on the way.
 * The refusal when the checklist is short comes back from the store and renders
 * here, which is also why this is not simply a disabled button: a disabled
 * button says "no" without saying why, and the store's sentence explains the
 * gate.
 */
export function KycApproveForm({ applicationId }: { applicationId: string }) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(
    decideApplication,
    {},
  );

  return (
    <div className="flex flex-col gap-[8px]">
      <form action={action}>
        <input type="hidden" name="applicationId" value={applicationId} />
        <input type="hidden" name="decision" value="approved" />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Recording…" : "Approve verification"}
        </Button>
      </form>
      {state.error ? (
        <p
          role="alert"
          className="max-w-[420px] rounded-[8px] bg-chip-danger-bg px-[13px] py-[10px] text-[14px] font-semibold text-danger"
        >
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
