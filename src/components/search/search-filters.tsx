"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { AreaOption } from "@/components/location/area-picker";
import { FilterChip } from "@/components/ui/chip";
import { LocationDropdown } from "@/components/home/location-dropdown";
import {
  BAR_CLASS,
  ResultCountDropdown,
  barFieldClass,
  type DropdownOption,
} from "@/components/home/result-count-dropdown";

/**
 * P-02 filters.
 *
 * All filter state lives in the URL, so back and forward work, a filtered result
 * set is shareable, and a reload does not silently drop what the person chose.
 *
 * "Applied filters are always visible as removable chips, so nothing silently
 * narrows a result set" — C-05.
 */

/* The same values this page has always filtered on, in the shape the shared
   dropdown takes. "" is the unset row in every one of them, which is what the
   bar draws in muted type until something is chosen. */
const TRANSACTION_OPTIONS: readonly DropdownOption[] = [
  { value: "", label: "Buy or rent", count: null },
  { value: "sale", label: "Buy", count: null },
  { value: "rent", label: "Rent", count: null },
];
const TYPE_OPTIONS: readonly DropdownOption[] = [
  { value: "", label: "Any type", count: null },
  ...["Apartment", "Villa", "Plot", "Commercial"].map((label) => ({ value: label, label, count: null })),
];
const BHK_OPTIONS: readonly DropdownOption[] = [
  { value: "", label: "Any BHK", count: null },
  ...["1", "2", "3", "4"].map((n) => ({ value: n, label: `${n} BHK`, count: null })),
];
const BUDGET_OPTIONS: readonly DropdownOption[] = [
  { value: "", label: "Any budget", count: null },
  ...["Up to ₹50L", "Up to ₹1Cr", "Up to ₹1.5Cr", "₹1.5Cr and above"].map((label) => ({
    value: label,
    label,
    count: null,
  })),
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
    // "" is no preference, which is not the same as either value.
    transaction: params.get("transaction") ?? "",
  };

  function update(next: Partial<typeof current>) {
    const merged = { ...current, ...next };
    const q = new URLSearchParams();
    if (merged.locality) q.set("locality", merged.locality);
    if (merged.type && merged.type !== "Any type") q.set("type", merged.type);
    if (merged.bhk) q.set("bhk", merged.bhk);
    if (merged.budget && merged.budget !== "Any budget") q.set("budget", merged.budget);
    if (merged.possession) q.set("possession", merged.possession);
    if (merged.transaction) q.set("transaction", merged.transaction);
    router.push(q.size ? `/search?${q}` : "/search");
  }

  const appliedChips: ReadonlyArray<{ label: string; clear: Partial<typeof current> }> = [
    ...(current.transaction
      ? [{
        label: current.transaction === "rent" ? "To rent" : "To buy",
        clear: { transaction: "" },
      }]
      : []),
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

  const dropdown = (
    name: string,
    label: string,
    value: string,
    options: readonly DropdownOption[],
    onChange: (next: string) => void,
    alignEnd = false,
  ) => (
    <ResultCountDropdown
      name={name}
      label={label}
      value={value}
      options={options}
      /* No counts here. The homepage's bar can afford a facet request per
         keystroke because it is one request for the whole page; this bar
         changes the result set on every choice, so a count beside each option
         would be a second round trip for a number the results below already
         show. */
      counts={null}
      /* A value the URL carries that this list does not hold — "Projects"
         links here with `type=project` — is shown as it is rather than read
         as unset. The field and the applied chip then say the same thing;
         before this the field said "Any type" beside a chip saying
         "project". */
      displayOverride={
        value !== "" && !options.some((o) => o.value === value) ? value : undefined
      }
      alignEnd={alignEnd}
      placement="down"
      onChange={onChange}
    />
  );

  return (
    <div>
      {/* The same bar as the homepage's — see BAR_CLASS. It navigates on every
          change rather than submitting, so it is a div with no button, but a
          person moving between the two should not notice a different control
          set. */}
      <div className={BAR_CLASS}>
        <div className={barFieldClass(false)}>
          <LocationDropdown
            name="locality"
            label="Location"
            allLabel="All of Kolkata"
            areas={areas}
            value={current.locality}
            placement="down"
            onChange={(locality) => update({ locality })}
          />
        </div>

        <div className={barFieldClass(false)}>
          {dropdown("transaction", "Buy or rent", current.transaction, TRANSACTION_OPTIONS,
            (transaction) => update({ transaction }))}
        </div>

        <div className={barFieldClass(false)}>
          {dropdown("type", "Property type", current.type === "Any type" ? "" : current.type,
            TYPE_OPTIONS, (type) => update({ type: type || "Any type" }))}
        </div>

        <div className={barFieldClass(false)}>
          {dropdown("bhk", "BHK", current.bhk, BHK_OPTIONS, (bhk) => update({ bhk }))}
        </div>

        <div className={barFieldClass(true)}>
          {dropdown("budget", "Budget", current.budget === "Any budget" ? "" : current.budget,
            BUDGET_OPTIONS, (budget) => update({ budget: budget || "Any budget" }), true)}
        </div>
      </div>

      <div className="mt-[16px] flex flex-wrap items-center gap-[10px]">
        <span className="text-[14px] font-semibold text-muted">Possession</span>
        {POSSESSION.map((p) => {
          const on = current.possession === p.key;
          return (
            <button
              key={p.key}
              type="button"
              aria-pressed={on}
              onClick={() => update({ possession: on ? "" : p.key })}
              className={[
                "min-h-[44px] rounded-full border px-[16px] text-[14px] font-semibold",
                "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-saffron",
                on
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-white text-ink hover:border-brand",
              ].join(" ")}
            >
              {p.label}
            </button>
          );
        })}

        {/* C-05: applied filters stay visible, and removable, so nothing
            narrows the results without saying so. On the same line as the
            possession pills now — a separate panel for "No filters applied"
            was a box that said nothing. */}
        {appliedChips.length > 0 ? (
          <>
            <span aria-hidden="true" className="h-[24px] w-[1px] bg-line" />
            {appliedChips.map((chip) => (
              <FilterChip key={chip.label} label={chip.label} onRemove={() => update(chip.clear)} />
            ))}
          </>
        ) : null}

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
                ? "border-brand bg-chip-neutral-bg text-brand"
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
