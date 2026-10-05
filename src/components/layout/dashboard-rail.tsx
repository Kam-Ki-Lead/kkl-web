"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/brand/wordmark";

/**
 * C-03 dashboard rail — the deep-blue navigation for the Seller, Builder and
 * Admin consoles, as against the light public header buyers see.
 *
 * Below 1060px the rail is a drawer behind a hamburger, which is the approved
 * mobile treatment: a white bar carrying the screen title and the avatar, with
 * navigation one tap away rather than stacked above every screen.
 *
 * **This is presentation only.** Which items appear says nothing about what the
 * account may do. kkl-backend authorises every request on its own, and an item
 * rendered here that the account cannot use must still be refused there. Hiding
 * a link is not a permission check.
 */

export type RailItem = {
  readonly href: string;
  readonly label: string;
  /** A count shown beside the label, e.g. new leads. Null hides the badge. */
  readonly badge?: string | null;
  /**
   * How this item decides it is active.
   *
   * A descriptor rather than a predicate function: the rail is a Client
   * Component and functions cannot cross that boundary, so passing one gives a
   * 500 on every screen in the console rather than a type error.
   *
   * "prefix" (the default) matches the item's own path and everything under it.
   * "exact" is for an index route, whose href is a prefix of every sibling's.
   */
  readonly match?: "prefix" | "exact";
  /**
   * A child path that belongs to a sibling item and must not activate this
   * one. The Admin rail's "Leads" is /admin/leads and "Lead intake" is
   * /admin/leads/intake: plain prefix matching would light both on an intake
   * screen, and "exact" was leaving "Leads" dark on a lead detail screen —
   * which the approved A-13 shows lit.
   */
  readonly excludePrefix?: string;
  /**
   * The rail heading this item sits under (A-02's grouped navigation).
   *
   * The Admin rail has nine groups because it has twenty destinations; the
   * Seller's and Builder's have none, and items without one render flat
   * exactly as before. Consecutive items sharing a group print the heading
   * once.
   */
  readonly group?: string;
};

export type RailFooter = {
  readonly label: string;
  readonly value: string;
  readonly actionHref: string;
  readonly actionLabel: string;
  /**
   * The approved footers draw the value at 800-weight Archivo in a per-console
   * size: the Seller's credit balance is 24px, the Builder's subscription
   * state is 17px. Each console's nav module declares its step here.
   */
  readonly valueClassName: string;
};

