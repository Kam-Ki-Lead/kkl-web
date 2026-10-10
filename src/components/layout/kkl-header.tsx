"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";

/**
 * KklHeader — the two-tier public header.
 *
 *   Tier 1  utility strip   38px, lavender, city selector + quiet links
 *   Tier 2  main bar        68px, white, logo + segmented tabs + actions
 *   Bottom  brand gradient  2px purple-to-orange signature line
 *
 * WHY THIS IS SELF-CONTAINED CSS AND NOT TAILWIND
 *
 * globals.css already owns a global `@theme` block whose brand purple is
 * #78419b, sampled from the supplied logo during the 2 October 2026 revision.
 * This header's direction specifies #5B2D8E. Those are different colours, and
 * the reconciliation is a brand decision rather than a code one. Scoping the
 * palette to `[data-kklh]` means dropping this component in changes nothing
 * anywhere else, and swapping the four hex values below is the whole merge
 * when that decision is made.
 *
 * Nothing here reads or writes storage, and no network request is made. The
 * header is presentation only: kkl-backend authorises every request
 * independently of what this renders.
 */

/* ========================================================================== *
 *  TOKENS AND DATA
 * ========================================================================== */

export type KklCity = { readonly id: string; readonly label: string };

/** Kolkata first; the rest are the launch roadmap. Override with `cities`. */
export const KKL_CITIES: readonly KklCity[] = Object.freeze([
  { id: "kolkata", label: "Kolkata" },
  { id: "mumbai", label: "Mumbai" },
  { id: "delhi-ncr", label: "Delhi NCR" },
  { id: "bengaluru", label: "Bengaluru" },
  { id: "pune", label: "Pune" },
  { id: "hyderabad", label: "Hyderabad" },
]);

export type KklNavKey = "home" | "buy-leads" | "projects" | "new-launches";

export type KklHeaderLinks = {
  readonly home: string;
  readonly buyLeads: string;
  readonly projects: string;
  readonly newLaunches: string;
  readonly listProject: string;
  readonly help: string;
  readonly signIn: string;
  readonly shortlist: string;
};

/** The routes this application actually serves. */
const DEFAULT_LINKS: KklHeaderLinks = Object.freeze({
  home: "/",
  buyLeads: "/seller/leads",
  projects: "/search",
  newLaunches: "/search?possession=new_launch",
  listProject: "/builders",
  help: "/help",
  signIn: "/auth",
  shortlist: "/account/shortlist",
});

const NAV: ReadonlyArray<{ key: KklNavKey; label: string; link: keyof KklHeaderLinks }> =
  Object.freeze([
    { key: "home", label: "Home", link: "home" },
    { key: "buy-leads", label: "Buy leads", link: "buyLeads" },
    { key: "projects", label: "Projects", link: "projects" },
    { key: "new-launches", label: "New launches", link: "newLaunches" },
  ]);

/* ========================================================================== *
 *  STYLES
 * ========================================================================== */

/*
 * One stylesheet, scoped under [data-kklh]. Every colour is a custom property
 * declared once at the top, so the dark-mode block below only has to restate
 * values — never selectors, never layout. Layout is identical in both schemes,
 * which is the point of doing it this way.
 */
