import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageNav } from "@/components/admin/page-nav";
import { Card } from "@/components/ui/card";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { StateMessage } from "@/components/ui/states";
import { capabilityVerdict, propertyListKind } from "@/lib/services/backend/admin-queue-reading";
import {
  loadModeratedProperties,
  selectedPropertyFilter,
} from "@/lib/services/backend/admin-queues";
import { pageOffset } from "@/lib/services/backend/staff-views";

const FILTERS = [
  { label: "Reported", value: "reported" },
  { label: "Published", value: "published" },
  { label: "Unpublished by staff", value: "unpublished" },
  { label: "All live", value: "all" },
] as const;

const STATE: Record<string, { label: string; tone: ChipTone }> = {
  published: { label: "Published", tone: "success" },
  unpublished: { label: "Unpublished", tone: "muted" },
};

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/** Published and unpublished listings. Owner submissions are not rendered here. */
export async function BackendPropertyQueue({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter = selectedPropertyFilter(one(params.filter) || "published");
  const offset = pageOffset(one(params.offset));
  const loaded = await loadModeratedProperties(filter, offset);

  return (
    <AdminShell title="Property review" subtitle="Published listings and staff takedowns">
      <div className="flex max-w-[900px] flex-col gap-[12px]">
        <div className="flex flex-wrap gap-[8px]">
          {FILTERS.map((option) => {
            const active = option.value === filter;
            return (
              <Link
                key={option.value}
                href={`/admin/properties?filter=${option.value}`}
                aria-current={active ? "true" : undefined}
                className={`min-h-[40px] rounded-full border-[1.5px] px-[14px] py-[9px] text-[14px] font-semibold transition-[background-color,border-color,color] duration-150 ${
                  active
                    ? "border-brand bg-brand text-white"
                    : "border-line bg-white text-body hover:border-[#C6CCE0]"
                }`}
              >
                {option.label}
              </Link>
            );
          })}
        </div>

        {loaded.ok ? <QueueBody page={loaded.value} /> : (
          <StateMessage tone="error" title="Property review could not be loaded">
            {loaded.message}
          </StateMessage>
        )}
      </div>
    </AdminShell>
  );
}

function QueueBody({
  page,
}: {
  page: Awaited<ReturnType<typeof loadModeratedProperties>> extends infer R
    ? R extends { ok: true; value: infer V }
      ? V
      : never
    : never;
}) {
  const kind = propertyListKind(page);
  const window = {
    total: page.total,
    offset: page.offset,
    limit: page.limit,
    returned: page.listings.length,
  };

  return (
    <>
      <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[16px]">
        <h2 className="t-card-title text-warning">
          {capabilityVerdict(page.reports) === "unavailable"
            ? "Reporting is unavailable"
            : "Reporting is available"}
        </h2>
        <p className="t-body mt-[6px] text-body">{page.reports.message}</p>
        <p className="t-caption mt-[8px] text-muted">
          {page.publication.message} This queue does not publish or republish a listing.
        </p>
      </Card>

      {kind.kind === "reports-unavailable" ? (
        <StateMessage title="Reporting is unavailable">{kind.message}</StateMessage>
      ) : null}

      {kind.kind === "past-end" ? (
        <>
          <PageNav
            pathname="/admin/properties"
            page={window}
            noun="listings"
            extra={{ filter: page.filter }}
          />
          <StateMessage title="This page is past the end">
            {page.total} {page.total === 1 ? "listing matches" : "listings match"} this filter.
            This offset has none of them.
          </StateMessage>
        </>
      ) : null}

      {kind.kind === "empty" ? (
        <StateMessage title={kind.title}>{kind.body}</StateMessage>
      ) : null}

      {kind.kind === "rows" ? (
        <>
          <PageNav
            pathname="/admin/properties"
            page={window}
            noun="listings"
            extra={{ filter: page.filter }}
          />
          <div className="flex flex-col gap-[10px]">
            {page.listings.map((listing) => {
              const chip = STATE[listing.state] ?? STATE.published!;
              return (
                <Link key={listing.id} href={`/admin/properties/${listing.id}`}>
                  <Card className="p-[18px] transition-[border-color] duration-150 hover:border-brand">
                    <div className="flex flex-wrap items-start justify-between gap-[12px]">
                      <div className="min-w-0">
                        <span className="flex flex-wrap items-baseline gap-[9px]">
                          <span className="t-mono text-[13px] text-muted">{listing.reference}</span>
                          <span className="font-[family-name:var(--font-heading)] text-[16px] font-bold text-ink">
                            {listing.name ?? "Untitled listing"}
                          </span>
                        </span>
                        <span className="t-body mt-[2px] block text-body">
                          {listing.accountName ?? "Account name not recorded"} · {listing.postedAs}
                          {listing.locality ? ` · ${listing.locality}` : ""}
                        </span>
                        <span className="mt-[2px] block text-[14px] text-muted">{listing.note}</span>
                      </div>
                      <Chip tone={chip.tone}>{chip.label}</Chip>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      ) : null}

      <p className="t-caption text-muted">
        Drafts and owner submissions stay on Owner submissions. An empty published list
        means no listing is published.
      </p>
    </>
  );
}
