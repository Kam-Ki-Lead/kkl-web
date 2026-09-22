import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminTable, Mono, Primary } from "@/components/admin/admin-table";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { getServices } from "@/lib/services";
import type { AdminLead } from "@/lib/domain/admin";

export const metadata: Metadata = { title: "Leads", robots: { index: false } };

const FILTERS = [
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

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/** A-12 — every lead and its lifecycle state. */
export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
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
        filters={FILTERS}
        activeFilter={filter}
        query={one(params.q)}
        countLabel={`${rows.length} of ${all.length} leads`}
        emptyTitle="No leads in this state"
        emptyBody="Nothing matches this filter and search right now."
        footnote="A lead reaches the marketplace only after qualification and a recorded consent outcome — the two disqualified and qualifying rows here show what that gate refuses. Buyer contact details are not on this screen at all: staff see the requirement, not the number."
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