const CSS = `
[data-kklh] {
  /* --- brand -------------------------------------------------------- */
  --kklh-purple: #5B2D8E;
  --kklh-purple-hover: #4A2475;
  --kklh-orange: #F59A1F;
  --kklh-pink: #D6336C;

  /* --- surfaces ----------------------------------------------------- */
  --kklh-strip: #F6F4FA;
  --kklh-bar: #FFFFFF;
  --kklh-tabs: #F6F4FA;
  --kklh-pill: #FFFFFF;
  --kklh-border: #E7E3EF;

  /* --- text --------------------------------------------------------- */
  --kklh-ink: #1D1630;
  --kklh-muted: #6B6480;
  --kklh-tab-ink: #4A4360;

  /* --- depth -------------------------------------------------------- */
  --kklh-pill-shadow: 0 1px 2px rgba(29, 22, 48, 0.08), 0 2px 8px rgba(29, 22, 48, 0.06);
  --kklh-pop-shadow: 0 10px 30px rgba(29, 22, 48, 0.14), 0 2px 6px rgba(29, 22, 48, 0.08);

  /* --- metrics ------------------------------------------------------ */
  --kklh-strip-h: 38px;
  --kklh-bar-h: 68px;
  --kklh-gutter: 24px;
  --kklh-max: 1280px;

  /*
   * Plus Jakarta Sans when the app provides it (next/font sets the variable);
   * otherwise a locally installed copy, then the platform UI face. Declared as
   * a token so a brand font change is one line.
   */
  --kklh-font: var(--font-jakarta, "Plus Jakarta Sans"), ui-sans-serif, system-ui,
    -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/*
 * Dark mode. Only values change. The purple lightens because #5B2D8E on a
 * near-black surface is 1.6:1 — unreadable — while #B98BDC is 6.9:1.
 */
@media (prefers-color-scheme: dark) {
  [data-kklh="auto"] {
    --kklh-purple: #B98BDC;
    --kklh-purple-hover: #CCA6E6;
    --kklh-strip: #1E1829;
    --kklh-bar: #16111F;
    --kklh-tabs: #211B2E;
    --kklh-pill: #2A2139;
    --kklh-border: #312A42;
    --kklh-ink: #F3F0F8;
    --kklh-muted: #A79FBC;
    --kklh-tab-ink: #C6BFD6;
    --kklh-pill-shadow: 0 1px 2px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.35);
    --kklh-pop-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), 0 2px 6px rgba(0, 0, 0, 0.4);
  }
}

/* ------------------------------------------------- visually hidden ------ */

/*
 * The component's own, rather than Tailwind's "sr-only", so dropping this file
 * into an app without Tailwind still announces the labels it depends on.
 */
.kklh-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

/* ---------------------------------------------------------------- shell -- */

[data-kklh] {
  position: sticky;
  top: 0;
  z-index: 60;
  font-family: var(--kklh-font);
  color: var(--kklh-ink);
  /* Opaque first, so a browser without backdrop-filter still gets a readable
     bar rather than page content showing through. */
  background: var(--kklh-bar);
  background: color-mix(in srgb, var(--kklh-bar) 86%, transparent);
  -webkit-backdrop-filter: blur(12px) saturate(140%);
  backdrop-filter: blur(12px) saturate(140%);
}

[data-kklh] *,
[data-kklh] *::before,
[data-kklh] *::after {
  box-sizing: border-box;
}

.kklh-wrap {
  margin: 0 auto;
  display: flex;
  align-items: center;
  width: 100%;
  max-width: var(--kklh-max);
  /* Safe-area insets, so the content clears a notch in landscape. */
  padding-left: max(var(--kklh-gutter), env(safe-area-inset-left));
  padding-right: max(var(--kklh-gutter), env(safe-area-inset-right));
}

/* The signature line. Decorative, so it is hidden from assistive tech. */
.kklh-gradient {
  height: 2px;
  background: linear-gradient(90deg, var(--kklh-purple) 0%, var(--kklh-pink) 52%, var(--kklh-orange) 100%);
}

/* ------------------------------------------------------- tier 1: strip -- */

.kklh-strip {
  background: var(--kklh-strip);
  border-bottom: 1px solid var(--kklh-border);
}

.kklh-strip > .kklh-wrap {
  min-height: var(--kklh-strip-h);
  justify-content: space-between;
  gap: 16px;
}

.kklh-strip-links {
  display: flex;
  align-items: center;
  gap: 4px;
}

.kklh-quiet {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  color: var(--kklh-muted);
  text-decoration: none;
  background: none;
  border: 0;
  cursor: pointer;
  font-family: inherit;
  transition: color 140ms ease, background-color 140ms ease;
}

.kklh-quiet:hover {
  color: var(--kklh-purple);
  background: color-mix(in srgb, var(--kklh-purple) 8%, transparent);
}

/* ------------------------------------------------------- city selector -- */

.kklh-city {
  position: relative;
}

.kklh-city-btn[aria-expanded="true"] {
  color: var(--kklh-purple);
  background: color-mix(in srgb, var(--kklh-purple) 10%, transparent);
}

.kklh-chev {
  transition: transform 160ms ease;
}

.kklh-city-btn[aria-expanded="true"] .kklh-chev {
  transform: rotate(180deg);
}

.kklh-listbox {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 10;
  margin: 0;
  padding: 6px;
  min-width: 208px;
  list-style: none;
  background: var(--kklh-bar);
  border: 1px solid var(--kklh-border);
  border-radius: 12px;
  box-shadow: var(--kklh-pop-shadow);
}

.kklh-listbox:focus-visible {
  /* The roving focus lives on the list, so its own ring would double up with
     the highlighted option. The option is the visible indicator. */
  outline: none;
}

.kklh-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--kklh-ink);
  cursor: pointer;
}

.kklh-option[data-active="true"] {
  background: color-mix(in srgb, var(--kklh-purple) 12%, transparent);
  color: var(--kklh-purple);
}

.kklh-option[aria-selected="true"]::after {
  content: "";
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--kklh-orange);
  flex: none;
}

/* ---------------------------------------------------- tier 2: main bar -- */

.kklh-bar > .kklh-wrap {
  min-height: var(--kklh-bar-h);
  gap: 20px;
}

.kklh-logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex: none;
  text-decoration: none;
  border-radius: 8px;
}

.kklh-wordmark {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--kklh-ink);
  white-space: nowrap;
}

.kklh-wordmark b {
  font-weight: 800;
  color: var(--kklh-purple);
}

/* --------------------------------------------------------------- tabs -- */

/*
 * Visually a segmented control; semantically navigation. These are links, so
 * they are NOT role="tab" — that would promise tab panels that do not exist.
 */
.kklh-tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  background: var(--kklh-tabs);
  border: 1px solid var(--kklh-border);
  border-radius: 999px;
}

.kklh-tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  color: var(--kklh-tab-ink);
  text-decoration: none;
  transition: color 140ms ease, background-color 140ms ease;
}

.kklh-tab:hover {
  color: var(--kklh-purple);
  background: color-mix(in srgb, var(--kklh-purple) 7%, transparent);
}

.kklh-tab[aria-current="page"] {
  background: var(--kklh-pill);
  color: var(--kklh-purple);
  box-shadow: var(--kklh-pill-shadow);
}

/* A count riding on a tab. Ink on orange is 7.96:1; white would be 2.20:1. */
.kklh-tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 19px;
  height: 19px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--kklh-orange);
  color: #1D1630;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

/* ------------------------------------------------------------ actions -- */

.kklh-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.kklh-icon-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 10px;
  background: none;
  color: var(--kklh-ink);
  cursor: pointer;
  text-decoration: none;
  font-family: inherit;
  transition: color 140ms ease, background-color 140ms ease;
}

.kklh-icon-btn:hover,
.kklh-icon-btn[aria-expanded="true"] {
  color: var(--kklh-purple);
  background: color-mix(in srgb, var(--kklh-purple) 9%, transparent);
}

.kklh-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--kklh-orange);
  color: #1D1630;
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  /* Separates the badge from the icon beneath it on either scheme. */
  box-shadow: 0 0 0 2px var(--kklh-bar);
}

.kklh-cta {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 40px;
  padding: 0 16px;
  margin-left: 6px;
  border-radius: 10px;
  background: var(--kklh-purple);
  color: #FFFFFF;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  text-decoration: none;
  transition: background-color 140ms ease;
}

.kklh-cta:hover {
  background: var(--kklh-purple-hover);
}

@media (prefers-color-scheme: dark) {
  /* The light purple needs dark text on it, not white. */
  [data-kklh="auto"] .kklh-cta {
    color: #1D1630;
  }
}

/* ------------------------------------------------------- search panel -- */

.kklh-search {
  border-top: 1px solid var(--kklh-border);
  background: var(--kklh-bar);
}

.kklh-search > .kklh-wrap {
  padding-top: 14px;
  padding-bottom: 14px;
  gap: 10px;
}

.kklh-search form {
  display: flex;
  gap: 10px;
  width: 100%;
}

.kklh-input {
  flex: 1 1 auto;
  min-width: 0;
  height: 44px;
  padding: 0 14px;
  border: 1px solid var(--kklh-border);
  border-radius: 10px;
  background: var(--kklh-strip);
  color: var(--kklh-ink);
  font-family: inherit;
  font-size: 15px;
}

.kklh-input::placeholder {
  color: var(--kklh-muted);
}

.kklh-submit {
  flex: none;
  height: 44px;
  padding: 0 20px;
  border: 0;
  border-radius: 10px;
  background: var(--kklh-purple);
  color: #FFFFFF;
  font-family: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 140ms ease;
}

.kklh-submit:hover {
  background: var(--kklh-purple-hover);
}

@media (prefers-color-scheme: dark) {
  [data-kklh="auto"] .kklh-submit {
    color: #1D1630;
  }
}

/* ------------------------------------------------------------- drawer -- */

.kklh-burger {
  display: none;
}

.kklh-drawer {
  border-top: 1px solid var(--kklh-border);
  background: var(--kklh-bar);
  /* Clears the home indicator on a notched phone. */
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  max-height: calc(100dvh - var(--kklh-strip-h) - var(--kklh-bar-h));
  overflow-y: auto;
}

.kklh-drawer > .kklh-wrap {
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  padding-top: 12px;
}

.kklh-drawer-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 48px;
  padding: 0 14px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  color: var(--kklh-ink);
  text-decoration: none;
}

.kklh-drawer-link[aria-current="page"] {
  background: color-mix(in srgb, var(--kklh-purple) 11%, transparent);
  color: var(--kklh-purple);
}

.kklh-drawer-label {
  margin: 14px 0 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--kklh-muted);
}

.kklh-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.kklh-chip {
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid var(--kklh-border);
  border-radius: 999px;
  background: var(--kklh-strip);
  color: var(--kklh-ink);
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.kklh-chip[aria-pressed="true"] {
  border-color: var(--kklh-purple);
  background: color-mix(in srgb, var(--kklh-purple) 12%, transparent);
  color: var(--kklh-purple);
}

.kklh-drawer-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  margin-top: 14px;
  border-radius: 12px;
  background: var(--kklh-purple);
  color: #FFFFFF;
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
}

@media (prefers-color-scheme: dark) {
  [data-kklh="auto"] .kklh-drawer-cta {
    color: #1D1630;
  }
}

/* --------------------------------------------------------- responsive -- */

/* Tablet: the bar's CTA goes; the strip still carries "List a project". */
@media (max-width: 1100px) {
  .kklh-cta {
    display: none;
  }
}

/* Mobile: burger, logo, two icons. Everything else moves to the drawer. */
@media (max-width: 900px) {
  [data-kklh] {
    --kklh-gutter: 16px;
  }

  .kklh-strip {
    display: none;
  }

  .kklh-tabs-wrap {
    display: none;
  }

  .kklh-burger {
    display: inline-flex;
  }

  /*
   * 40px is comfortable for a mouse and small for a thumb. On touch widths the
   * icon buttons take the full 44px minimum target without changing the bar's
   * height, because the icon inside them does not grow.
   */
  .kklh-icon-btn {
    width: 44px;
    height: 44px;
  }

  .kklh-drawer {
    max-height: calc(100dvh - var(--kklh-bar-h));
  }
}

/* The drawer is a mobile affordance; never show it on a wide viewport. */
@media (min-width: 901px) {
  .kklh-drawer {
    display: none;
  }
}

/* ------------------------------------------------------------- focus --- */

/*
 * Matches globals.css: a 3px saffron ring with a 1px ink companion. The orange
 * alone is 2.31:1 on white, under the 3:1 that WCAG 2.2 AA 1.4.11 asks of a
 * focus indicator; the companion edge carries the contrast while the ring
 * still reads as orange.
 */
[data-kklh] :focus-visible {
  outline-style: solid;
  outline-width: 3px;
  outline-color: var(--kklh-orange);
  outline-offset: 2px;
  box-shadow: 0 0 0 1px var(--kklh-ink);
}

/* ---------------------------------------------------- reduced motion --- */

@media (prefers-reduced-motion: reduce) {
  [data-kklh] *,
  [data-kklh] *::before,
  [data-kklh] *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}

/* ---------------------------------------------------- forced colours --- */

/*
 * Forced-colors mode discards author backgrounds, so the active pill and the
 * count badge stop being distinct objects. A border restores the shape; the
 * system foreground supplies the contrast.
 */
@media (forced-colors: active) {
  .kklh-tab[aria-current="page"],
  .kklh-drawer-link[aria-current="page"],
  .kklh-badge,
  .kklh-tab-count,
  .kklh-chip[aria-pressed="true"],
  .kklh-option[aria-selected="true"] {
    border: 1px solid currentColor;
  }
}
`;

