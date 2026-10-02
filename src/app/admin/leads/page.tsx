import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminTable, Mono, Primary } from "@/components/admin/admin-table";
import { IdentityBanner } from "@/components/admin/identity-banner";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { StateMessage } from "@/components/ui/states";
import { getServices } from "@/lib/services";
import type { AdminLead } from "@/lib/domain/admin";
import { qualificationStoreKind } from "@/lib/services/backend/config";
import { listQualificationLeads } from "@/lib/services/backend/qualification";
import {
  LEAD_PAGE_SIZE,
  QUALIFICATION_FILTERS,
  REVIEW_FILTERS,
  type QualificationFilter,
  type ReviewFilter,
} from "@/lib/services/backend/qualification-reading";

export const metadata: Metadata = { title: "Leads", robots: { index: false } };
export const dynamic = "force-dynamic";

const SAMPLE_FILTERS = [
  { label: "All", value: "all" },
  { label: "Qualifying", value: "qualifying" },
  { label: "Qualified", value: "qualified" },
  { label: "Listed", value: "listed" },
  { label: "On sale", value: "on_sale" },
  { label: "Sold", value: "sold" },
  { label: "Disqualified", value: "disqualified" },
];

const STATE: Record<AdminLead["state"], { label: string; tone: ChipTone }> = {
  qualifying: { label: "Qualifying", tone: "warning" },
  qualified: { label: "Qualified", tone: "success" },
  listed: { label: "Listed", tone: "neutral" },
  on_sale: { label: "On sale", tone: "warning" },
  sold: { label: "Sold", tone: "muted" },
  disqualified: { label: "Disqualified", tone: "danger" },
};

const QUAL_TONE: Record<string, ChipTone> = {
  none: "muted",
  collecting: "warning",
  completed: "success",
  incomplete: "warning",
  failed: "danger",
  opted_out: "muted",
};

const REVIEW_TONE: Record<string, ChipTone> = {
  none: "muted",
  pending: "warning",
  recorded: "success",
  not_required: "muted",
};

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function parseQualification(raw: string): QualificationFilter | "" {
  return (QUALIFICATION_FILTERS as readonly string[]).includes(raw)
    ? (raw as QualificationFilter)
    : "";
}

function parseReview(raw: string): ReviewFilter | "" {
  return (REVIEW_FILTERS as readonly string[]).includes(raw) ? (raw as ReviewFilter) : "";
}

