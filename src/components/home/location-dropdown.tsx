"use client";

import { useEffect, useId, useRef, useState } from "react";
import { searchAreas } from "@/app/actions/locations";
import {
  AREA_QUERY_MIN,
  areaLabel,
  areaOptionsFor,
  mergeAreas,
  type Area,
} from "@/lib/domain/area-search";
import {
  Chevron,
  OPTION_CLASS,
  TRIGGER_CLASS,
  TRIGGER_OPEN_CLASS,
  panelClass,
  type PanelPlacement,
} from "./result-count-dropdown";

/**
 * The bar's Location field: a dropdown, with a search inside it.
 *
 * WHY THIS IS NOT THE SHARED AreaPicker
 *
 * `AreaPicker` is a type-ahead: the field itself is the text input. That is
 * right on the filter row and the posting forms, where it sits among other
 * text inputs. In the bar it was the odd one out — four fields that open a
 * panel and one that looks like a label — and it read as static text rather
 * than something you could change.
 *
 * So the bar gets a trigger and a panel like its neighbours, with the search
 * box inside the panel. The picker is untouched; the three screens that use
 * it are unaffected.
 *
 * WHAT IS SHARED
 *
 * The look, through the constants in `result-count-dropdown`, and the
 * ranking, through `area-search`. Those are the two things that would be
 * noticed if they diverged: a field that looks wrong next to its neighbours,
 * and the same query putting a different area first in two places.
 *
 * NO COUNTS HERE
 *
 * The other four dropdowns carry result counts. Location does not, because
 * the facets endpoint does not compute one per locality — it would be a count
 * for every area in the city on every keystroke. Drawing an empty pill would
 * be worse than drawing none.
 *
 * NO JAVASCRIPT
 *
 * A hidden input carries the chosen id, so the bar is still a working GET
 * form with the script stripped out.
 */

