"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import { AreaPicker, type AreaOption } from "@/components/location/area-picker";
import {
  BHK_OPTIONS,
  BUDGET_LABELS,
  MODE_OPTIONS,
  QTY_CUSTOM,
  QTY_OPTIONS,
} from "@/lib/domain/property-filters";

/**
 * The hero's search bar — one rounded "glass pill" over the banner.
 *
 * WHAT THE SHAPE IS FOR
 *
 * Five fields separated by hairlines, then the Search button. It replaces a
 * four-field card, and the thing that actually changed is not the radius: the
 * count on the button is now fetched over HTTP and stale requests are
 * cancelled, so the number cannot be overwritten by a slower earlier one.
 *
 * THE RULE THIS CARD KEEPS BREAKING
 *
 * Every control drawn here reaches a filter. The card once carried a "Search
 * type" box that looked like a control and filtered nothing, and the lesson
 * is written up in `property-search-query.ts`. The five fields below map onto
 * exactly the five parameters `property-filters.ts` accepts, and that module
 * is what both endpoints parse with — so a field cannot be added here without
 * the server understanding it.
 *
 * QUANTITY OF LEADS IS NOT A PROPERTY'S PROPERTY
 *
 * It filters on how many buyer leads are currently purchasable in the
 * property's locality. A listing does not own leads and this does not say it
 * does — see the note on `minLeadsAvailable` in types.ts.
 */

/** The bar's five fields, in order. Must match FILTER_PARAMS' spirit. */
const BUDGET_OPTIONS: ReadonlyArray<{ value: string; label: string }> = Object.freeze([
  { value: "", label: "Any budget" },
  ...Object.entries(BUDGET_LABELS).map(([value, label]) => ({ value, label })),
]);

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

/**
 * The query a draft means.
 *
 * Only fields with a value appear — an "any" option sends no parameter at
 * all, so a default search is `/search` and not `/search?mode=&bhk=`.
 */
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
 * Deliberately the same three rules the server applies, in the same order, so
 * the inline message and the 400 can never say different things.
 */
