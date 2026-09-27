"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useHydrated } from "@/lib/use-hydrated";
import { Select } from "@/components/ui/field";

export type AreaOption = {
  /** The location-record id — the value that is stored and submitted (CR05). */
  readonly id: string;
  /** Pre-composed display label, e.g. "Action Area I, New Town". */
  readonly label: string;
};

/**
 * Searchable locality selection (CR05).
 *
 * The records come from the location service; this component never carries a
 * list of its own. What it renders is a combobox: type to narrow the areas,
 * arrows and Enter to choose, Escape to revert. The submitted value is always
 * the record id, carried in a hidden input, never the typed text.
 *
 * Without JavaScript the combobox cannot work, so the server render is a plain
 * select over the same records — the form still submits the id. The select is
 * stood down once hydration completes, the same contract the filter rows use.
 */
export function AreaPicker({
  id,
  name,
  areas,
  defaultValue = "",
  value,
  allLabel,
  onSelect,
}: {
  id: string;
  name: string;
  areas: readonly AreaOption[];
  /** Initial selection for uncontrolled use (a record id). */
  defaultValue?: string;
  /** Selection for controlled use; when set, the parent owns it. */
  value?: string;
  /** The empty choice's label, e.g. "All of Kolkata". Omitted, a choice is required. */
  allLabel?: string;
  onSelect?: (id: string) => void;
}) {
  const enhanced = useHydrated();
  const [inner, setInner] = useState(defaultValue);
  const selectedId = value !== undefined ? value : inner;

  if (!enhanced) {
    return (
      <Select id={id} name={name} defaultValue={selectedId}>
        {allLabel !== undefined ? <option value="">{allLabel}</option> : null}
        {areas.map((a) => (
          <option key={a.id} value={a.id}>
            {a.label}
          </option>
        ))}
      </Select>
    );
  }

  return (
    <Combobox
      id={id}
      name={name}
      areas={areas}
      allLabel={allLabel}
      selectedId={selectedId}
      onChoose={(id) => {
        setInner(id);
        onSelect?.(id);
      }}
    />
  );
}

function Combobox({
  id,
  name,
  areas,
  allLabel,
  selectedId,
  onChoose,
}: {
  id: string;
  name: string;
  areas: readonly AreaOption[];
  allLabel?: string;
  selectedId: string;
  onChoose: (id: string) => void;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);

  const selectedLabel =
    selectedId === ""
      ? (allLabel ?? "")
      : (areas.find((a) => a.id === selectedId)?.label ?? "");

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(selectedLabel);
  const [activeIndex, setActiveIndex] = useState(0);
  // Set when an option's pointer-down chose before the input's blur ran, so
  // the blur does not revert the text to the previous selection.
  const choseOnPointerDown = useRef(false);
  // The label of the most recent choice, until the selection state catches up
  // (a controlled parent may update via a URL change, which is not immediate).
  const chosenLabel = useRef<string | null>(null);

  // The visible options: name matches, with the empty choice first — but only
  // while the query is empty; "All areas" is not an answer to "rajar".
  const q = query.trim().toLowerCase();
  // Ranked, not merely filtered. Labels are "<area>, <parent>", so a substring
  // match on "new town" hits the three Action Areas — whose labels end in it —
  // as well as New Town itself. Unordered, the first of those was highlighted,
  // so typing a locality's own name and pressing Enter selected one of its
  // sub-localities instead. Anything the query starts sorts ahead of anything
  // that merely contains it, and an exact label ahead of that.
  const matches = areas
    .filter((a) => a.label.toLowerCase().includes(q))
    .map((a) => {
      const label = a.label.toLowerCase();
      const rank = label === q ? 0 : label.startsWith(q) ? 1 : 2;
      return { area: a, rank };
    })
    .sort((x, y) => x.rank - y.rank || x.area.label.localeCompare(y.area.label))
    .map((m) => m.area);
  const options: readonly AreaOption[] =
    allLabel !== undefined && q === "" ? [{ id: "", label: allLabel }, ...matches] : matches;

  // Keep the text in step when the selection changes from outside. A label
  // just chosen stays on screen until the selection state catches up with it.
  useEffect(() => {
    if (open) return;
    if (chosenLabel.current !== null) {
      if (selectedLabel === chosenLabel.current) chosenLabel.current = null;
      return;
    }
    setQuery(selectedLabel);
  }, [selectedLabel, open]);

  // Close on a pointer-down outside the combobox.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery(selectedLabel);
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, selectedLabel]);

  function choose(option: AreaOption) {
    // Write the hidden input directly as well as through state: a form
    // submitted from the onChoose callback (the filter rows auto-submit) reads
    // the DOM, and React has not flushed the state update by then.
    if (hiddenRef.current) hiddenRef.current.value = option.id;
    choseOnPointerDown.current = true;
    const label = option.id === "" ? (allLabel ?? "") : option.label;
    chosenLabel.current = label;
    setQuery(label);
    setOpen(false);
    onChoose(option.id);
  }

  return (
    <div ref={rootRef} className="relative">
      <input ref={hiddenRef} type="hidden" name={name} value={selectedId} />
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={allLabel ?? "Type an area name"}
        value={query}
        onFocus={() => {
          setOpen(true);
          setActiveIndex(0);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (!open) {
              setOpen(true);
              return;
            }
            const delta = e.key === "ArrowDown" ? 1 : -1;
            setActiveIndex((i) => Math.min(Math.max(i + delta, 0), options.length - 1));
          } else if (e.key === "Enter") {
            if (open && options.length > 0) {
              // Enter chooses the highlighted area; it must not submit the
              // form around the combobox with a half-typed name.
              e.preventDefault();
              choose(options[Math.min(activeIndex, options.length - 1)]!);
            }
          } else if (e.key === "Escape") {
            setOpen(false);
            setQuery(selectedLabel);
          }
        }}
        onBlur={() => {
          // A click on an option is a pointer-down (which chose) followed by
          // this blur; only an untouched blur reverts the text.
          setOpen(false);
          if (choseOnPointerDown.current) {
            choseOnPointerDown.current = false;
            return;
          }
          setQuery(selectedLabel);
        }}
        className="min-h-[48px] w-full rounded-[8px] border border-control-border bg-white px-[13px] text-[15px] text-ink placeholder:text-[#9AA2B8]"
      />
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Areas"
          className="absolute z-20 mt-[4px] max-h-[260px] w-full overflow-auto rounded-[8px] border border-control-border bg-white py-[4px] shadow-[0_8px_28px_rgba(16,26,64,0.14)]"
        >
          {options.length === 0 ? (
            <li className="px-[13px] py-[10px] text-[14px] text-muted">
              No area matches — check the spelling
            </li>
          ) : (
            options.map((option, index) => (
              <li
                key={option.id || "__all__"}
                role="option"
                aria-selected={option.id === selectedId}
                onPointerDown={(e) => {
                  // Pointer-down, not click: it must run before the input's blur.
                  e.preventDefault();
                  choose(option);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={`cursor-pointer px-[13px] py-[10px] text-[15px] ${
                  index === activeIndex ? "bg-tint text-ink" : "text-body"
                } ${option.id === selectedId ? "font-semibold" : ""}`}
              >
                {option.label}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