export function LocationDropdown({
  name,
  label,
  allLabel,
  areas,
  value,
  placement = "up",
  onChange,
}: {
  name: string;
  label: string;
  /** The empty choice's label, e.g. "All of Kolkata". */
  allLabel: string;
  /** The preloaded page of areas under the launch city (CR05). */
  areas: readonly Area[];
  /** A location-record id, or "" for the whole city. */
  value: string;
  /** Which way the panel opens. See PANEL_CLASS in result-count-dropdown. */
  placement?: PanelPlacement;
  onChange: (next: string) => void;
}) {
  const base = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const labelId = `${base}-l`;
  const valueId = `${base}-v`;
  const panelId = `${base}-p`;
  const searchId = `${base}-q`;
  const optionId = (index: number) => `${base}-o${index}`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeRaw, setActive] = useState(0);
  /**
   * What the service returned, carried with the query it answers.
   *
   * Used only while it still matches what is typed, so an answer to an older
   * query is ignored rather than allowed to stand in for the current one.
   */
  const [found, setFound] = useState<{ q: string; rows: readonly Area[] }>({ q: "", rows: [] });

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const typed = query.trim();
  const pool = mergeAreas(areas, found.q === typed ? found.rows : []);
  const options = areaOptionsFor(pool, query, allLabel);
  /* The list narrows as somebody types, so the stored pointer can outrun it.
     Clamped on read rather than corrected in an effect: there is no render
     where it points past the end, and no extra pass to get there. */
  const active = Math.min(activeRaw, Math.max(0, options.length - 1));
  const display = areaLabel(value, pool, allLabel) || allLabel;
  const chosen = value !== "";

  /* -- ask the service for what is being typed ---------------------------
     The preloaded page is the first hundred areas; Kolkata has more. Without
     this, a locality past the hundredth is unreachable and the panel says
     "No area matches" — a wrong answer rather than a slow one. Debounced,
     and abandoned on the next keystroke. A failure keeps the preloaded page
     on screen and invents nothing. */
  useEffect(() => {
    if (!open || typed.length < AREA_QUERY_MIN) return undefined;
    let live = true;
    const timer = setTimeout(() => {
      searchAreas(typed)
        .then((rows) => {
          if (live) setFound({ q: typed, rows });
        })
        .catch(() => {
          /* The preloaded page is still on screen. */
        });
    }, 150);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [typed, open]);

  /* -- outside click ------------------------------------------------------ */
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open]);

  /* -- the search box takes focus when the panel opens -------------------- */
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  function openPanel() {
    setQuery("");
    setActive(0);
    setOpen(true);
  }

  function close(restoreFocus: boolean) {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }

  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(option.id);
    close(true);
  }

  /** The keyboard, shared by the trigger and the search box. */
  function navigate(event: React.KeyboardEvent) {
    const last = options.length - 1;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        if (!open) {
          openPanel();
          return;
        }
        if (options.length === 0) return;
        const step = event.key === "ArrowDown" ? 1 : last;
        setActive((index) => (index + step) % options.length);
        return;
      }
      case "Home":
        if (open) {
          event.preventDefault();
          setActive(0);
        }
        return;
      case "End":
        if (open) {
          event.preventDefault();
          setActive(last);
        }
        return;
      case "Enter":
        event.preventDefault();
        if (!open) openPanel();
        else choose(active);
        return;
      case "Escape":
        if (open) {
          event.preventDefault();
          close(true);
        }
        return;
      default:
    }
  }

  return (
    <div ref={rootRef} className="relative flex min-w-0 flex-1 flex-col gap-[2px]">
      <span id={labelId} className="text-[12px] font-bold text-ink">
        {label}
      </span>

      {/* The value the form submits — a record id, never the typed text. */}
      <input type="hidden" name={name} value={value} readOnly />

      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-labelledby={`${labelId} ${valueId}`}
        onClick={() => (open ? close(false) : openPanel())}
        onKeyDown={(event) => {
          // Space opens, like the other four. It is not passed to navigate,
          // which the search box also uses and where a space is a space.
          if (event.key === " ") {
            event.preventDefault();
            if (!open) openPanel();
            return;
          }
          navigate(event);
        }}
        className={[
          TRIGGER_CLASS,
          chosen ? "font-semibold text-ink" : "font-medium text-muted",
          open ? TRIGGER_OPEN_CLASS : "",
        ].join(" ")}
      >
        <span id={valueId} className="overflow-hidden text-ellipsis whitespace-nowrap">
          {display}
        </span>
        <Chevron open={open} />
      </button>

      {open ? (
        <div className={[panelClass(placement), "left-0"].join(" ")}>
          <label htmlFor={searchId} className="sr-only">
            Search areas in Kolkata
          </label>
          <input
            id={searchId}
            ref={searchRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={panelId}
            aria-autocomplete="list"
            aria-activedescendant={options.length ? optionId(active) : undefined}
            autoComplete="off"
            placeholder="Search a locality"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={navigate}
            className={[
              "mb-[6px] h-[40px] w-full rounded-[10px] border border-line bg-white px-[10px]",
              "text-[15px] font-medium text-ink outline-none",
              "focus-visible:shadow-[0_0_0_2px_var(--color-brand),0_0_0_5px_rgba(120,65,155,0.2)]",
            ].join(" ")}
          />

          <div id={panelId} role="listbox" aria-labelledby={labelId} className="max-h-[260px] overflow-auto">
            {options.length === 0 ? (
              <p className="px-[12px] py-[10px] text-[14px] text-muted">
                No area matches — check the spelling.
              </p>
            ) : (
              options.map((option, index) => {
                const isSelected = option.id === value;
                return (
                  <div
                    key={option.id || "all"}
                    id={optionId(index)}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(index)}
                    onMouseEnter={() => setActive(index)}
                    className={[
                      OPTION_CLASS,
                      isSelected
                        ? "bg-brand-mist font-bold text-brand"
                        : index === active
                          ? "bg-tint font-medium text-ink"
                          : "font-medium text-ink",
                    ].join(" ")}
                  >
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                      {option.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
