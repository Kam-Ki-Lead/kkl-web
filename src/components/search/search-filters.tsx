"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AreaPicker, type AreaOption } from "@/components/location/area-picker";
import { FilterChip } from "@/components/ui/chip";

/**
 * P-02 filters.
 *
 * All filter state lives in the URL, so back and forward work, a filtered result
 * set is shareable, and a reload does not silently drop what the person chose.
 *
 * "Applied filters are always visible as removable chips, so nothing silently
 * narrows a result set" — C-05.
 */

const TYPES = ["Any type", "Apartment", "Villa", "Plot", "Commercial"];
const BHK = ["Any BHK", "1 BHK", "2 BHK", "3 BHK", "4 BHK"];
const BUDGETS: ReadonlyArray<{ label: string; min?: number; max?: number }> = [
  { label: "Any budget" },
  { label: "Up to ₹50L", max: 5_000_000 },
  { label: "Up to ₹1Cr", max: 10_000_000 },
  { label: "Up to ₹1.5Cr", max: 15_000_000 },
  { label: "₹1.5Cr and above", min: 15_000_000 },
];
const POSSESSION: ReadonlyArray<{ key: string; label: string }> = [
  { key: "ready", label: "Ready to move" },
  { key: "under_construction", label: "Under construction" },
  { key: "new_launch", label: "New launch" },
];

export function SearchFilters({ areas }: { areas: readonly AreaOption[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const current = {
    locality: params.get("locality") ?? "",
    type: params.get("type") ?? "Any type",
    bhk: params.get("bhk") ?? "",
    budget: params.get("budget") ?? "Any budget",
    possession: params.get("possession") ?? "",
  };

  function update(next: Partial<typeof current>) {
    const merged = { ...current, ...next };
    const q = new URLSearchParams();
    if (merged.locality) q.set("locality", merged.locality);
    if (merged.type && merged.type !== "Any type") q.set("type", merged.type);
    if (merged.bhk) q.set("bhk", merged.bhk);
    if (merged.budget && merged.budget !== "Any budget") q.set("budget", merged.budget);
    if (merged.possession) q.set("possession", merged.possession);
    router.push(q.size ? `/search?${q}` : "/search");
  }

  const localityName =
    areas.find((l) => l.id === current.locality)?.label ?? null;

  const appliedChips: ReadonlyArray<{ label: string; clear: Partial<typeof current> }> = [
    ...(current.type !== "Any type"
      ? [{ label: current.type, clear: { type: "Any type" } }]
      : []),
    ...(current.bhk ? [{ label: `${current.bhk} BHK`, clear: { bhk: "" } }] : []),
    ...(current.budget !== "Any budget"
      ? [{ label: current.budget, clear: { budget: "Any budget" } }]
      : []),
    ...(current.possession
      ? [
          {
            label:
              POSSESSION.find((p) => p.key === current.possession)?.label ?? current.possession,
            clear: { possession: "" },
          },
        ]
      : []),
  ];

  return (
    <div>
      <div className="grid grid-cols-4 gap-[14px] max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
        <Field id="f-locality" label="Location">
          {/* Searchable over the launch city's area records (CR05); the URL
              carries the record id. */}
          <AreaPicker
            id="f-locality"
            name="locality"
            areas={areas}
            value={current.locality}
            allLabel="All of Kolkata"
            onSelect={(id) => update({ locality: id })}
          />
        </Field>

        <Field id="f-type" label="Property type">
          <select
            id="f-type"
            value={current.type}
            onChange={(e) => update({ type: e.target.value })}
            className={selectClass}
          >
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>

        <Field id="f-bhk" label="BHK">
          <select
            id="f-bhk"
            value={current.bhk}
            onChange={(e) => update({ bhk: e.target.value })}
            className={selectClass}
          >
            {BHK.map((b) => (
              <option key={b} value={b === "Any BHK" ? "" : b.replace(/\D/g, "")}>
                {b}
              </option>
            ))}
          </select>
        </Field>

        <Field id="f-budget" label="Budget">
          <select
            id="f-budget"
            value={current.budget}
            onChange={(e) => update({ budget: e.target.value })}
            className={selectClass}
          >
            {BUDGETS.map((b) => (
              <option key={b.label}>{b.label}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-[14px] flex flex-wrap items-center gap-[10px]">
        <span className="text-[14px] text-muted">Possession:</span>
        {POSSESSION.map((p) => {
          const on = current.possession === p.key;
          return (
            <button
              key={p.key}
              type="button"
              aria-pressed={on}
              onClick={() => update({ possession: on ? "" : p.key })}
              className={`min-h-[44px] rounded-full border-[1.5px] px-[16px] text-[14px] font-semibold ${
                on
                  ? "border-brand bg-brand text-white"
                  : "border-control-border bg-white text-body"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="mt-[14px] flex flex-wrap items-center gap-[10px] rounded-[10px] border border-line bg-tint px-[16px] py-[12px]">
        <span className="t-label text-body">Applied:</span>
        {appliedChips.length === 0 ? (
          <span className="t-caption text-muted">
            {localityName ? "No filters beyond location" : "No filters applied"}
          </span>
        ) : (
          appliedChips.map((chip) => (
            <FilterChip key={chip.label} label={chip.label} onRemove={() => update(chip.clear)} />
          ))
        )}
        {appliedChips.length > 0 || current.locality ? (
          <button
            type="button"
            onClick={() => router.push("/search")}
            className="ml-auto text-[15px] font-semibold text-brand underline underline-offset-2 hover:text-brand-deep"
          >
            Reset all
          </button>
        ) : null}
      </div>
    </div>
  );
}

const selectClass =
  "min-h-[48px] w-full cursor-pointer rounded-[8px] border border-control-border bg-white px-[13px] text-[15px] text-ink";

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  /* P-02 renders these labels at 13px where P-01 renders the same role at
     14px — an inconsistency inside the approved baseline, recorded in
     visual-differences.md. The 14px step is kept; the colour is the defect
     (body #2A3250, not ink). */
  return (
    <div className="flex flex-col gap-[6px]">
      <label htmlFor={id} className="t-label text-body">
        {label}
      </label>
      {children}
    </div>
  );
}

/** The sort control — a segmented set, as approved, not a select. */
export function SearchSort() {
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get("sort") ?? "relevance";

  const options: ReadonlyArray<{ key: string; label: string }> = [
    { key: "relevance", label: "Relevance" },
    { key: "price_asc", label: "Price: low to high" },
    { key: "price_desc", label: "Price: high to low" },
  ];

  function choose(key: string) {
    const q = new URLSearchParams(params.toString());
    if (key === "relevance") q.delete("sort");
    else q.set("sort", key);
    router.push(q.size ? `/search?${q}` : "/search");
  }

  return (
    <div className="flex flex-wrap items-center gap-[8px]">
      <span className="text-[14px] text-muted">Sort</span>
      {options.map((o) => {
        const on = active === o.key;
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={on}
            onClick={() => choose(o.key)}
            className={`min-h-[44px] rounded-[8px] border-[1.5px] px-[14px] text-[14px] font-semibold ${
              on
                ? "border-brand bg-[#EEF2FD] text-brand"
                : "border-control-border bg-white text-body"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