/* ========================================================================== *
 *  ICONS
 * ========================================================================== */

/*
 * All inline, all `currentColor`, all decorative — every icon sits beside a
 * text label or inside a control with an accessible name, so none of them is
 * announced.
 */

function LogoMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" role="img" aria-label="Kaam Ki Lead" focusable="false">
      <defs>
        <linearGradient id="kklh-arm-top" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#D6336C" />
          <stop offset="100%" stopColor="#F59A1F" />
        </linearGradient>
        <linearGradient id="kklh-arm-bottom" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#D6336C" />
          <stop offset="100%" stopColor="#5B2D8E" />
        </linearGradient>
      </defs>
      {/* The stem */}
      <rect x="2" y="3" width="6" height="26" rx="2" fill="#5B2D8E" />
      {/* Upper arm */}
      <path d="M9.5 16 L22.5 3 H30 L17 16 Z" fill="url(#kklh-arm-top)" />
      {/* Lower arm */}
      <path d="M9.5 16 H17 L30 29 H22.5 Z" fill="url(#kklh-arm-bottom)" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M8 1.5c-2.5 0-4.5 2-4.5 4.5 0 3.2 4 8 4.5 8.5.5-.5 4.5-5.3 4.5-8.5 0-2.5-2-4.5-4.5-4.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="6" r="1.6" fill="currentColor" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      className="kklh-chev"
      width="11"
      height="11"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
      <circle cx="8.75" cy="8.75" r="5.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="m13 13 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M10 16.5s-6.5-3.9-6.5-8a3.7 3.7 0 0 1 6.5-2.4A3.7 3.7 0 0 1 16.5 8.5c0 4.1-6.5 8-6.5 8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BurgerIcon({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
      {open ? (
        <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      ) : (
        <path d="M3.5 6h13M3.5 10h13M3.5 14h13" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      )}
    </svg>
  );
}

