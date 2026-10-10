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
          "-mx-[8px] flex h-[32px] w-[calc(100%+16px)] cursor-pointer items-center justify-between gap-[6px]",
          "rounded-[10px] border-0 bg-transparent px-[8px] text-left text-[15px] outline-none",
          chosen ? "font-semibold text-ink" : "font-medium text-muted",
          // A brand ring rather than the browser's black border, on focus and
          // while open. The halo is what makes it read as deliberate.
          "focus-visible:bg-brand/[0.07] focus-visible:shadow-[0_0_0_2px_var(--color-brand),0_0_0_5px_rgba(120,65,155,0.2)]",
          open ? "bg-brand/[0.07] shadow-[0_0_0_2px_var(--color-brand),0_0_0_5px_rgba(120,65,155,0.2)]" : "",
          "max-[980px]:h-[44px]",
        ].join(" ")}
      >
        <span id={valueId} className="overflow-hidden text-ellipsis whitespace-nowrap">
          {display}
        </span>
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
      </button>

      {open ? (
        <div
          id={panelId}
          role="listbox"
          aria-labelledby={labelId}
          className={[
            "absolute bottom-[calc(100%+14px)] z-30 min-w-[250px] rounded-[14px] border border-line",
            "bg-white p-[6px] shadow-[0_16px_40px_rgba(30,15,60,0.28)]",
            alignEnd ? "right-0" : "left-0",
            // Below 980 the bar is a stack, so a floating panel would cover
            // the next field. It expands in flow instead.
            "max-[980px]:static max-[980px]:mt-[10px] max-[980px]:w-auto max-[980px]:min-w-0 max-[980px]:shadow-none",
          ].join(" ")}
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
                  "flex cursor-pointer items-center justify-between gap-[10px] rounded-[9px] px-[12px] py-[10px] text-[15px]",
                  option.separated ? "relative mt-[8px] before:absolute before:inset-x-[12px] before:-top-[5px] before:h-[1px] before:bg-line" : "",
                  isSelected
                    ? "bg-brand-mist font-bold text-brand"
                    : index === active
                      ? "bg-tint font-medium text-ink"
                      : "font-medium text-ink",
                  // Dimmed, still selectable: zero today is not zero after the
                  // next filter changes, and an unclickable row is a dead end.
                  zero ? "opacity-55" : "",
                  "max-[980px]:min-h-[44px]",
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
