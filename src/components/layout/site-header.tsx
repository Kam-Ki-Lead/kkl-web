"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { InlineScript } from "./inline-script";
import {
  readStoredCity,
  readStoredCityOnServer,
  subscribeToCity,
  writeStoredCity,
} from "./city-preference";
import styles from "./site-header.module.css";
import {
  CITIES,
  CITY_STORAGE_KEY,
  DEFAULT_CITY_ID,
  SEARCH_PLACEHOLDER,
  type City,
  type HeaderNavItem,
  type QueryLike,
  activeNavLabel,
  cityButtonLabel,
  buyLeadsHref,
  cityLabel,
  headerNav,
  headerSearchHref,
  readCityId,
  shortlistBadge,
  accountLink,
} from "@/lib/domain/site-header";

/**
 * The public header: "utility strip and segmented tabs".
 *
 * The approved design is unchanged. What changed is that every control in it
 * now does something: the city selector is a real listbox that remembers the
 * choice, the search icon opens a panel that reaches the results page's `q`
 * filter, the badge is driven by a count, and the active tab comes from the
 * route instead of a hard-coded attribute.
 *
 * No dependencies beyond React and `next/link` / `next/navigation`.
 */

const EMPTY_QUERY: QueryLike = { get: () => null };

/** Joins class names, dropping any the stylesheet did not provide. */
const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(" ");

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

export type SiteHeaderProps = {
  /** Drives the badge. 0 or absent draws no badge at all. */
  readonly shortlistCount?: number;
  /** The cities on offer. See the note in `site-header.ts` before widening. */
  readonly cities?: readonly City[];
  readonly defaultCityId?: string;
  /**
   * Whether this visitor has a session.
   *
   * It only decides where Buy leads points: the console for somebody signed
   * in, the public brokers page for everybody else. It is not access control
   * — kkl-backend authorises every request regardless of what this renders.
   */
  readonly signedIn?: boolean;
  readonly nav?: readonly HeaderNavItem[];
  readonly shortlistHref?: string;
  readonly listProjectHref?: string;
  readonly helpHref?: string;
  readonly signInHref?: string;
  /** Called after a city is chosen and stored, for callers that refetch. */
  readonly onCityChange?: (cityId: string) => void;
};

/* ------------------------------------------------------------------ icons -- */

function Sprite() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
      <symbol id="kh-pin" viewBox="0 0 24 24">
        <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </symbol>
      <symbol id="kh-chev" viewBox="0 0 12 12">
        <path d="m2 4 4 4 4-4" />
      </symbol>
      <symbol id="kh-search" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </symbol>
      <symbol id="kh-heart" viewBox="0 0 24 24">
        <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
      </symbol>
      <symbol id="kh-plus" viewBox="0 0 24 24">
        <path d="M12 5v14M5 12h14" />
      </symbol>
      <symbol id="kh-menu" viewBox="0 0 24 24">
        <path d="M4 7h16M4 12h16M4 17h16" />
      </symbol>
      <symbol id="kh-tick" viewBox="0 0 24 24">
        <path d="m4 12 5.5 5.5L20 7" />
      </symbol>
    </svg>
  );
}

function Icon({ id, className }: { id: string; className?: string }) {
  return (
    <svg className={className ?? styles.icon} aria-hidden="true" focusable="false">
      <use href={`#${id}`} />
    </svg>
  );
}

/* ----------------------------------------------------------- the header -- */

/**
 * Reads the query string, so it must sit under a Suspense boundary for any
 * route that is statically prerendered. `SiteHeaderFallback` is that
 * boundary's fallback: the same bar, with no tab marked current yet.
 */
export function SiteHeader(props: SiteHeaderProps) {
  const query = useSearchParams();
  return <HeaderView {...props} query={query} />;
}

export function SiteHeaderFallback(props: SiteHeaderProps) {
  return <HeaderView {...props} query={null} />;
}