/* ========================================================================== *
 *  COMPONENT
 * ========================================================================== */

export type KklHeaderProps = {
  /**
   * Which tab is current. Omit and it is derived from `usePathname()`.
   *
   * Pass it explicitly when the distinction needs the query string — "New
   * launches" is `/search?possession=new_launch`, which a pathname cannot
   * tell apart from "Projects". Deriving it here instead would force every
   * consumer under a Suspense boundary, which `useSearchParams()` requires.
   */
  readonly activeKey?: KklNavKey;
  /** Route overrides. Anything omitted falls back to the application default. */
  readonly links?: Partial<KklHeaderLinks>;
  /** The cities offered. Defaults to the launch roadmap. */
  readonly cities?: readonly KklCity[];
  /** Controlled city id. Supply with `onCityChange`, or use `defaultCity`. */
  readonly city?: string;
  /** Uncontrolled initial city id. Ignored when `city` is supplied. */
  readonly defaultCity?: string;
  readonly onCityChange?: (city: KklCity) => void;
  /** Saved properties. `null` means signed out or unknown — no badge is drawn. */
  readonly shortlistCount?: number | null;
  /** Projects launching now. `null` or 0 draws no count. */
  readonly newLaunchCount?: number | null;
  /**
   * Called instead of submitting when supplied. Without it the panel is a
   * plain GET form to `searchAction`, so search still works with no JS.
   */
  readonly onSearch?: (query: string) => void;
  readonly searchAction?: string;
  /**
   * "auto" follows `prefers-color-scheme`. Use "light" until the rest of the
   * application has a dark theme, or the header will be dark above a light page.
   */
  readonly colorScheme?: "auto" | "light";
};

