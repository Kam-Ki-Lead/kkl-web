"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * A dropdown that shows how many results each option would return.
 *
 * WHY NOT A NATIVE SELECT
 *
 * A native `<select>` cannot carry a count beside each option, and the count
 * is the point: it turns four blind filters into a map of the inventory. The
 * cost is that everything the browser gave us free — the roving focus, the
 * keyboard, the outside click, the accessible name — has to be written. It is
 * written here once and used by all four dropdowns.
 *
 * The pattern is combobox + listbox, not a menu: a trigger with
 * `aria-expanded` and `aria-activedescendant`, a `role="listbox"` panel whose
 * rows are `role="option"` with `aria-selected`. Focus stays on the trigger
 * and the active row is pointed at, which is what a screen reader expects of
 * a value picker.
 *
 * NO JAVASCRIPT
 *
 * A hidden input carries the value, so the bar is still a working GET form
 * with the script stripped out. The trigger is a button, which does nothing
 * without JavaScript — the form still submits, it just submits the defaults.
 */

/**
 * The trigger's look, shared with the Location dropdown.
 *
 * Exported rather than copied so the five fields cannot drift apart. The
 * behaviours differ — Location searches a service, the other four pick from
 * a fixed list with counts — but a bar whose fields look like four siblings
 * and a cousin is the thing that was reported in the first place.
 */
export const TRIGGER_CLASS = [
  "-mx-[8px] flex h-[32px] w-[calc(100%+16px)] cursor-pointer items-center justify-between gap-[6px]",
  "rounded-[10px] border-0 bg-transparent px-[8px] text-left text-[15px] outline-none",
  "focus-visible:bg-brand/[0.07] focus-visible:shadow-[0_0_0_2px_var(--color-brand),0_0_0_5px_rgba(120,65,155,0.2)]",
  "max-[980px]:h-[44px]",
].join(" ");

/** The open-state ring, applied alongside TRIGGER_CLASS. */
export const TRIGGER_OPEN_CLASS =
  "bg-brand/[0.07] shadow-[0_0_0_2px_var(--color-brand),0_0_0_5px_rgba(120,65,155,0.2)]";

/**
 * The bar itself, and one of its fields.
 *
 * Shared because two bars that look alike by coincidence stop looking alike
 * the first time one of them is touched. The homepage's sits on the hero
 * photograph and submits; the search page's sits on the page background and
 * navigates on every change. Everything else about them is the same, and that
 * sameness lives here.
 */
export const BAR_CLASS = [
  "relative flex items-stretch rounded-[999px] bg-white/95 p-[8px]",
  "shadow-[0_8px_24px_rgba(20,10,50,0.18)]",
  "supports-[backdrop-filter:blur(0px)]:bg-white/85 supports-[backdrop-filter:blur(0px)]:backdrop-blur-[14px]",
  "max-[980px]:flex-col max-[980px]:rounded-[22px] max-[980px]:p-[10px]",
].join(" ");

export function barFieldClass(last: boolean): string {
  return [
    "relative flex min-w-0 flex-1 basis-0 flex-col gap-[2px] px-[18px] py-[8px]",
    last ? "" : "border-r border-line",
    "max-[1100px]:px-[12px]",
    "max-[980px]:flex-none max-[980px]:border-r-0 max-[980px]:border-b max-[980px]:border-line",
    "max-[980px]:px-[12px] max-[980px]:py-[10px]",
  ].join(" ");
}

/**
 * The floating panel.
 *
 * Upward by default, because the homepage's bar sits low on the hero and a
 * panel below it would open off the fold. The search page's bar sits at the
 * top of the page, where upward would open off the screen entirely — so it
 * passes `placement="down"`.
 */
export const PANEL_CLASS = [
  "absolute bottom-[calc(100%+14px)] z-30 min-w-[250px] rounded-[14px] border border-line",
  "bg-white p-[6px] shadow-[0_16px_40px_rgba(30,15,60,0.28)]",
  "max-[980px]:static max-[980px]:mt-[10px] max-[980px]:w-auto max-[980px]:min-w-0 max-[980px]:shadow-none",
].join(" ");

export const PANEL_DOWN_CLASS = [
  "absolute top-[calc(100%+14px)] z-30 min-w-[250px] rounded-[14px] border border-line",
  "bg-white p-[6px] shadow-[0_16px_40px_rgba(30,15,60,0.28)]",
  "max-[980px]:static max-[980px]:mt-[10px] max-[980px]:w-auto max-[980px]:min-w-0 max-[980px]:shadow-none",
].join(" ");

