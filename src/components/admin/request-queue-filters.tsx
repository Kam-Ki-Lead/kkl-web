"use client";

import { useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useHydrated } from "@/lib/use-hydrated";
import { AreaPicker, type AreaOption } from "@/components/location/area-picker";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

/**
 * CR03 — the lead-request queue's area filter.
 *
 * Same contract as the marketplace filter row: a real GET form so the filter
 * lives in the URL, a plain select without JavaScript, and the searchable
 * picker once hydrated. The status filter rides along as a hidden input so
 * changing the area does not reset it.
 */
export function RequestQueueFilters({ areas }: { areas: readonly AreaOption[] }) {
  const params = useSearchParams();
  const form = useRef<HTMLFormElement>(null);
  const enhanced = useHydrated();

  return (
    <form ref={form} method="GET" action="/admin/requests" className="max-w-[360px]">
      {params.get("status") ? (
        <input type="hidden" name="status" value={params.get("status") as string} />
      ) : null}
      <Field id="request-area" label="Area" labelSize="sm">
        <AreaPicker
          id="request-area"
          name="area"
          areas={areas}
          defaultValue={params.get("area") ?? ""}
          allLabel="All areas"
          onSelect={() => {
            if (enhanced) form.current?.requestSubmit();
          }}
        />
      </Field>
      {enhanced ? null : (
        <div className="mt-[8px]">
          <Button type="submit" variant="secondary">
            Apply filter
          </Button>
        </div>
      )}
    </form>
  );
}