/** Falls back to Projects for any unrecognised route, which is the broad view. */
function keyForPath(pathname: string): KklNavKey | null {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/seller/leads")) return "buy-leads";
  if (pathname === "/search" || pathname.startsWith("/property/")) return "projects";
  return null;
}

export function KklHeader({
  activeKey,
  links,
  cities = KKL_CITIES,
  city,
  defaultCity,
  onCityChange,
  shortlistCount = null,
  newLaunchCount = null,
  onSearch,
  searchAction = "/search",
  colorScheme = "auto",
}: KklHeaderProps) {
  const href = { ...DEFAULT_LINKS, ...links };
  const pathname = usePathname();
  const current = activeKey ?? keyForPath(pathname ?? "/");

  /* ---------------------------------------------------------- city ---- */

  const [uncontrolledCity, setUncontrolledCity] = useState(
    () => defaultCity ?? cities[0]?.id ?? "",
  );
  const selectedId = city ?? uncontrolledCity;
  const selected = cities.find((c) => c.id === selectedId) ?? cities[0];

  const [cityOpen, setCityOpen] = useState(false);
  // The roving highlight. Separate from the selection: you can arrow past
  // options without choosing one, which is what a listbox is expected to do.
  const [activeIndex, setActiveIndex] = useState(0);

  const cityRef = useRef<HTMLDivElement>(null);
  const cityBtnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const searchBtnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uid = useId();
  const cityListId = `${uid}-cities`;
  const cityLabelId = `${uid}-city-label`;
  const searchId = `${uid}-search`;
  const drawerId = `${uid}-drawer`;
  const optionId = (index: number) => `${uid}-city-${index}`;

  const chooseCity = useCallback(
    (next: KklCity) => {
      if (city === undefined) setUncontrolledCity(next.id);
      onCityChange?.(next);
      setCityOpen(false);
      cityBtnRef.current?.focus();
    },
    [city, onCityChange],
  );

  const openCityList = useCallback(() => {
    const index = Math.max(0, cities.findIndex((c) => c.id === selectedId));
    setActiveIndex(index);
    setCityOpen(true);
  }, [cities, selectedId]);

  // Focus moves into the list once it exists, so the arrow keys land somewhere.
  useEffect(() => {
    if (cityOpen) listRef.current?.focus();
  }, [cityOpen]);

  // The search field is the only reason to open that panel.
  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  /* Escape closes whatever is open, innermost first, and returns focus. */
  useEffect(() => {
    if (!cityOpen && !searchOpen && !drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (cityOpen) {
        setCityOpen(false);
        cityBtnRef.current?.focus();
        return;
      }
      if (searchOpen) {
        setSearchOpen(false);
        searchBtnRef.current?.focus();
        return;
      }
      setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [cityOpen, searchOpen, drawerOpen]);

  /* Click outside closes the city list. pointerdown, so it fires before a
     click elsewhere has a chance to act on a stale layout. */
  useEffect(() => {
    if (!cityOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!cityRef.current?.contains(event.target as Node)) setCityOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [cityOpen]);

  /* The drawer covers the viewport, so the page behind it must not scroll. */
  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  const onListKeyDown = (event: ReactKeyboardEvent<HTMLUListElement>) => {
    const last = cities.length - 1;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i >= last ? 0 : i + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? last : i - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(last);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const next = cities[activeIndex];
      if (next) chooseCity(next);
    } else if (event.key === "Tab") {
      setCityOpen(false);
    }
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    if (!onSearch) return; // Let the plain GET form navigate.
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("q");
    onSearch(typeof value === "string" ? value.trim() : "");
  };

  const showShortlistBadge = typeof shortlistCount === "number" && shortlistCount > 0;
  const showLaunchCount = typeof newLaunchCount === "number" && newLaunchCount > 0;
  const closeDrawer = () => setDrawerOpen(false);

  return (
    <header data-kklh={colorScheme}>
      {/* Scoped stylesheet. dangerouslySetInnerHTML so `>` in selectors is not
          escaped — the content is this module's own constant, never input. */}
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ---------------------------------------------- tier 1: utility -- */}
      <div className="kklh-strip">
        <div className="kklh-wrap">
          <div className="kklh-city" ref={cityRef}>
            <button
              type="button"
              ref={cityBtnRef}
              className="kklh-quiet kklh-city-btn"
              aria-haspopup="listbox"
              aria-expanded={cityOpen}
              aria-controls={cityOpen ? cityListId : undefined}
              onClick={() => (cityOpen ? setCityOpen(false) : openCityList())}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" && !cityOpen) {
                  event.preventDefault();
                  openCityList();
                }
              }}
            >
              <PinIcon />
              <span id={cityLabelId}>{selected?.label ?? "Select city"}</span>
              <span className="kklh-sr">— change city</span>
              <ChevronIcon />
            </button>

            {cityOpen ? (
              <ul
                id={cityListId}
                ref={listRef}
                className="kklh-listbox"
                role="listbox"
                tabIndex={-1}
                aria-labelledby={cityLabelId}
                aria-activedescendant={optionId(activeIndex)}
                onKeyDown={onListKeyDown}
              >
                {cities.map((option, index) => (
                  <li
                    key={option.id}
                    id={optionId(index)}
                    role="option"
                    className="kklh-option"
                    aria-selected={option.id === selectedId}
                    data-active={index === activeIndex}
                    onPointerMove={() => setActiveIndex(index)}
                    onClick={() => chooseCity(option)}
                  >
                    {option.label}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="kklh-strip-links">
            <Link href={href.listProject} className="kklh-quiet">
              List a project
            </Link>
            <Link href={href.help} className="kklh-quiet">
              Help
            </Link>
            <Link href={href.signIn} className="kklh-quiet">
              Sign in
            </Link>
          </div>
        </div>
      </div>

      {/* --------------------------------------------- tier 2: main bar -- */}
      <div className="kklh-bar">
        <div className="kklh-wrap">
          <button
            type="button"
            className="kklh-icon-btn kklh-burger"
            aria-expanded={drawerOpen}
            aria-controls={drawerId}
            onClick={() => setDrawerOpen((open) => !open)}
          >
            <BurgerIcon open={drawerOpen} />
            <span className="kklh-sr">{drawerOpen ? "Close menu" : "Open menu"}</span>
          </button>

          <Link href={href.home} className="kklh-logo" aria-label="Kaam Ki Lead — home">
            <LogoMark />
            <span className="kklh-wordmark" aria-hidden="true">
              Kaam Ki <b>Lead</b>
            </span>
          </Link>

          <nav aria-label="Main" className="kklh-tabs-wrap">
            <div className="kklh-tabs">
              {NAV.map((item) => (
                <Link
                  key={item.key}
                  href={href[item.link]}
                  className="kklh-tab"
                  aria-current={current === item.key ? "page" : undefined}
                >
                  {item.label}
                  {item.key === "new-launches" && showLaunchCount ? (
                    <span className="kklh-tab-count" aria-hidden="true">
                      {newLaunchCount}
                    </span>
                  ) : null}
                  {item.key === "new-launches" && showLaunchCount ? (
                    <span className="kklh-sr">, {newLaunchCount} available</span>
                  ) : null}
                </Link>
              ))}
            </div>
          </nav>

          <div className="kklh-actions">
            <button
              type="button"
              ref={searchBtnRef}
              className="kklh-icon-btn"
              aria-expanded={searchOpen}
              aria-controls={searchId}
              onClick={() => setSearchOpen((open) => !open)}
            >
              <SearchIcon />
              <span className="kklh-sr">{searchOpen ? "Close search" : "Search"}</span>
            </button>

            <Link
              href={href.shortlist}
              className="kklh-icon-btn"
              /* 2.5.3 Label in Name is not at risk here — the control has no
                 visible text — but the count belongs in the name so "Shortlist,
                 3 saved" is what gets announced rather than a bare heart. */
              aria-label={
                showShortlistBadge ? `Shortlist, ${shortlistCount} saved` : "Shortlist"
              }
            >
              <HeartIcon />
              {showShortlistBadge ? (
                <span className="kklh-badge" aria-hidden="true">
                  {shortlistCount}
                </span>
              ) : null}
            </Link>

            <Link href={href.listProject} className="kklh-cta">
              <PlusIcon />
              List a project
            </Link>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------ search panel -- */}
      {searchOpen ? (
        <div className="kklh-search" id={searchId}>
          <div className="kklh-wrap">
            <form action={onSearch ? undefined : searchAction} onSubmit={submitSearch} role="search">
              <label className="kklh-sr" htmlFor={`${uid}-q`}>
                Search by project, builder or locality
              </label>
              <input
                id={`${uid}-q`}
                ref={inputRef}
                className="kklh-input"
                type="search"
                name="q"
                autoComplete="off"
                placeholder="Search by project, builder or locality"
              />
              <button type="submit" className="kklh-submit">
                Search
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------------ drawer -- */}
      {drawerOpen ? (
        <div className="kklh-drawer" id={drawerId}>
          <div className="kklh-wrap">
            <nav aria-label="Main menu">
              {NAV.map((item) => (
                <Link
                  key={item.key}
                  href={href[item.link]}
                  className="kklh-drawer-link"
                  aria-current={current === item.key ? "page" : undefined}
                  onClick={closeDrawer}
                >
                  {item.label}
                  {item.key === "new-launches" && showLaunchCount ? (
                    <span className="kklh-tab-count" aria-hidden="true">
                      {newLaunchCount}
                    </span>
                  ) : null}
                </Link>
              ))}
            </nav>

            <p className="kklh-drawer-label" id={`${uid}-city-group`}>
              City
            </p>
            <div className="kklh-chips" role="group" aria-labelledby={`${uid}-city-group`}>
              {cities.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="kklh-chip"
                  aria-pressed={option.id === selectedId}
                  onClick={() => {
                    if (city === undefined) setUncontrolledCity(option.id);
                    onCityChange?.(option);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <p className="kklh-drawer-label">Account</p>
            <Link href={href.signIn} className="kklh-drawer-link" onClick={closeDrawer}>
              Sign in
            </Link>
            <Link href={href.help} className="kklh-drawer-link" onClick={closeDrawer}>
              Help
            </Link>

            <Link href={href.listProject} className="kklh-drawer-cta" onClick={closeDrawer}>
              <PlusIcon />
              List a project
            </Link>
          </div>
        </div>
      ) : null}

      <div className="kklh-gradient" aria-hidden="true" />
    </header>
  );
}
