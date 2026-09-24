import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminTable, Primary } from "@/components/admin/admin-table";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { getServices } from "@/lib/services";
import type { AdminSubscription } from "@/lib/domain/admin";

export const metadata: Metadata = { title: "Subscriptions", robots: { index: false } };

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Renewal due", value: "renewal_due" },
  { label: "Expired", value: "expired" },
];

const STATE: Record<AdminSubscription["state"], { label: string; tone: ChipTone }> = {
  active: { label: "Active", tone: "success" },
  renewal_due: { label: "Renewal due", tone: "warning" },
  expired: { label: "Expired", tone: "danger" },
};

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/**
 * A-21 — Builder subscriptions and billing.
 *
 * **No amount is shown, on any row.** D-01 leaves the price and the billing
 * cycle unset, so the amount column reads "Sample" rather than a figure — a
 * plausible number on a staff screen is exactly how an unapproved price becomes
 * a fact.
 *
 * The live Builder's row reads its state from that console, so this screen
 * cannot say Active about a subscription B-03 shows as expired.
 */
export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter = one(params.filter) || "all";
  const query = one(params.q).trim().toLowerCase();

  const all = await getServices().admin.listSubscriptions();
  const rows = all.filter((sub) => {
    if (filter !== "all" && sub.state !== filter) return false;
    if (!query) return true;
    return `${sub.id} ${sub.organisation} ${sub.accountId}`.toLowerCase().includes(query);
  });

  return (
    <AdminShell title="Subscriptions" subtitle="Builder subscriptions and billing">
      <AdminTable
        basePath="/admin/subscriptions"
        filters={FILTERS}
        activeFilter={filter}
        query={one(params.q)}
        countLabel={`${rows.length} of ${all.length} subscriptions`}
        emptyTitle="No subscriptions match"
        emptyBody="Nothing matches this filter and search."
        footnote="Price and billing cycle are not set by the client (D-01), so the amount column reads 'Sample' rather than a figure and no plan is presented as approved. What happens to a builder's live listings when a subscription lapses is separately undecided (D-02) — the expired row says so rather than implying an outcome."
        columns={[
          { header: "ACCOUNT", width: "1.5fr" },
          { header: "STARTED", width: "0.9fr" },
          { header: "STATE", width: "1fr" },
          { header: "AMOUNT", width: "0.9fr" },
          { header: "LISTINGS", width: "0.9fr" },
        ]}
        rows={rows.map((sub) => ({
          key: sub.id,
          href: `/admin/users/${sub.accountId}`,
          cells: [
            <Primary key="org" sub={sub.accountId}>{sub.organisation}</Primary>,
            sub.startedAt,
            <Chip key="state" tone={STATE[sub.state].tone}>
              {STATE[sub.state].label}
            </Chip>,
            <span key="amt" className="t-caption text-muted">
              Sample · D-01
            </span>,
            sub.listingsLabel,
          ],
        }))}
      />
    </AdminShell>
  );
}
