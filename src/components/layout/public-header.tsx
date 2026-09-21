"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Wordmark } from "@/components/brand/wordmark";

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

const NAV = [
  { href: "/search", label: "Buy" },
  { href: "/search?type=project", label: "Projects" },
  { href: "/search?launch=new", label: "New launches" },
  { href: "/find-my-match", label: "Find my match" },
];

export function PublicHeader({ shortlistCount = 0 }: { shortlistCount?: number }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isCurrent = (href: string) => {
    const path = href.split("?")[0] ?? href;
    return path === "/search" ? pathname === "/search" : pathname === path;
  };

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-[1280px] items-center gap-[22px] px-[32px] py-[14px] max-[1060px]:px-[18px]">
        <Link href="/" aria-label="Kam Ki Lead — home" className="flex-none">
          <Wordmark />
        </Link>

        <CitySelector />

        <nav aria-label="Main" className="flex gap-[24px] whitespace-nowrap max-[1060px]:hidden">
          {NAV.map((item) => {
            const current = isCurrent(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={
                  current
                    ? "border-b-[3px] border-saffron pb-[5px] text-[16px] font-bold text-brand"
                    : "text-[16px] font-medium text-body hover:text-brand"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-[22px] whitespace-nowrap max-[1060px]:hidden">
          <Link
            href="/account/shortlist"
            aria-label={`Shortlist, ${shortlistCount} saved`}
            className="text-[16px] font-medium text-body hover:text-brand"
          >
            <span aria-hidden="true">♡ </span>
            Shortlist ({shortlistCount})
          </Link>
          <Link href="/builders" className="text-[16px] font-medium text-body hover:text-brand">
            List a project
          </Link>
          <Link
            href="/auth"
            className="rounded-[6px] border-2 border-[#C6CCE0] px-[18px] py-[9px] text-[16px] font-semibold text-brand hover:border-brand"
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
                aria-current={isCurrent(item.href) ? "page" : undefined}
                className={`flex min-h-[44px] items-center border-b border-line text-[16px] ${
                  isCurrent(item.href) ? "font-bold text-brand" : "font-medium text-body"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/account/shortlist"
              onClick={() => setDrawerOpen(false)}
              className="flex min-h-[44px] items-center border-b border-line text-[16px] font-medium text-body"
            >
              <span aria-hidden="true">♡&nbsp;</span>Shortlist ({shortlistCount})
            </Link>
            <Link
              href="/builders"
              onClick={() => setDrawerOpen(false)}
              className="flex min-h-[44px] items-center border-b border-line text-[16px] font-medium text-body"
            >
              List a project
            </Link>
            <Link
              href="/auth"
              onClick={() => setDrawerOpen(false)}
              className="mt-[12px] flex min-h-[44px] items-center justify-center rounded-[6px] border-2 border-[#C6CCE0] text-[16px] font-semibold text-brand"
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
