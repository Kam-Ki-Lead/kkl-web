import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StateMessage } from "@/components/ui/states";

/**
 * The Admin console's list screen (A-03, A-12, A-16, A-21, A-27, A-30).
 *
 * The approved design uses one table for six screens, and so does this: the
 * same filter chips, the same search field, the same column header row, and
 * the same collapse to two columns on a phone. Six near-identical page files
 * would give six places for that to drift.
 *
 * Filters and the query live in the URL, not in component state. A filtered
 * queue can then be shared with a colleague, Back works, and — the reason that
 * matters most for an internal tool — the whole thing works before any
 * JavaScript arrives, because a filter is a link and the search is a GET form.
 */

export type AdminColumn = {
  readonly header: string;
  /** A CSS grid track. The first two survive on a phone; see `narrowTracks`. */
  readonly width: string;
};

export type AdminCell = ReactNode;

export type AdminRow = {
  readonly key: string;
  readonly href: string | null;
  readonly cells: readonly AdminCell[];
};

export function AdminTable({
  columns,
  rows,
  filters,
  activeFilter,
  basePath,
  query,
  countLabel,
  emptyTitle,
  emptyBody,
  footnote,
}: {
  columns: readonly AdminColumn[];
  rows: readonly AdminRow[];
  filters: readonly { label: string; value: string }[];
  activeFilter: string;
  basePath: string;
  query: string;
  countLabel: string;
  emptyTitle: string;
  emptyBody: string;
  footnote: string;
}) {
  const tracks = columns.map((c) => c.width).join(" ");
  // Below 1060px only the first two columns survive. Squeezing five into a
  // phone width makes every one of them unreadable; the approved design drops
  // the rest and keeps the row tappable.
  const narrowTracks = columns.slice(0, 2).map((c) => c.width).join(" ");

  const href = (filter: string) => {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("filter", filter);
    if (query) params.set("q", query);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="flex flex-col gap-[10px]">
      <div className="flex flex-wrap items-center justify-between gap-[12px]">
        <div className="flex flex-wrap gap-[8px]">
          {filters.map((filter) => {
            const active = filter.value === activeFilter;
            return (
              <Link
                key={filter.value}
                href={href(filter.value)}
                aria-current={active ? "true" : undefined}
                className={`min-h-[40px] rounded-full border-[1.5px] px-[14px] py-[9px] text-[14px] font-semibold transition-[background-color,border-color,color] duration-150 ${
                  active
                    ? "border-brand bg-brand text-white"
                    : "border-line bg-white text-body hover:border-[#C6CCE0]"
                }`}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>

        {/* flex-wrap and min-w-0: at 320 CSS px the label, the field and the
            button do not fit on one line, and without wrapping the form
            pushed the page 43px wide — WCAG 1.4.10 Reflow. */}
        <form
          method="GET"
          action={basePath}
          className="flex min-w-0 flex-wrap items-center gap-[10px]"
        >
          {activeFilter !== "all" ? (
            <input type="hidden" name="filter" value={activeFilter} />
          ) : null}
          <label htmlFor="admin-search" className="t-caption text-muted">
            Search
          </label>
          <input
            id="admin-search"
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Name, reference or number"
            className="min-h-[44px] min-w-[220px] rounded-[8px] border-[1.5px] border-line bg-white px-[13px] text-[15px] text-ink max-[560px]:min-w-0 max-[560px]:flex-1"
          />
          {/* Server-rendered, so searching works without scripting. */}
          <button
            type="submit"
            className="min-h-[44px] rounded-[8px] border-[1.5px] border-line bg-white px-[14px] text-[14px] font-semibold text-ink"
          >
            Search
          </button>
        </form>
      </div>

      <p className="t-caption text-muted">{countLabel}</p>

      {rows.length === 0 ? (
        <StateMessage title={emptyTitle}>{emptyBody}</StateMessage>
      ) : (
        <Card className="overflow-hidden p-0">
          <div
            role="row"
            className="t-mono grid gap-[10px] bg-[#F0F2F9] px-[16px] py-[11px] text-[11px] tracking-[0.06em] text-muted max-[1060px]:hidden"
            style={{ gridTemplateColumns: tracks }}
          >
            {columns.map((column) => (
              <span key={column.header}>{column.header}</span>
            ))}
          </div>

          {rows.map((row) => {
            const content = (
              <>
                {row.cells.map((cell, i) => (
                  <span key={i} className={`min-w-0 ${i > 1 ? "max-[1060px]:hidden" : ""}`}>
                    {cell}
                  </span>
                ))}
              </>
            );
            const className =
              "grid w-full items-center gap-[10px] border-t border-[#EDEFF6] px-[16px] py-[14px] text-left text-[15px] text-body";
            const style = { gridTemplateColumns: tracks } as const;
            const narrowStyle = { ["--narrow" as string]: narrowTracks };

            return row.href ? (
              <Link
                key={row.key}
                href={row.href}
                className={`${className} transition-[background-color] duration-150 hover:bg-[#F6F8FD] max-[1060px]:!grid-cols-[var(--narrow)]`}
                style={{ ...style, ...narrowStyle }}
              >
                {content}
              </Link>
            ) : (
              <div
                key={row.key}
                className={`${className} max-[1060px]:!grid-cols-[var(--narrow)]`}
                style={{ ...style, ...narrowStyle }}
              >
                {content}
              </div>
            );
          })}
        </Card>
      )}

      <p className="t-caption text-muted">{footnote}</p>
    </div>
  );
}

/** A monospace identifier cell — references, account IDs, timestamps. */
export function Mono({ children }: { children: ReactNode }) {
  return <span className="t-mono text-[13px] text-ink">{children}</span>;
}

/** A name with a quieter second line under it. */
export function Primary({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <span className="block min-w-0">
      <span className="block truncate text-[15px] font-semibold text-ink">{children}</span>
      {/* The approved second line is 14px, a step up from the 13px caption. */}
      {sub ? <span className="block truncate text-[14px] text-muted">{sub}</span> : null}
    </span>
  );
}