export function customRangeError(draft: Draft): string {
  if (draft.qty !== QTY_CUSTOM) return "";
  const min = draft.qtyMin.trim();
  const max = draft.qtyMax.trim();
  if (!min && !max) return "Enter a min, a max, or both.";
  if ((min && !WHOLE.test(min)) || (max && !WHOLE.test(max))) return "Use whole numbers only.";
  if (min && max && Number(min) > Number(max)) return "Min cannot be more than max.";
  return "";
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
  const [popoverOpen, setPopoverOpen] = useState(false);

  const minRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const error = customRangeError(draft);
  const set = useCallback(
    (patch: Partial<Draft>) => setDraft((previous) => ({ ...previous, ...patch })),
    [],
  );

  /* -- the live count ----------------------------------------------------
     Debounced, and every in-flight request is aborted when the next one
     starts. Without that, a slow early keystroke can land after a fast late
     one and leave the wrong number on the button. */
  const key = toQuery(draft).toString();
  useEffect(() => {
    if (error) return undefined;
    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      fetch(`/api/properties/count?${key}`, { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error(String(response.status));
          return response.json();
        })
        .then((body: { count?: unknown }) => {
          if (typeof body.count === "number") setCount(body.count);
        })
        .catch((cause: unknown) => {
          // An abort is this component replacing its own request, not a
          // failure. Anything else drops the number rather than showing a
          // stale one, and the button still works.
          if (cause instanceof DOMException && cause.name === "AbortError") return;
          setCount(null);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [key, error]);

  useEffect(() => () => abortRef.current?.abort(), []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (error) {
      minRef.current?.focus();
      return;
    }
    const query = toQuery(draft).toString();
    startTransition(() => router.push(query ? `/search?${query}` : "/search"));
  }

  const popoverId = `${base}-qty-pop`;
  const errorId = `${base}-qty-err`;

  return (
    <form
      action="/search"
      method="get"
      noValidate
      onSubmit={submit}
      /* The glass: a translucent surface over the banner, blurred, with the
         shadow doing the lifting. `supports` keeps the surface opaque where
         backdrop-filter is unavailable, so the text never sits on a
         half-transparent background it cannot be read against. */
      className={[
        "relative flex items-stretch rounded-[999px] bg-white/95 p-[8px]",
        "shadow-[0_14px_40px_rgba(20,10,50,0.35)]",
        "supports-[backdrop-filter:blur(0px)]:bg-white/85 supports-[backdrop-filter:blur(0px)]:backdrop-blur-[14px]",
        "max-[980px]:flex-col max-[980px]:rounded-[22px] max-[980px]:p-[10px]",
      ].join(" ")}
    >
      {/*
        The picker brings its own bordered control, which is right everywhere
        else and wrong inside a pill where four fields next to it have no box
        at all. Restyled from here rather than in the component: the filter row
        and the posting forms still want the border.
      */}
      <Field
        className={[
          "flex-[1.3]",
          "[&_input]:h-[28px] [&_input]:min-h-0 [&_input]:rounded-none [&_input]:border-0",
          "[&_input]:bg-transparent [&_input]:px-0 [&_input]:font-medium [&_input]:text-muted",
          "[&_select]:min-h-0 [&_select]:border-0 [&_select]:bg-transparent [&_select]:px-0",
          "max-[980px]:[&_input]:h-[44px]",
        ].join(" ")}
        label="Location"
        htmlFor={`${base}-locality`}
      >
        <AreaPicker
          id={`${base}-locality`}
          name="locality"
          areas={areas}
          value={draft.locality}
          allLabel="All of Kolkata"
          onSelect={(locality) => set({ locality })}
        />
      </Field>

      <Select
        id={`${base}-mode`}
        name="mode"
        label="Buy or rent"
        value={draft.mode}
        options={MODE_OPTIONS}
        onChange={(mode) => set({ mode })}
      />
      <Select
        id={`${base}-bhk`}
        name="bhk"
        label="BHK"
        value={draft.bhk}
        options={BHK_OPTIONS}
        onChange={(bhk) => set({ bhk })}
      />
      <Select
        id={`${base}-budget`}
        name="budget"
        label="Budget"
        value={draft.budget}
        options={BUDGET_OPTIONS}
        onChange={(budget) => set({ budget })}
      />

      <Field label="Quantity of leads" htmlFor={`${base}-qty`} last>
        <select
          id={`${base}-qty`}
          name="qty"
          value={draft.qty}
          aria-controls={popoverOpen ? popoverId : undefined}
          aria-expanded={draft.qty === QTY_CUSTOM ? popoverOpen : undefined}
          onChange={(event) => {
            const qty = event.target.value;
            set({ qty });
            const custom = qty === QTY_CUSTOM;
            setPopoverOpen(custom);
            // Focus moves to Min only once the popover is actually there.
            if (custom) requestAnimationFrame(() => minRef.current?.focus());
          }}
          className={CONTROL}
        >
          {QTY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {draft.qty === QTY_CUSTOM && popoverOpen ? (
          <div
            id={popoverId}
            role="group"
            aria-label="Custom lead quantity"
            /* Upward on desktop so it never falls off the bottom of the
               banner; in flow on a phone, where an anchored popover would
               be pinned over the field it belongs to. */
            className={[
              "absolute right-0 bottom-[calc(100%+14px)] z-20 w-[300px] rounded-[16px]",
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
                invalid={Boolean(error)}
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
                invalid={Boolean(error)}
                describedBy={errorId}
                onChange={(qtyMax) => set({ qtyMax })}
              />
            </div>
            <p id={errorId} aria-live="polite" className="mt-[8px] min-h-[1.2em] text-[12px] text-danger">
              {error}
            </p>
          </div>
        ) : null}
      </Field>

      <button
        type="submit"
        className={[
          "ml-[8px] flex flex-none items-center gap-[8px] rounded-[999px] bg-brand px-[26px]",
          "text-[15px] font-bold text-white hover:bg-brand-deep",
          "max-[980px]:ml-0 max-[980px]:mt-[10px] max-[980px]:h-[50px] max-[980px]:justify-center max-[980px]:rounded-[14px]",
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

/** 44px on touch widths, which is the floor a finger needs. */
const CONTROL =
  "h-[28px] w-full cursor-pointer border-0 bg-transparent p-0 text-[15px] font-medium text-muted " +
  "focus:outline-none max-[980px]:h-[44px]";

function Field({
  label,
  htmlFor,
  children,
  className = "",
  last = false,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
  last?: boolean;
}) {
  return (
    <div
      className={[
        "relative flex min-w-0 flex-1 flex-col gap-[2px] px-[18px] py-[8px]",
        last ? "" : "border-r border-line",
        "max-[1100px]:px-[12px]",
        "max-[980px]:flex-none max-[980px]:border-r-0 max-[980px]:border-b max-[980px]:border-line max-[980px]:px-[12px] max-[980px]:py-[10px]",
        className,
      ].join(" ")}
    >
      <label htmlFor={htmlFor} className="text-[12px] font-bold text-ink">
        {label}
      </label>
      {children}
    </div>
  );
}

function Select({
  id,
  name,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (next: string) => void;
}) {
  return (
    <Field label={label} htmlFor={id}>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={CONTROL}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
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
          "h-[44px] rounded-[10px] border bg-white px-[10px] text-[15px] font-medium text-ink",
          invalid ? "border-danger" : "border-line",
        ].join(" ")}
      />
    </label>
  );
}