/** A-12 — staff operational lead inventory (H4-1). */
export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  if (qualificationStoreKind() === "backend") {
    const qualification = parseQualification(one(params.qualification));
    const review = parseReview(one(params.review));
    const offset = Math.max(0, Number.parseInt(one(params.offset) || "0", 10) || 0);
    const loaded = await listQualificationLeads({
      qualification: qualification || undefined,
      review: review || undefined,
      offset,
      limit: LEAD_PAGE_SIZE,
    });

    if (!loaded.ok) {
      return (
        <AdminShell title="Leads" subtitle="Staff operational lead inventory">
          <div className="flex max-w-[900px] flex-col gap-[16px]">
            <IdentityBanner />
            <StateMessage tone="error" title="Leads could not be loaded">
              {loaded.message} Marketplace{" "}
              <span className="t-mono">GET /v1/leads</span> rows are not substituted for this
              staff inventory.
            </StateMessage>
          </div>
        </AdminShell>
      );
    }

    const page = loaded.value;
    const nextOffset = page.offset + page.limit;
    const pastEnd = page.total > 0 && page.offset >= page.total;
    const empty = page.leads.length === 0;

    return (
      <AdminShell title="Leads" subtitle="Staff operational lead inventory">
        <div className="flex max-w-[960px] flex-col gap-[16px]">
          <IdentityBanner />
          <p className="t-caption rounded-[8px] bg-tint px-[13px] py-[10px] text-body">
            Staff inventory from{" "}
            <span className="t-mono">GET /v1/admin/qualification/leads</span>
            {" "}(<span className="t-mono">inventory: true</span>
            {page.audience ? ` · audience ${page.audience}` : ""}
            ). Not marketplace{" "}
            <span className="t-mono">{page.marketplacePath ?? "/v1/leads"}</span>
            . A run is not a lead — open{" "}
            <Link href="/admin/voice" className="text-brand underline underline-offset-2">
              voice qualification
            </Link>{" "}
            for runs.
          </p>

          <form method="get" className="flex flex-wrap items-end gap-[12px]">
            <label className="flex flex-col gap-[4px]">
              <span className="t-caption text-muted">Qualification</span>
              <select
                name="qualification"
                defaultValue={qualification}
                className="rounded-[8px] border border-line bg-white px-[10px] py-[8px] text-[14px] text-ink"
              >
                <option value="">All</option>
                {QUALIFICATION_FILTERS.map((value) => (
                  <option key={value} value={value}>
                    {value.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-[4px]">
              <span className="t-caption text-muted">Review</span>
              <select
                name="review"
                defaultValue={review}
                className="rounded-[8px] border border-line bg-white px-[10px] py-[8px] text-[14px] text-ink"
              >
                <option value="">All</option>
                {REVIEW_FILTERS.map((value) => (
                  <option key={value} value={value}>
                    {value.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <input type="hidden" name="offset" value="0" />
            <button
              type="submit"
              className="rounded-[8px] bg-brand px-[14px] py-[8px] text-[14px] font-semibold text-white"
            >
              Apply filters
            </button>
          </form>

          <p className="t-caption text-muted">
            Showing {page.leads.length} of {page.total} · offset {page.offset} · limit {page.limit}
          </p>

          {pastEnd ? (
            <StateMessage title="Past the end of this inventory">
              Offset {page.offset} is beyond total {page.total}. Move back to browse earlier pages.
            </StateMessage>
          ) : null}
          {empty && !pastEnd ? (
            <StateMessage title="No leads match these filters">
              The staff inventory is empty for this qualification/review combination. Sample rows
              are not shown.
            </StateMessage>
          ) : null}

          {!empty ? (
            <div className="overflow-hidden rounded-[10px] border border-line bg-white">
              <div className="grid grid-cols-[1.1fr_1.4fr_0.9fr_0.9fr_1.2fr] gap-[10px] border-b border-line bg-tint px-[16px] py-[10px] max-[900px]:grid-cols-1">
                <span className="t-caption text-muted">REF</span>
                <span className="t-caption text-muted">LOCATION</span>
                <span className="t-caption text-muted">CONSENT</span>
                <span className="t-caption text-muted">LATEST RUN</span>
                <span className="t-caption text-muted">REVIEW</span>
              </div>
              {page.leads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/admin/leads/${encodeURIComponent(lead.id)}`}
                  className="grid grid-cols-[1.1fr_1.4fr_0.9fr_0.9fr_1.2fr] gap-[10px] border-b border-line px-[16px] py-[14px] last:border-b-0 hover:bg-chip-neutral-bg max-[900px]:grid-cols-1"
                >
                  <span className="min-w-0">
                    <span className="t-mono block text-[13px] text-ink">{lead.reference}</span>
                    <span className="t-caption text-muted">
                      {lead.status.replace(/_/g, " ")} · {lead.runCount} run
                      {lead.runCount === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span className="text-[15px] text-body">
                    {lead.locationName ?? lead.locationId ?? "—"}
                    {lead.contactLabel ? (
                      <span className="t-caption mt-[2px] block text-muted">{lead.contactLabel}</span>
                    ) : null}
                  </span>
                  <span className="text-[15px] text-body">{lead.consentStatus.replace(/_/g, " ")}</span>
                  <span>
                    {lead.latestRun ? (
                      <Chip tone={QUAL_TONE[lead.latestRun.state] ?? "muted"} size="sm">
                        {lead.latestRun.state.replace(/_/g, " ")}
                      </Chip>
                    ) : (
                      <span className="t-caption text-muted">No run</span>
                    )}
                  </span>
                  <span>
                    {lead.latestRun ? (
                      <Chip tone={REVIEW_TONE[lead.latestRun.reviewStatus] ?? "muted"} size="sm">
                        {lead.latestRun.reviewStatus.replace(/_/g, " ")}
                      </Chip>
                    ) : (
                      <span className="t-caption text-muted">—</span>
                    )}
                  </span>
                </Link>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-[12px]">
            {page.offset > 0 ? (
              <Link
                href={`/admin/leads?qualification=${qualification}&review=${review}&offset=${Math.max(0, page.offset - page.limit)}`}
                className="t-caption text-brand underline underline-offset-2"
              >
                ← Previous
              </Link>
            ) : null}
            {nextOffset < page.total ? (
              <Link
                href={`/admin/leads?qualification=${qualification}&review=${review}&offset=${nextOffset}`}
                className="t-caption text-brand underline underline-offset-2"
              >
                Next →
              </Link>
            ) : null}
          </div>

          {page.note ? <p className="t-caption text-muted">{page.note}</p> : null}
          <p className="t-caption text-muted">
            Qualification levels stay unset until mapping is configured. Contact numbers are not
            on this screen.
          </p>
        </div>
      </AdminShell>
    );
  }

  const filter = one(params.filter) || "all";
  const query = one(params.q).trim().toLowerCase();

  const all = await getServices().admin.listLeads();
  const rows = all.filter((lead) => {
    if (filter !== "all" && lead.state !== filter) return false;
    if (!query) return true;
    return `${lead.id} ${lead.requirement} ${lead.area} ${lead.source}`
      .toLowerCase()
      .includes(query);
  });

  return (
    <AdminShell title="Leads" subtitle="Every lead and its lifecycle state">
      <AdminTable
        basePath="/admin/leads"
        filters={SAMPLE_FILTERS}
        activeFilter={filter}
        query={one(params.q)}
        countLabel={`${rows.length} of ${all.length} leads`}
        emptyTitle="No leads in this state"
        emptyBody="Nothing matches this filter and search right now."
        footnote="A lead reaches the marketplace only after qualification and a recorded consent outcome — the two disqualified and qualifying rows here show what that gate refuses. Buyer contact details are not on this screen at all: staff see the requirement, not the number. These rows are fixtures until a staff lead inventory is published."
        columns={[
          { header: "REF", width: "0.9fr" },
          { header: "REQUIREMENT", width: "1.6fr" },
          { header: "SOURCE", width: "1fr" },
          { header: "STATE", width: "0.9fr" },
          { header: "AGE", width: "0.7fr" },
        ]}
        rows={rows.map((lead) => ({
          key: lead.id,
          href: `/admin/leads/${lead.id}`,
          cells: [
            <Mono key="id">{lead.id}</Mono>,
            <Primary key="req" sub={lead.area}>
              {lead.requirement}
            </Primary>,
            lead.source,
            <Chip key="state" tone={STATE[lead.state].tone}>
              {STATE[lead.state].label}
            </Chip>,
            lead.ageLabel,
          ],
        }))}
      />
    </AdminShell>
  );
}