function isActive(item: RailItem, pathname: string): boolean {
  if (item.match === "exact") return pathname === item.href;
  if (item.excludePrefix && pathname.startsWith(item.excludePrefix)) return false;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * The Admin rail is a different colour from the other two in the approved
 * design, not a tighter version of them.
 *
 * A-02 declares `background:#12182B` — ink — where the Seller and Builder rails
 * declare `#0F2478`, and its muted text is `#9AA3BE` where theirs is `#B9C3EC`
 * for items and `#8A9AD8` for group labels. `approved-baseline.md` records the
 * same thing in its colour table: "Ink #12182B — headings, **admin rail**,
 * primary text". The implementation was rendering all three rails in
 * brand-deep, which made the operations console look like a seller's.
 *
 * Widths are per console too: Seller 236+28, Builder 238+28, Admin 232+24.
 */
const RAIL_TONES = {
  console: {
    surface: "bg-brand-deep",
    width: "w-[264px]",
    muted: "text-rail-seller-label",
    item: "text-rail-seller-item",
  },
  admin: {
    surface: "bg-ink",
    width: "w-[256px]",
    muted: "text-rail-admin-muted",
    item: "text-rail-admin-muted",
  },
} as const;

export type RailTone = keyof typeof RAIL_TONES;

export function DashboardRail({
  items,
  footer,
  ariaLabel,
  eyebrow,
  dense = false,
  tone = "console",
}: {
  items: readonly RailItem[];
  footer?: RailFooter | null;
  ariaLabel: string;
  /** Names which console this is, where more than one exists (B-06). */
  eyebrow?: string;
  /** The Admin rail's tighter step — see RailLink. */
  dense?: boolean;
  /** Which rail this is. The Admin rail is ink, not brand-deep. */
  tone?: RailTone;
}) {
  const pathname = usePathname();
  const t = RAIL_TONES[tone];

  return (
    <nav
      aria-label={ariaLabel}
      className={`flex ${t.width} flex-none flex-col ${t.surface} max-[1060px]:hidden`}
    >
      <div className="px-[18px] py-[20px]">
        <Link href="/" aria-label="Kaam Ki Lead — home" className="inline-block">
          <Wordmark size="rail" onDark />
        </Link>
      </div>

      {eyebrow ? (
        <p className={`t-eyebrow px-[18px] pb-[8px] ${t.muted}`}>{eyebrow}</p>
      ) : null}

      <ul className="flex flex-col gap-[2px] overflow-y-auto px-[14px] pb-[10px]">
        {items.map((item, index) => (
          <li key={item.href}>
            {item.group && item.group !== items[index - 1]?.group ? (
              <p className={`t-eyebrow px-[17px] pb-[6px] pt-[14px] ${t.muted}`}>
                {item.group}
              </p>
            ) : null}
            <RailLink item={item} active={isActive(item, pathname)} dense={dense} tone={tone} />
          </li>
        ))}
      </ul>

      {footer ? (
        <div className="mt-auto p-[14px]">
          <RailFooterCard footer={footer} />
        </div>
      ) : null}
    </nav>
  );
}

/**
 * The Admin rail is denser than the Seller's and Builder's, in the design.
 *
 * Its twenty destinations do not fit at the 16px step the other two use, so
 * the approved A-02 sets 14px with tighter padding. That is a per-console
 * metric rather than a token, so it is a prop rather than a second component.
 */
function RailLink({
  item,
  active,
  dense,
  tone,
}: {
  item: RailItem;
  active: boolean;
  dense: boolean;
  tone: RailTone;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center justify-between gap-[10px] rounded-[8px] transition-[background-color,color] duration-150 ${
        dense ? "min-h-[40px] px-[13px] text-[14px]" : "min-h-[46px] px-[17px] text-[15px]"
      } ${
        active
          ? "bg-brand font-bold text-white"
          : `font-medium ${RAIL_TONES[tone].item} hover:bg-white/10 hover:text-white`
      }`}
    >
      <span>{item.label}</span>
      {item.badge ? (
        <span className="flex-none rounded-full bg-saffron px-[9px] py-[2px] text-[12px] font-bold leading-[16px] text-ink">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

function RailFooterCard({ footer }: { footer: RailFooter }) {
  return (
    <div className="rounded-[10px] bg-white/[0.07] p-[16px]">
      {/* `font-size:13px; color:#B9C3EC` in the approved consoles — the rail
          ITEM colour, not the group-label colour. Swapping the hardcoded value
          for the muted token in an earlier pass dimmed it on 16 screens. */}
      <p className={`text-[13px] ${RAIL_TONES.console.item}`}>{footer.label}</p>
      <p
        className={`mt-[2px] font-[family-name:var(--font-heading)] font-extrabold leading-[1.3] text-white ${footer.valueClassName}`}
      >
        {footer.value}
      </p>
      <Link
        href={footer.actionHref}
        /* Saffron on a surface is used sparingly, per C-01. The approved rail is
           one of the two places it appears filled — the other is the homepage
           hero — and it carries a short label in ink, not body text. */
        className="mt-[12px] flex min-h-[44px] items-center justify-center rounded-[8px] bg-saffron px-[14px] text-[14px] font-bold text-ink transition-[background-color] duration-150 hover:bg-[#EF6729]"
      >
        {footer.actionLabel}
      </Link>
    </div>
  );
}

/**
 * The mobile drawer and the bar that opens it.
 *
 * Rendered by the console header so the title, subtitle and avatar sit on one
 * line with the toggle, as the approved mobile layout shows.
 */
export function RailDrawer({
  items,
  footer,
  ariaLabel,
  eyebrow,
  dense = false,
  tone = "console",
}: {
  items: readonly RailItem[];
  footer?: RailFooter | null;
  ariaLabel: string;
  eyebrow?: string;
  dense?: boolean;
  tone?: RailTone;
}) {
  const pathname = usePathname();
  // The drawer's open state is stored as the path it was opened on, so a route
  // change closes it by making this comparison false. Deriving it beats an
  // effect that resets state after the new screen has already rendered behind
  // an open drawer.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenFor(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) panel.current?.focus();
  }, [open]);

  return (
    <div className="min-[1061px]:hidden">
      <button
        type="button"
        onClick={() => setOpenFor(open ? null : pathname)}
        aria-expanded={open}
        aria-controls="console-drawer"
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex h-[44px] w-[44px] flex-none items-center justify-center rounded-[8px] border border-line bg-white text-[18px] text-ink"
      >
        <span aria-hidden="true">{open ? "×" : "☰"}</span>
      </button>

      {open ? (
        <div
          id="console-drawer"
          ref={panel}
          tabIndex={-1}
          className={`absolute left-0 right-0 top-full z-20 border-t border-line ${RAIL_TONES[tone].surface} px-[14px] py-[14px]`}
        >
          <nav aria-label={ariaLabel}>
            {eyebrow ? (
              <p className={`t-eyebrow pb-[8px] ${RAIL_TONES[tone].muted}`}>{eyebrow}</p>
            ) : null}
            <ul className="flex flex-col gap-[2px]">
              {items.map((item, index) => (
                <li key={item.href}>
                  {item.group && item.group !== items[index - 1]?.group ? (
                    <p className={`t-eyebrow px-[17px] pb-[6px] pt-[14px] ${RAIL_TONES[tone].muted}`}>
                      {item.group}
                    </p>
                  ) : null}
                  <RailLink item={item} active={isActive(item, pathname)} dense={dense} tone={tone} />
                </li>
              ))}
            </ul>
          </nav>
          {footer ? (
            <div className="mt-[14px]">
              <RailFooterCard footer={footer} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
