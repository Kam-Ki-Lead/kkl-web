import type { ReactNode } from "react";

/**
 * Drop base utilities the caller is replacing.
 *
 * Tailwind emits `bg-white` and `bg-[#FFF7E8]` as two single-class rules of
 * equal specificity, so which one wins is decided by their order in the
 * generated stylesheet — not by the order they appear in a `class` attribute.
 * A caller writing `<Card className="bg-[#FFF7E8]">` therefore had no reliable
 * way to override the base, and in practice lost: **every warning, success and
 * danger panel in this application rendered white with a grey hairline**
 * instead of its approved colour.
 *
 * That shipped, and a route sweep could never have seen it — the page loads,
 * nothing errors, and the panel is simply the wrong colour. It was found by
 * measuring a computed style against the value the baseline declares, which is
 * why `scripts/verify-visual-baseline.mjs` now exists.
 *
 * The fix is to not emit the conflicting base at all when the caller supplies a
 * replacement. Deliberately narrow: it handles the two properties Card sets
 * that callers actually override, by prefix, rather than pulling in a general
 * class-merge dependency for two cases.
 */
function withoutOverridden(base: readonly string[], className: string): string {
  const overrides = className.split(/\s+/).filter(Boolean);
  const overridesPrefix = (prefix: string) =>
    overrides.some((c) => c.startsWith(prefix) && c !== prefix.slice(0, -1));

  return base
    .filter((utility) => {
      if (utility.startsWith("bg-") && overridesPrefix("bg-")) return false;
      // `border-line` is a colour; `border` on its own is the width and stays.
      if (utility.startsWith("border-") && overridesPrefix("border-")) return false;
      return true;
    })
    .join(" ");
}

const CARD_BASE = ["rounded-[12px]", "border", "border-line", "bg-white"] as const;
const PANEL_BASE = ["rounded-[10px]", "border", "border-line", "bg-tint", "p-[16px]"] as const;

/** The surface every screen is built from — white, 1px line, 12px radius. */
export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "aside";
}) {
  return (
    <Tag className={`${withoutOverridden(CARD_BASE, className)} ${className}`}>{children}</Tag>
  );
}

/** An inset panel or fact block — the Tint surface. */
export function InsetPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${withoutOverridden(PANEL_BASE, className)} ${className}`}>{children}</div>
  );
}

/**
 * Two steps, because the approved package uses two.
 *
 * C-02 declares "Card and section title — Archivo 700 · 17px", and an earlier
 * pass moved every section heading to that step on the strength of it. The
 * rendered baseline disagrees in both directions: the **public portal's**
 * section headings ("Featured properties", "Featured projects", "Browse by
 * locality") are **26px/700**, and the **consoles'** panel headings ("Needs
 * attention", "Recent enquiries on your listings") are **18px/700**. Nothing
 * in the four console documents renders at 17px.
 *
 * So `level="page"` restores what P-01 actually draws, which the earlier fix
 * flattened. The 17px default is left alone deliberately: 17-against-18 is an
 * inconsistency inside the approved package — the library says one thing and
 * the consoles draw another — and resolving it across 152 call sites on one
 * screen's evidence would be guessing. It is recorded for the designer as
 * E-P4 in `docs/phase-2/acceptance.md`.
 */
export function SectionHeader({
  title,
  subtitle,
  action,
  level = "card",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /**
   * Which step this heading is, measured from the approved screens:
   * `page` 26/700 (public section), `panel` 18/700 (console panel heading and
   * portal listing-card title), `card` 17/700 (compact and stat cards).
   */
  level?: "page" | "panel" | "card";
}) {
  return (
    <div className="mb-[14px] flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2
          className={`${
            level === "page" ? "t-section-title" : level === "panel" ? "t-panel-title" : "t-card-title"
          } text-ink`}
        >
          {title}
        </h2>
        {subtitle ? <p className="mt-[3px] text-[14px] text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