function HeaderView({
  shortlistCount = 0,
  cities = CITIES,
  defaultCityId = DEFAULT_CITY_ID,
  signedIn = false,
  nav: navProp,
  shortlistHref = "/account/shortlist",
  listProjectHref = "/builders",
  helpHref = "/support",
  signInHref = "/auth",
  onCityChange,
  query,
}: SiteHeaderProps & { query: QueryLike | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = navProp ?? headerNav(buyLeadsHref(signedIn));
  /* `signInHref` still overrides, for a caller that wants a specific target;
     otherwise the control follows the session. */
  const account = signInHref === "/auth"
    ? accountLink(signedIn)
    : { href: signInHref, label: "Sign in" };

  const [cityOpen, setCityOpen] = useState(false);
  const [cityActive, setCityActive] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCityOpen, setDrawerCityOpen] = useState(false);
  const [lifted, setLifted] = useState(false);

  const cityWrapRef = useRef<HTMLDivElement>(null);
  const cityButtonRef = useRef<HTMLButtonElement>(null);
  const cityListRef = useRef<HTMLUListElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const base = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const cityLabelId = `${base}-city-label`;
  const cityButtonId = `${base}-city-button`;
  const cityListId = `${base}-city-list`;
  const searchPanelId = `${base}-search`;
  const drawerId = `${base}-drawer`;

  /* -- the chosen city ---------------------------------------------------
     The server renders the default; the inline script further down has
     already put the remembered one in the DOM before first paint, so the
     re-render this causes after hydration is invisible. */
  const stored = useSyncExternalStore(subscribeToCity, readStoredCity, readStoredCityOnServer);
  const cityId = readCityId(stored, cities) ?? defaultCityId;

  const currentLabel = activeNavLabel(pathname, query ?? EMPTY_QUERY, nav);
  const badge = shortlistBadge(shortlistCount);
  const selectedLabel = cityLabel(cityId, cities);

  const chooseCity = useCallback(
    (id: string) => {
      writeStoredCity(id);
      setCityOpen(false);
      setDrawerCityOpen(false);
      onCityChange?.(id);
      cityButtonRef.current?.focus();
    },
    [onCityChange],
  );

  /** Everything that is open, closed. Used by link taps and by Back. */
  const closeEverything = useCallback(() => {
    setCityOpen(false);
    setSearchOpen(false);
    setDrawerOpen(false);
    setDrawerCityOpen(false);
  }, []);

  const closeSearch = useCallback((restoreFocus: boolean) => {
    setSearchOpen(false);
    if (restoreFocus) searchButtonRef.current?.focus();
  }, []);

  /* -- the shadow, once the page has scrolled --------------------------- */
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setLifted(window.scrollY > 4);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  /* -- outside click ---------------------------------------------------- */
  useEffect(() => {
    if (!cityOpen && !searchOpen && !drawerOpen) return;
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (cityOpen && !cityWrapRef.current?.contains(target)) setCityOpen(false);
      if (
        searchOpen &&
        !panelRef.current?.contains(target) &&
        !searchButtonRef.current?.contains(target)
      ) {
        // Focus has already moved to whatever was clicked; pulling it back to
        // the icon would be the surprising thing to do.
        closeSearch(false);
      }
      if (
        drawerOpen &&
        !drawerRef.current?.contains(target) &&
        !menuButtonRef.current?.contains(target)
      ) {
        setDrawerOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [cityOpen, searchOpen, drawerOpen, closeSearch]);

  /* -- Escape ------------------------------------------------------------ */
  useEffect(() => {
    if (!cityOpen && !searchOpen && !drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Innermost first. The city popup and the drawer are at different
      // breakpoints, so only one of them can be open.
      if (cityOpen) {
        setCityOpen(false);
        cityButtonRef.current?.focus();
        return;
      }
      if (drawerOpen) {
        setDrawerOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (searchOpen) closeSearch(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [cityOpen, searchOpen, drawerOpen, closeSearch]);

  /* -- the drawer's focus trap ------------------------------------------- */
  useEffect(() => {
    if (!drawerOpen) return;
    const node = drawerRef.current;
    if (!node) return;
    node.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      // Re-read on every Tab: the city disclosure adds and removes rows.
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null,
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    node.addEventListener("keydown", onKey);
    return () => node.removeEventListener("keydown", onKey);
  }, [drawerOpen, drawerCityOpen]);

  /* -- focus the search input when the panel opens ----------------------- */
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  /* -- Back and Forward close whatever is open ---------------------------
     Link taps close their own panel in the handler below. This covers the
     browser's own navigation, which no handler sees. */
  useEffect(() => {
    window.addEventListener("popstate", closeEverything);
    return () => window.removeEventListener("popstate", closeEverything);
  }, [closeEverything]);

  /* -- the listbox's keyboard -------------------------------------------- */
  const openCityList = useCallback(
    (startAt: number) => {
      setCityActive(startAt);
      setCityOpen(true);
      // The list takes focus so `aria-activedescendant` has an owner.
      window.requestAnimationFrame(() => cityListRef.current?.focus());
    },
    [],
  );

  const onCityButtonKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const index = Math.max(0, cities.findIndex((city) => city.id === cityId));
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openCityList(index);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openCityList(cities.length - 1);
    }
  };

  const onCityListKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    const last = cities.length - 1;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setCityActive((index) => (index >= last ? 0 : index + 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setCityActive((index) => (index <= 0 ? last : index - 1));
        break;
      case "Home":
        event.preventDefault();
        setCityActive(0);
        break;
      case "End":
        event.preventDefault();
        setCityActive(last);
        break;
      case "Enter":
      case " ": {
        event.preventDefault();
        const picked = cities[cityActive];
        if (picked) chooseCity(picked.id);
        break;
      }
      case "Tab":
        // Tab means "I am done here", not "pick the highlighted one".
        setCityOpen(false);
        break;
      default:
        break;
    }
  };

  const onSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const href = headerSearchHref(searchText);
    setSearchOpen(false);
    router.push(href);
  };

  /* -- first paint, with the remembered city ------------------------------
     Server-rendered HTML carries the default city. This runs while the
     browser parses the page, so a returning visitor never sees the default
     flash past. React state catches up in the effect above. */
  const cityMap = JSON.stringify(
    Object.fromEntries(cities.map((city) => [city.id, city.label])),
  ).replace(/</g, "\\u003c");
  const restoreCityScript =
    `{try{var v=localStorage.getItem(${JSON.stringify(CITY_STORAGE_KEY)});var m=${cityMap};` +
    `if(v&&m[v]){var t=document.getElementById(${JSON.stringify(cityLabelId)});if(t)t.textContent=m[v];` +
    `var b=document.getElementById(${JSON.stringify(cityButtonId)});` +
    `if(b)b.setAttribute("aria-label","City: "+m[v]+". Change city")}}catch(e){}}`;

  const navLink = (item: HeaderNavItem, className?: string, onClick?: () => void) => (
    <Link
      key={item.label}
      href={item.href}
      className={className}
      aria-current={currentLabel === item.label ? "page" : undefined}
      onClick={onClick}
    >
      {item.label}
    </Link>
  );

  return (
    <header className={cx(styles.shell, lifted && styles.lifted)}>
      <Sprite />

      {/* ---------------------------------------------------- utility strip */}
      <div className={styles.util}>
        <div className={styles.row}>
          <div className={cx(styles.cityWrap, styles.cityStripItem)} ref={cityWrapRef}>
            <button
              type="button"
              id={cityButtonId}
              ref={cityButtonRef}
              aria-haspopup="listbox"
              aria-expanded={cityOpen}
              aria-controls={cityOpen ? cityListId : undefined}
              aria-label={cityButtonLabel(cityId, cities)}
              suppressHydrationWarning
              onClick={() =>
                cityOpen
                  ? setCityOpen(false)
                  : openCityList(Math.max(0, cities.findIndex((c) => c.id === cityId)))
              }
              onKeyDown={onCityButtonKeyDown}
            >
              <Icon id="kh-pin" className={cx(styles.icon, styles.pin)} />
              <span id={cityLabelId} suppressHydrationWarning>
                {selectedLabel}
              </span>
              <Icon id="kh-chev" />
            </button>
            <InlineScript html={restoreCityScript} />

            {cityOpen ? (
              <ul
                id={cityListId}
                ref={cityListRef}
                role="listbox"
                tabIndex={-1}
                aria-label="City"
                aria-activedescendant={`${cityListId}-${cityActive}`}
                className={styles.cityList}
                onKeyDown={onCityListKeyDown}
              >
                {cities.map((city, index) => {
                  const selected = city.id === cityId;
                  return (
                    <li
                      key={city.id}
                      id={`${cityListId}-${index}`}
                      role="option"
                      aria-selected={selected}
                      className={cx(styles.cityOption, index === cityActive && styles.cityOptionActive)}
                      onMouseEnter={() => setCityActive(index)}
                      onClick={() => chooseCity(city.id)}
                    >
                      {city.label}
                      {selected ? <Icon id="kh-tick" className={cx(styles.icon, styles.cityTick)} /> : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>

          <div className={styles.spacer} />
          <nav aria-label="Secondary" style={{ display: "contents" }}>
            {/* No width class: the brief says the main bar's button is the one
                that goes at 1100px, and that this link stays in the strip. */}
            <Link href={listProjectHref}>List a project</Link>
            <Link href={helpHref} className={styles.onlyMid}>
              Help
            </Link>
            <Link href={account.href}>{account.label}</Link>
          </nav>
        </div>
      </div>

      {/* ------------------------------------------------------- main bar */}
      <div>
        <div className={styles.row}>
          <button
            type="button"
            ref={menuButtonRef}
            className={cx(styles.ic, styles.menuBtn)}
            aria-label={drawerOpen ? "Close menu" : "Menu"}
            aria-expanded={drawerOpen}
            aria-controls={drawerOpen ? drawerId : undefined}
            onClick={() => setDrawerOpen((open) => !open)}
          >
            <Icon id="kh-menu" />
          </button>

          <Link className={styles.logo} href="/" aria-label="Kaam Ki Lead — home">
            {/*
              The application's own logo component, unchanged: its markup, its
              /brand/kkl-logo.jpg and its typography are the ones every other
              surface renders. The header sizes the box it sits in and nothing
              else. "sm" is the 36px variant, the nearest of the component's
              existing sizes to this bar's 34px.
            */}
            <Wordmark size="sm" />
          </Link>

          <nav className={styles.seg} aria-label="Main">
            {nav.map((item) => navLink(item, undefined, closeEverything))}
          </nav>

          <div className={styles.spacer} />

          <button
            type="button"
            ref={searchButtonRef}
            className={styles.ic}
            aria-label={searchOpen ? "Close search" : "Search"}
            aria-expanded={searchOpen}
            aria-controls={searchOpen ? searchPanelId : undefined}
            onClick={() => (searchOpen ? closeSearch(true) : setSearchOpen(true))}
          >
            <Icon id="kh-search" />
          </button>

          <Link
            className={cx(styles.ic, styles.onlyMid)}
            href={shortlistHref}
            aria-label={badge.label}
          >
            <Icon id="kh-heart" />
            {badge.text ? (
              <span className={styles.badge} aria-hidden="true">
                {badge.text}
              </span>
            ) : null}
          </Link>

          <Link className={cx(styles.btn, styles.solid, styles.onlyWide)} href={listProjectHref}>
            <Icon id="kh-plus" />
            List a project
          </Link>
        </div>
      </div>

      {/* --------------------------------------------------- search panel */}
      {searchOpen ? (
        <div className={styles.panel} id={searchPanelId} ref={panelRef}>
          <form className={styles.panelRow} role="search" onSubmit={onSearchSubmit}>
            <label className={styles.srOnly} htmlFor={`${base}-q`}>
              Search projects
            </label>
            <input
              id={`${base}-q`}
              ref={searchInputRef}
              className={styles.field}
              type="search"
              name="q"
              autoComplete="off"
              enterKeyHint="search"
              placeholder={SEARCH_PLACEHOLDER}
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
            <button type="submit" className={cx(styles.btn, styles.solid)}>
              <Icon id="kh-search" />
              Search
            </button>
          </form>
        </div>
      ) : null}

      {/* --------------------------------------------------------- drawer */}
      {drawerOpen ? (
        <div className={styles.drawer} id={drawerId} ref={drawerRef}>
          <nav aria-label="Main" style={{ display: "contents" }}>
            {nav.map((item) => navLink(item, styles.drawerItem, () => setDrawerOpen(false)))}
          </nav>

          {/* The bar's shortlist control is hidden at this width, so the only
              way to it is here. The badge travels with it. */}
          <Link
            href={shortlistHref}
            className={styles.drawerItem}
            aria-label={badge.label}
            onClick={() => setDrawerOpen(false)}
          >
            <Icon id="kh-heart" />
            Shortlist
            {badge.text ? (
              <>
                <span className={styles.spacer} />
                <span className={styles.drawerBadge} aria-hidden="true">
                  {badge.text}
                </span>
              </>
            ) : null}
          </Link>

          <button
            type="button"
            className={styles.drawerItem}
            style={{ width: "100%", background: "none", border: 0, borderBottom: "1px solid var(--kh-line)" }}
            aria-expanded={drawerCityOpen}
            onClick={() => setDrawerCityOpen((open) => !open)}
          >
            <Icon id="kh-pin" className={cx(styles.icon, styles.pin)} />
            City: {selectedLabel}
            <span className={styles.spacer} />
            <Icon id="kh-chev" />
          </button>

          {drawerCityOpen
            ? cities.map((city) => (
                <button
                  key={city.id}
                  type="button"
                  className={styles.drawerItem}
                  style={{
                    width: "100%",
                    paddingLeft: 28,
                    background: "none",
                    border: 0,
                    borderBottom: "1px solid var(--kh-line)",
                  }}
                  aria-pressed={city.id === cityId}
                  onClick={() => chooseCity(city.id)}
                >
                  {city.label}
                  {city.id === cityId ? (
                    <>
                      <span className={styles.spacer} />
                      <Icon id="kh-tick" className={cx(styles.icon, styles.cityTick)} />
                    </>
                  ) : null}
                </button>
              ))
            : null}

          <Link
            href={account.href}
            className={styles.drawerItem}
            onClick={() => setDrawerOpen(false)}
            aria-current={pathname.startsWith(account.href) ? "page" : undefined}
          >
            {account.label}
          </Link>

          <Link
            href={listProjectHref}
            className={cx(styles.btn, styles.solid, styles.drawerCta)}
            onClick={() => setDrawerOpen(false)}
          >
            <Icon id="kh-plus" />
            List a project
          </Link>
        </div>
      ) : null}
    </header>
  );
}
