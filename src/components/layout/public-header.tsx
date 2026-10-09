"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import {
  shortlistAccessibleName,
  shortlistHref,
  shortlistVisibleLabel,
  type ShortlistHeaderState,
} from "@/lib/shortlist-label";

/**
 * C-03 public header: "A light public header on white for buyers."
 *
 * Search is the primary action on the page, so the header carries no filled
 * button — "List a project" stays quiet because professionals are not the
 * homepage's main audience.
 *
 * Below 1060px this collapses to a hamburger and the same list appears as a drawer.
 *
 * Navigation is presentation. It is never the access control: kkl-backend authorises
 * every request independently of what this renders.
 */

/** Lead purchasing is the primary action; property browsing remains separate. */
const NAV = [
  { href: "/", label: "Home", match: (p: string) => p === "/" },
  { href: "/seller/leads", label: "Buy Leads", match: (p: string) => p.startsWith("/seller/leads") },
  {
    href: "/search",
    label: "Projects",
    match: (p: string, q: URLSearchParams) =>
      (p === "/search" && q.get("possession") !== "new_launch") || p.startsWith("/property/"),
  },
  {
    href: "/search?possession=new_launch",
    label: "New launches",
    match: (p: string, q: URLSearchParams) => p === "/search" && q.get("possession") === "new_launch",
  },
];

const desktopNavClass = (current: boolean) =>
  `relative rounded-[6px] px-[10px] py-[9px] text-[16px] transition-colors duration-150 after:absolute after:inset-x-[10px] after:bottom-[3px] after:h-[2px] after:rounded-full after:transition-colors ${
    current
      ? "bg-brand-deep font-bold text-white after:bg-saffron"
      : "font-medium text-body after:bg-transparent hover:bg-tint hover:text-brand hover:after:bg-brand/35"
  }`;

const mobileNavClass = (current: boolean) =>
  `flex min-h-[44px] items-center rounded-[6px] border-b border-line px-[10px] text-[16px] transition-colors ${
    current
      ? "bg-brand-deep font-bold text-white"
      : "font-medium text-body hover:bg-tint hover:text-brand"
  }`;

/** The header without active-state marking, used while the query string resolves. */
export function PublicHeaderFallback() {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto box-content flex max-w-[1280px] items-center gap-[22px] px-[32px] py-[14px] max-[1060px]:px-[18px]">
        <Link href="/" aria-label="Kaam Ki Lead — home" className="flex-none">
          <Wordmark />
        </Link>
        <CitySelector />
        <nav aria-label="Main" className="flex gap-[24px] whitespace-nowrap max-[1060px]:hidden">
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={desktopNavClass(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function PublicHeader({
  shortlist = { kind: "guest" },
}: {
  shortlist?: ShortlistHeaderState;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isCurrent = (item: (typeof NAV)[number]) => item.match(pathname, searchParams);

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto box-content flex max-w-[1280px] items-center gap-[22px] px-[32px] py-[14px] max-[1060px]:px-[18px]">
        <Link href="/" aria-label="Kaam Ki Lead — home" className="flex-none">
          <Wordmark />
        </Link>

        <CitySelector />

        <nav aria-label="Main" className="flex gap-[24px] whitespace-nowrap max-[1060px]:hidden">
          {NAV.map((item) => {
            const current = isCurrent(item);
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={desktopNavClass(current)}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-[22px] whitespace-nowrap max-[1060px]:hidden">
          <Link
            href={shortlistHref(shortlist)}
            /* 2.5.3 Label in Name: the visible text has to be inside the
               accessible name, or "click Shortlist (0)" matches nothing. */
            aria-label={shortlistAccessibleName(shortlist)}
            aria-current={pathname.includes("/shortlist") ? "page" : undefined}
            className={desktopNavClass(pathname.includes("/shortlist"))}
          >
            <span aria-hidden="true">♡ </span>
            {shortlistVisibleLabel(shortlist)}
          </Link>
          <Link
            href="/builders"
            aria-current={pathname.startsWith("/builders") ? "page" : undefined}
            className={desktopNavClass(pathname.startsWith("/builders"))}
          >
            List a project
          </Link>
          <Link
            href="/auth"
            aria-current={pathname.startsWith("/auth") ? "page" : undefined}
            className={`rounded-[6px] border-2 px-[18px] py-[9px] text-[16px] font-semibold transition-colors ${
              pathname.startsWith("/auth")
                ? "border-brand-deep bg-brand-deep text-white"
                : "border-control-border text-brand hover:border-brand hover:bg-tint"
            }`}
          >
            Sign in
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setDrawerOpen((v) => !v)}
          aria-expanded={drawerOpen}
          aria-controls="public-nav-drawer"
          className="ml-auto hidden h-[44px] w-[44px] items-center justify-center rounded-[6px] border border-line text-[20px] text-ink max-[1060px]:flex"
        >
          <span aria-hidden="true">{drawerOpen ? "✕" : "☰"}</span>
          <span className="sr-only">{drawerOpen ? "Close menu" : "Open menu"}</span>
        </button>
      </div>

      {drawerOpen ? (
        <div
          id="public-nav-drawer"
          className="border-t border-line bg-white px-[18px] py-[12px] min-[1061px]:hidden"
        >
          <nav aria-label="Main" className="flex flex-col">
            {NAV.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                aria-current={isCurrent(item) ? "page" : undefined}
                className={mobileNavClass(isCurrent(item))}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={shortlistHref(shortlist)}
              aria-label={shortlistAccessibleName(shortlist)}
              onClick={() => setDrawerOpen(false)}
              aria-current={pathname.includes("/shortlist") ? "page" : undefined}
              className={mobileNavClass(pathname.includes("/shortlist"))}
            >
              <span aria-hidden="true">♡&nbsp;</span>
              {shortlistVisibleLabel(shortlist)}
            </Link>
            <Link
              href="/builders"
              onClick={() => setDrawerOpen(false)}
              aria-current={pathname.startsWith("/builders") ? "page" : undefined}
              className={mobileNavClass(pathname.startsWith("/builders"))}
            >
              List a project
            </Link>
            <Link
              href="/auth"
              onClick={() => setDrawerOpen(false)}
              aria-current={pathname.startsWith("/auth") ? "page" : undefined}
              className={`mt-[12px] flex min-h-[44px] items-center justify-center rounded-[6px] border-2 text-[16px] font-semibold transition-colors ${
                pathname.startsWith("/auth")
                  ? "border-brand-deep bg-brand-deep text-white"
                  : "border-control-border text-brand hover:border-brand hover:bg-tint"
              }`}
            >
              Sign in
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

/**
 * The city selector. Kolkata is the only city in the approved taxonomy
 * (India → West Bengal → Kolkata → New Town → Action Area → Project), so the
 * control renders but has nothing else to offer yet and says so.
 */
function CitySelector() {
  return (
    <button
      type="button"
      aria-haspopup="listbox"
      aria-expanded={false}
      aria-label="Change city, currently Kolkata"
      className="flex flex-none items-center gap-[7px] rounded-[6px] border border-line bg-tint px-[12px] py-[9px] text-[15px] font-semibold text-body max-[1060px]:hidden"
    >
      <span aria-hidden="true" className="text-brand">
        ◉
      </span>
      Kolkata
      <span aria-hidden="true" className="text-muted">
        ▾
      </span>
    </button>
  );
}
