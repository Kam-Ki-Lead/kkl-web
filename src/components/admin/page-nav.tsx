import Link from "next/link";
import { hasNextPage, isPastEnd, pageRangeLabel, type PageWindow } from "@/lib/services/backend/staff-views";

/**
 * Previous and next for a published `offset`/`limit`/`total` page.
 * Next is offered only when this page does not reach `total`.
 */
export function PageNav({
  pathname,
  page,
  noun,
  extra,
}: {
  pathname: string;
  page: PageWindow;
  noun: string;
  extra?: Readonly<Record<string, string | undefined>>;
}) {
  const href = (offset: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(extra ?? {})) {
      if (value) params.set(key, value);
    }
    if (offset > 0) params.set("offset", String(offset));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };
  const previous = page.offset > 0 ? Math.max(0, page.offset - page.limit) : null;
  const next = hasNextPage(page) ? page.offset + page.limit : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-[12px]">
      <p className="t-body text-body">{pageRangeLabel(page, noun)}</p>
      <div className="flex flex-wrap gap-[8px]">
        {previous !== null ? (
          <Link href={href(previous)} className="t-caption text-brand underline underline-offset-2">
            Previous
          </Link>
        ) : null}
        {next !== null ? (
          <Link href={href(next)} className="t-caption text-brand underline underline-offset-2">
            Next
          </Link>
        ) : null}
        {isPastEnd(page) ? (
          <Link href={href(0)} className="t-caption text-brand underline underline-offset-2">
            First page
          </Link>
        ) : null}
      </div>
    </div>
  );
}
