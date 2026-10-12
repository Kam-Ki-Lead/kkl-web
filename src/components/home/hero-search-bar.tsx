"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import type { AreaOption } from "@/components/location/area-picker";
import { LocationDropdown } from "./location-dropdown";
import {
  BAR_CLASS,
  ResultCountDropdown,
  barFieldClass,
  type DropdownOption,
} from "./result-count-dropdown";
import {
  BHK_OPTIONS,
  FACET_KEYS,
  MODE_OPTIONS,
  QTY_CUSTOM,
  QTY_OPTIONS,
  budgetBandsFor,
  type FacetKey,
} from "@/lib/domain/property-filters";

/**
 * The hero's search bar — one rounded "glass pill" over the banner.
 *
 * FIVE FIELDS, ONE WIDTH
 *
 * Every field is `flex: 1 1 0; min-width: 0`. Location used to be wider,
 * which left a gap between it and Buy-or-rent that read as a mistake rather
 * than as emphasis. No field is special now.
 *
 * THE RULE THIS CARD KEEPS BREAKING
 *
 * Every control drawn here reaches a filter. The card once carried a "Search
 * type" box that looked like a control and filtered nothing; the lesson is
 * written up in `property-search-query.ts`. The five fields map onto exactly
 * the parameters `property-filters.ts` accepts, and that module is what both
 * the bar and the endpoints read — so a field cannot be added here without
 * the server understanding it.
 *
 * COUNTS
 *
 * One debounced request to /api/properties/facets feeds the Search button's
 * number and the pill beside every option of every dropdown. Stale requests
 * are aborted, so a slow early keystroke cannot overwrite a fast late one.
 *
 * QUANTITY OF LEADS IS NOT A PROPERTY'S PROPERTY
 *
 * It filters on how many buyer leads are currently purchasable in the
 * property's locality. A listing does not own leads and this does not say it
 * does — see the note on `minLeadsAvailable` in types.ts.
 */

/**
 * The budget options for a mode.
 *
 * A letting's price is monthly, so Rent gets monthly bands. Without that, a
 * ₹32,000/month flat matches "Under ₹50L" along with every other letting in
 * the city, and the filter quietly stops filtering.
 */
function budgetOptionsFor(mode: string): ReadonlyArray<{ value: string; label: string }> {
  const { labels } = budgetBandsFor(mode || undefined);
  return [
    { value: "", label: "Any budget" },
    ...Object.entries(labels).map(([value, label]) => ({ value, label })),
  ];
}

/** Matches the server's rule exactly: whole numbers, at most nine digits. */
const WHOLE = /^\d{1,9}$/;

type Draft = {
  locality: string;
  mode: string;
  bhk: string;
  budget: string;
  qty: string;
  qtyMin: string;
  qtyMax: string;
};

const EMPTY: Draft = { locality: "", mode: "", bhk: "", budget: "", qty: "", qtyMin: "", qtyMax: "" };

type Facets = Record<string, Record<string, number | null>>;

/** The query a draft means. An "any" option sends no parameter at all. */
function toQuery(draft: Draft): URLSearchParams {
  const query = new URLSearchParams();
  if (draft.locality) query.set("locality", draft.locality);
  if (draft.mode) query.set("mode", draft.mode);
  if (draft.bhk) query.set("bhk", draft.bhk);
  if (draft.budget) query.set("budget", draft.budget);
  if (draft.qty) {
    query.set("qty", draft.qty);
    if (draft.qty === QTY_CUSTOM) {
      if (draft.qtyMin.trim()) query.set("qtyMin", draft.qtyMin.trim());
      if (draft.qtyMax.trim()) query.set("qtyMax", draft.qtyMax.trim());
    }
  }
  return query;
}

/**
 * The custom range's error, or "".
 *
 * The same three rules the server applies, in the same order, so the inline
 * message and the 400 can never say different things. `settled` is false
 * while somebody is still typing: an empty pair is incomplete, not wrong, and
 * shouting at a field nobody has filled in yet is the wrong moment.
 */
export function customRangeError(draft: Draft, settled = true): string {
  if (draft.qty !== QTY_CUSTOM) return "";
  const min = draft.qtyMin.trim();
  const max = draft.qtyMax.trim();
  if ((min && !WHOLE.test(min)) || (max && !WHOLE.test(max))) return "Use whole numbers only.";
  if (min && max && Number(min) > Number(max)) return "Min cannot be more than max.";
  if (!min && !max) return settled ? "Enter a min, a max, or both." : "";
  return "";
}