export type PanelPlacement = "up" | "down";

/** The panel classes for a placement. */
export function panelClass(placement: PanelPlacement): string {
  return placement === "down" ? PANEL_DOWN_CLASS : PANEL_CLASS;
}

/** One row in a panel. */
export const OPTION_CLASS =
  "flex cursor-pointer items-center justify-between gap-[10px] rounded-[9px] px-[12px] py-[10px] text-[15px] max-[980px]:min-h-[44px]";

export function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`flex-none opacity-60 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
    >
      <path d="m2 4 4 4 4-4" />
    </svg>
  );
}

export type DropdownOption = {
  readonly value: string;
  readonly label: string;
  /** Rows after this one are separated by a rule — used by "Custom range…". */
  readonly separated?: boolean;
  /** `null` draws no pill at all, for a row that has no preset to count. */
  readonly count?: number | null;
};

export function ResultCountDropdown({
  name,
  label,
  value,
  options,
  counts,
  /** The text to show when something non-standard is chosen, e.g. "400–800". */
  displayOverride,
  /** Right-aligns the panel, for the last field in the bar. */
  alignEnd = false,
  /** Which way the panel opens. See PANEL_CLASS. */
  placement = "up",
  onChange,
  children,
}: {
  name: string;
  label: string;
  value: string;
  options: readonly DropdownOption[];
  counts: Record<string, number | null> | null;
  displayOverride?: string;
  alignEnd?: boolean;
  placement?: PanelPlacement;
  onChange: (next: string) => void;
  /** A popover anchored to this field, e.g. the custom range inputs. */
  children?: React.ReactNode;
}) {
  const base = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const labelId = `${base}-l`;
  const valueId = `${base}-v`;
  const panelId = `${base}-p`;
  const optionId = (index: number) => `${base}-o${index}`;

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = Math.max(0, options.findIndex((option) => option.value === value));
  const current = options[selected];
  const display = displayOverride ?? current?.label ?? "";
  const chosen = value !== "";

  /* -- outside click and Escape ------------------------------------------
     Escape is handled on the root, not the window, so a nested popover's own
     Escape handler gets it first. */
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open]);

  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    setOpen(false);
    onChange(option.value);
    triggerRef.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const last = options.length - 1;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        if (!open) {
          setActive(selected);
          setOpen(true);
          return;
        }
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
      case " ":
        event.preventDefault();
        if (!open) {
          setActive(selected);
          setOpen(true);
        } else {
          choose(active);
        }
        return;
      case "Escape":
        if (open) {
          event.preventDefault();
          setOpen(false);
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

      {/* The value the form submits. Present with or without JavaScript. */}
      <input type="hidden" name={name} value={value} readOnly />

      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-labelledby={`${labelId} ${valueId}`}
        aria-activedescendant={open ? optionId(active) : undefined}
        onClick={() => {
          setActive(selected);
          setOpen((was) => !was);
        }}
        onKeyDown={onKeyDown}
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
        <div
          id={panelId}
          role="listbox"
          aria-labelledby={labelId}
          className={[panelClass(placement), alignEnd ? "right-0" : "left-0"].join(" ")}
        >
          {options.map((option, index) => {
            const isSelected = index === selected;
            const count = counts ? counts[option.value === "" ? "any" : option.value] : undefined;
            const zero = count === 0;
            return (
              <div
                key={option.value || "any"}
                id={optionId(index)}
                role="option"
                aria-selected={isSelected}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
                onMouseEnter={() => setActive(index)}
                className={[
                  OPTION_CLASS,
                  option.separated ? "relative mt-[8px] before:absolute before:inset-x-[12px] before:-top-[5px] before:h-[1px] before:bg-line" : "",
                  isSelected
                    ? "bg-brand-mist font-bold text-brand"
                    : index === active
                      ? "bg-tint font-medium text-ink"
                      : "font-medium text-ink",
                  // Dimmed, still selectable: zero today is not zero after the
                  // next filter changes, and an unclickable row is a dead end.
                  zero ? "opacity-55" : "",
                ].join(" ")}
              >
                <span>{option.label}</span>
                {typeof count === "number" ? (
                  <b
                    className={[
                      "rounded-full px-[9px] py-[2px] text-[12px] font-bold",
                      isSelected ? "bg-brand text-white" : "bg-tint text-muted",
                    ].join(" ")}
                  >
                    {count}
                  </b>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {children}
    </div>
  );
}
