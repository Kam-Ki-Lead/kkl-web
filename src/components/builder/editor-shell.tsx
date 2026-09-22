import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import {
  SaveDraftButton,
  UnsavedBadge,
  UnsavedChangesProvider,
} from "@/components/builder/unsaved-changes";
import type { ListingSectionId, ListingSectionState } from "@/lib/domain/types";

/**
 * The listing editor's shell (B-08 to B-13, and B-15 on an existing listing).
 *
 * Six numbered sections, each linking to the others, with the completed ones
 * marked. Every section is reachable from every other: the approved design is
 * an editor with six sections, not a wizard that locks you out of section 4
 * until section 3 is perfect, and a Builder filling in what they know first is
 * the normal case.
 *
 * The header carries the approved unsaved-changes pair — the "Unsaved changes"
 * mark and the save control whose label settles to "Draft saved" — and the
 * whole shell sits inside the guard so that every link out of it, including the
 * section rail and the console rail above, goes through the exit dialog while
 * there is something unsaved. See `unsaved-changes.tsx`.
 */
export function EditorShell({
  listingId,
  listingTitle,
  sections,
  current,
  editing,
  formId,
  children,
}: {
  listingId: string;
  listingTitle: string;
  sections: readonly ListingSectionState[];
  current: ListingSectionId;
  /** True for B-15 — editing a listing that already exists. */
  editing: boolean;
  /**
   * The editable form on this section, if there is one. The preview section
   * has no fields, so it has nothing to save and nothing to lose.
   */
  formId: string | null;
  children: ReactNode;
}) {
  const index = sections.findIndex((s) => s.id === current);
  const label = sections[index]?.label ?? "";

  const shell = (
    <div className="max-w-[820px]">
      <div className="flex flex-wrap items-start justify-between gap-[14px]">
        <div className="min-w-0">
          <p className="t-eyebrow text-muted">
            Listing editor · section {index + 1} of {sections.length}
          </p>
          <h2 className="t-title mt-[4px] text-ink">
            {label}
            {editing && listingTitle ? (
              <span className="t-body text-muted"> · editing {listingTitle}</span>
            ) : null}
          </h2>
        </div>
        {formId ? (
          <div className="flex flex-wrap items-center gap-[10px]">
            <UnsavedBadge />
            <SaveDraftButton />
          </div>
        ) : null}
      </div>

      <nav aria-label="Listing sections" className="mt-[16px]">
        <ol className="flex flex-wrap gap-[8px]">
          {sections.map((section, i) => {
            const active = section.id === current;
            return (
              <li key={section.id}>
                <Link
                  href={`/builder/properties/${listingId}/${section.id}`}
                  aria-current={active ? "step" : undefined}
                  className={`flex min-h-[40px] items-center gap-[8px] rounded-[8px] border-[1.5px] px-[13px] text-[14px] font-semibold transition-[background-color,border-color,color] duration-150 ${
                    active
                      ? "border-brand bg-chip-neutral-bg text-brand"
                      : "border-line bg-white text-body hover:border-[#C6CCE0]"
                  }`}
                >
                  <span className="t-mono text-[12px] text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {section.label}
                  {section.complete ? (
                    <span aria-label="complete" className="text-success">
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

      <div className="mt-[14px] flex justify-end">
        <Link
          href="/builder/properties"
          className="t-caption text-brand underline underline-offset-2"
        >
          Close editor
        </Link>
      </div>
    </div>
  );

  // The preview section has no form, so there is nothing to guard and no
  // dialog to put in anybody's way.
  if (!formId) return shell;

  return <UnsavedChangesProvider formId={formId}>{shell}</UnsavedChangesProvider>;
}