/** What the trigger shows once a custom range is applied. */
export function customRangeLabel(min: string, max: string): string {
  const a = min.trim();
  const b = max.trim();
  if (a && b) return `${a}–${b}`;
  if (a) return `${a}+`;
  if (b) return `Up to ${b}`;
  return "Custom range…";
}

export function HeroSearchBar({
  areas,
  initialCount,
}: {
  /** Every area in the launch city, from the location service (CR05). */
  areas: readonly AreaOption[];
  initialCount: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const base = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [count, setCount] = useState<number | null>(initialCount);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const minRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const liveError = customRangeError(draft, false);
  const shownError = customRangeError(draft, showErrors);
  const set = useCallback(
    (patch: Partial<Draft>) => setDraft((previous) => ({ ...previous, ...patch })),
    [],
  );

  /* -- one request for the button and every pill -------------------------- */
  const key = toQuery(draft).toString();
  useEffect(() => {
    if (liveError) return undefined;
    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      fetch(`/api/properties/facets?${key}`, { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error(String(response.status));
          return response.json();
        })
        .then((body: { total?: unknown; facets?: unknown }) => {
          if (typeof body.total === "number") setCount(body.total);
          if (body.facets && typeof body.facets === "object") setFacets(body.facets as Facets);
        })
        .catch((cause: unknown) => {
          // An abort is this component replacing its own request, not a
          // failure. Anything else hides the pills and the number rather
          // than showing stale ones; the form keeps working.
          if (cause instanceof DOMException && cause.name === "AbortError") return;
          setCount(null);
          setFacets(null);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [key, liveError]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const countsFor = (facet: FacetKey) => (facets ? (facets[facet] ?? null) : null);

  function applyRange() {
    setShowErrors(true);
    if (customRangeError(draft, true)) {
      minRef.current?.focus();
      return;
    }
    setRangeOpen(false);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setShowErrors(true);
    if (customRangeError(draft, true)) {
      setRangeOpen(true);
      minRef.current?.focus();
      return;
    }
    const query = toQuery(draft).toString();
    startTransition(() => router.push(query ? `/search?${query}` : "/search"));
  }

  const errorId = `${base}-qty-err`;
  const qtyOptions: readonly DropdownOption[] = QTY_OPTIONS.map((option) => ({
    ...option,
    separated: option.value === QTY_CUSTOM,
  }));

  return (
    <form
      action="/search"
      method="get"
      noValidate
      onSubmit={submit}
      /* The glass: a translucent surface over the banner, blurred, with the
         shadow doing the lifting. `supports` keeps the surface opaque where
         backdrop-filter is unavailable, so the text never sits on a
         half-transparent background it cannot be read against.

         Shared with the search page's bar — see BAR_CLASS. The shadow is
         softer than the reference's 0 14px 40px / 35%: at that strength it
         read as a dark band under the bar rather than as lift. */
      className={BAR_CLASS}
    >
      <Field last={false}>
        <LocationDropdown
          name="locality"
          label="Location"
          allLabel="All of Kolkata"
          areas={areas}
          value={draft.locality}
          onChange={(locality) => set({ locality })}
        />
      </Field>

      <Field last={false}>
        <ResultCountDropdown
          name="mode"
          label="Buy or rent"
          value={draft.mode}
          options={MODE_OPTIONS}
          counts={countsFor("mode")}
          /* Changing the mode changes what a budget band means, so a band
             chosen on the other scale is cleared rather than carried over as
             a key the server would refuse. */
          onChange={(mode) => set({ mode, budget: "" })}
        />
      </Field>

      <Field last={false}>
        <ResultCountDropdown
          name="bhk"
          label="BHK"
          value={draft.bhk}
          options={BHK_OPTIONS}
          counts={countsFor("bhk")}
          onChange={(bhk) => set({ bhk })}
        />
      </Field>

      <Field last={false}>
        <ResultCountDropdown
          name="budget"
          label="Budget"
          value={draft.budget}
          options={budgetOptionsFor(draft.mode)}
          counts={countsFor("budget")}
          onChange={(budget) => set({ budget })}
        />
      </Field>

      <Field last>
        <ResultCountDropdown
          name="qty"
          label="Quantity of leads"
          value={draft.qty}
          options={qtyOptions}
          counts={countsFor("qty")}
          alignEnd
          displayOverride={
            draft.qty === QTY_CUSTOM ? customRangeLabel(draft.qtyMin, draft.qtyMax) : undefined
          }
          onChange={(qty) => {
            set({ qty });
            const custom = qty === QTY_CUSTOM;
            setRangeOpen(custom);
            setShowErrors(false);
            if (custom) requestAnimationFrame(() => minRef.current?.focus());
          }}
        >
          {draft.qty === QTY_CUSTOM && rangeOpen ? (
            <div
              role="group"
              aria-label="Custom lead quantity"
              onKeyDown={(event) => {
                if (event.key !== "Escape") return;
                event.stopPropagation();
                setRangeOpen(false);
              }}
              className={[
                "absolute right-0 bottom-[calc(100%+14px)] z-30 w-[300px] rounded-[16px]",
                "border border-line bg-white p-[14px] shadow-[0_14px_40px_rgba(20,10,50,0.3)]",
                "max-[980px]:static max-[980px]:mt-[10px] max-[980px]:w-auto max-[980px]:shadow-none",
              ].join(" ")}
            >
              <div className="flex gap-[10px]">
                <NumberField
                  id={`${base}-qty-min`}
                  name="qtyMin"
                  label="Min"
                  placeholder="0"
                  value={draft.qtyMin}
                  invalid={Boolean(shownError)}
                  describedBy={errorId}
                  inputRef={minRef}
                  onChange={(qtyMin) => set({ qtyMin })}
                />
                <NumberField
                  id={`${base}-qty-max`}
                  name="qtyMax"
                  label="Max"
                  placeholder="No limit"
                  value={draft.qtyMax}
                  invalid={Boolean(shownError)}
                  describedBy={errorId}
                  onChange={(qtyMax) => set({ qtyMax })}
                />
              </div>
              <p id={errorId} aria-live="polite" className="mt-[8px] min-h-[1.2em] text-[12px] text-danger">
                {shownError}
              </p>
              <button
                type="button"
                onClick={applyRange}
                className="h-[40px] w-full rounded-[10px] bg-brand text-[15px] font-bold text-white hover:bg-brand-deep"
              >
                Apply
              </button>
            </div>
          ) : null}
        </ResultCountDropdown>
      </Field>

      <button
        type="submit"
        className={[
          "ml-[8px] flex min-w-[170px] flex-none items-center justify-center gap-[8px] rounded-[999px]",
          "bg-brand px-[34px] text-[15px] font-bold text-white hover:bg-brand-deep",
          "max-[1100px]:min-w-[150px] max-[1100px]:px-[26px]",
          "max-[980px]:ml-0 max-[980px]:mt-[10px] max-[980px]:h-[50px] max-[980px]:w-full max-[980px]:rounded-[14px]",
        ].join(" ")}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        Search{count === null ? "" : ` ${count}`}
      </button>

      {/* Announced, not drawn: the button's own text already carries the
          number for anybody who can see it. */}
      <p className="sr-only" aria-live="polite">
        {count === null ? "" : `${count} ${count === 1 ? "property matches" : "properties match"}.`}
      </p>
    </form>
  );
}

/* --------------------------------------------------------------- the parts -- */

/**
 * One slot in the bar.
 *
 * `flex-1 basis-0 min-w-0` on every one of them, with no first-child rule, is
 * what makes the five equal. `min-w-0` is what lets a long value ellipsis
 * instead of pushing its neighbours out of the bar.
 */
function Field({ children, last }: { children: React.ReactNode; last: boolean }) {
  return <div className={barFieldClass(last)}>{children}</div>;
}

function NumberField({
  id,
  name,
  label,
  placeholder,
  value,
  invalid,
  describedBy,
  inputRef,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  value: string;
  invalid: boolean;
  describedBy: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onChange: (next: string) => void;
}) {
  return (
    <label htmlFor={id} className="flex flex-1 flex-col gap-[4px] text-[12px] font-bold text-ink">
      {label}
      <input
        id={id}
        ref={inputRef}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        aria-invalid={invalid ? "true" : "false"}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        className={[
          "h-[42px] rounded-[10px] border bg-white px-[10px] text-[15px] font-medium text-ink",
          invalid ? "border-danger" : "border-line",
        ].join(" ")}
      />
    </label>
  );
}

/** Exported for the tests: the dropdowns the bar draws, in order. */
export const BAR_FACETS: readonly FacetKey[] = FACET_KEYS;
