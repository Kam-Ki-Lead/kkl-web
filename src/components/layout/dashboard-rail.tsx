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
};

function isActive(item: RailItem, pathname: string): boolean {
  if (item.match === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function DashboardRail({
  items,
  footer,
  ariaLabel,
  eyebrow,
}: {
  items: readonly RailItem[];
  footer?: RailFooter | null;
  ariaLabel: string;
  /** Names which console this is, where more than one exists (B-06). */
  eyebrow?: string;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={ariaLabel}
      className="flex w-[268px] flex-none flex-col bg-brand-deep max-[1060px]:hidden"
    >
      <div className="px-[18px] py-[20px]">
        <Link href="/" aria-label="Kam Ki Lead — home" className="inline-block">
          <Wordmark onDark />
        </Link>
      </div>

      {eyebrow ? (
        <p className="t-eyebrow px-[18px] pb-[8px] text-rail-seller-label">{eyebrow}</p>
      ) : null}

      <ul className="flex flex-col gap-[2px] overflow-y-auto px-[14px] pb-[10px]">
        {items.map((item, index) => (
          <li key={item.href}>
            {item.group && item.group !== items[index - 1]?.group ? (
              <p className="t-eyebrow px-[17px] pb-[6px] pt-[14px] text-rail-seller-label">
                {item.group}
              </p>
            ) : null}
            <RailLink item={item} active={isActive(item, pathname)} />
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

function RailLink({ item, active }: { item: RailItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-[46px] items-center justify-between gap-[10px] rounded-[8px] px-[17px] text-[16px] transition-[background-color,color] duration-150 ${
        active
          ? "bg-brand font-bold text-white"
          : "font-medium text-rail-seller-item hover:bg-white/10 hover:text-white"
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
      <p className="text-[13px] text-rail-seller-label">{footer.label}</p>
      <p className="t-card-title mt-[2px] text-white">{footer.value}</p>
      <Link
        href={footer.actionHref}
        /* Saffron on a surface is used sparingly, per C-01. The approved rail is
           one of the two places it appears filled — the other is the homepage
           hero — and it carries a short label in ink, not body text. */
        className="mt-[12px] flex min-h-[44px] items-center justify-center rounded-[8px] bg-saffron px-[14px] text-[15px] font-bold text-ink transition-[background-color] duration-150 hover:bg-[#DE9309]"
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
}: {
  items: readonly RailItem[];
  footer?: RailFooter | null;
  ariaLabel: string;
  eyebrow?: string;
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
          className="absolute left-0 right-0 top-full z-20 border-t border-line bg-brand-deep px-[14px] py-[14px]"
        >
          <nav aria-label={ariaLabel}>
            {eyebrow ? (
              <p className="t-eyebrow pb-[8px] text-rail-seller-label">{eyebrow}</p>
            ) : null}
            <ul className="flex flex-col gap-[2px]">
              {items.map((item, index) => (
                <li key={item.href}>
                  {item.group && item.group !== items[index - 1]?.group ? (
                    <p className="t-eyebrow px-[17px] pb-[6px] pt-[14px] text-rail-seller-label">
                      {item.group}
                    </p>
                  ) : null}
                  <RailLink item={item} active={isActive(item, pathname)} />
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
