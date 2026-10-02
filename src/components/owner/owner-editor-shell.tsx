import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import {
  SaveDraftButton,
  UnsavedBadge,
  UnsavedChangesProvider,
} from "@/components/builder/unsaved-changes";
import type { OwnerListingStepId, OwnerListingStepState } from "@/lib/domain/types";

/**
 * CR02 — the frame around the owner's posting steps.
 *
 * Six numbered steps, each reachable from every other, with the completed ones
 * marked. Not a wizard that locks step 4 until step 3 is perfect: an owner who
 * knows the price but not the carpet area should be able to put the price in
 * and come back, and the submit check is what makes sure nothing is missing at
 * the end.
 *
 * The unsaved-changes pair — the header mark and the save control that settles
 * to "Draft saved" — is the one the Builder editor already uses, imported
 * rather than rebuilt. It is generic behaviour that happens to live in that
 * folder; duplicating it would give CR02 a second, subtly different version of
 * a thing the client has already reviewed once.
 */
export function OwnerEditorShell({
  listingId,
  reference,
  listingTitle,
  steps,
  current,
  formId,
  children,
}: {
  listingId: string;
  reference: string;
  listingTitle: string;
  steps: readonly OwnerListingStepState[];
  current: OwnerListingStepId;
  /** The editable form on this step, or null on the preview, which has none. */
  formId: string | null;
  children: ReactNode;
}) {
  const index = steps.findIndex((s) => s.id === current);
  const label = steps[index]?.label ?? "";

  const body = (
    <div className="mx-auto max-w-[900px] px-[32px] py-[32px] max-[1060px]:px-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-[14px]">
        <div className="min-w-0">
          <p className="t-eyebrow text-muted">
            <Link href={`/owner/listings/${listingId}`} className="hover:text-brand">
              {reference}
            </Link>{" "}
            · step {index + 1} of {steps.length}
          </p>
          <h1 className="t-flow-title mt-[4px] text-ink">
            {label}
            {listingTitle ? (
              <span className="t-caption ml-[8px] align-middle text-muted">{listingTitle}</span>
            ) : null}
          </h1>
        </div>
        {formId === null ? null : (
          <div className="flex items-center gap-[12px]">
            <UnsavedBadge />
            <SaveDraftButton />
          </div>
        )}
      </div>

      <nav aria-label="Posting steps" className="mt-[18px]">
        <ol className="flex flex-wrap gap-[8px]">
          {steps.map((s, i) => {
            const active = s.id === current;
            return (
              <li key={s.id}>
                <Link
                  href={`/owner/listings/${listingId}/${s.id}`}
                  aria-current={active ? "step" : undefined}
                  className={`flex min-h-[44px] items-center gap-[8px] rounded-[8px] border px-[13px] py-[8px] text-[14px] font-semibold ${
                    active
                      ? "border-brand bg-chip-neutral-bg text-brand"
                      : "border-line bg-white text-body hover:border-[#B9C3EC]"
                  }`}
                >
                  <span aria-hidden className="text-muted">
                    {i + 1}
                  </span>
                  {s.label}
                  {s.complete ? (
                    <span className="text-success" aria-label="complete">
                      ✓
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>

      <Card className="mt-[18px] p-[22px]">{children}</Card>
    </div>
  );

  // The guard wraps the whole frame, so every link out of it — including the
  // step rail above — goes through the exit dialog while something is unsaved.
  return formId === null ? body : (
    <UnsavedChangesProvider formId={formId}>{body}</UnsavedChangesProvider>
  );
}
