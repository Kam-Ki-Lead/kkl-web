import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminTable, Mono, Primary } from "@/components/admin/admin-table";
import { Chip } from "@/components/ui/chip";
import { formatExactInr } from "@/lib/format";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "Orders", robots: { index: false } };

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Delivered", value: "delivered" },
  { label: "Failed", value: "failed" },
];

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/**
 * A-16 — lead purchases and their delivery.
 *
 * A purchase made in the Seller or Builder console during a review pass appears
 * here at the top, marked live. That is the join working: the Admin record is
 * read from the console's own store rather than told about separately, so the
 * two cannot disagree about whether a lead was bought.
 */
export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter = one(params.filter) || "all";
  const query = one(params.q).trim().toLowerCase();

  const all = await getServices().admin.listOrders();
  const rows = all.filter((order) => {
    if (filter !== "all" && order.state !== filter) return false;
    if (!query) return true;
    return `${order.id} ${order.leadId} ${order.purchaserName} ${order.purchaserOrganisation}`
      .toLowerCase()
      .includes(query);
  });

  return (
    <AdminShell title="Orders" subtitle="Lead purchases and their delivery">
      <AdminTable
        basePath="/admin/orders"
        filters={FILTERS}
        activeFilter={filter}
        query={one(params.q)}
        countLabel={`${rows.length} of ${all.length} orders`}
        emptyTitle="No orders match"
        emptyBody="Nothing matches this filter and search."
        footnote="Credits are deducted before release and a failed delivery never leaves a charge in place — ORD-10402 shows the reversal. Purchases made in the Seller or Builder console during this review session appear at the top, marked live."
        columns={[
          { header: "ORDER", width: "0.9fr" },
          { header: "LEAD", width: "0.9fr" },
          { header: "PURCHASER", width: "1.4fr" },
          { header: "AMOUNT", width: "0.8fr" },
          { header: "DELIVERY", width: "0.9fr" },
        ]}
        rows={rows.map((order) => ({
          key: order.id,
          href: `/admin/orders/${order.id}/delivery`,
          cells: [
            <Mono key="id">{order.id}</Mono>,
            <Mono key="lead">{order.leadId}</Mono>,
            <Primary key="who" sub={order.purchaserOrganisation}>
              {order.purchaserName}
            </Primary>,
            <span key="amt" className="font-semibold text-ink">
              {formatExactInr(order.amountInr)}
            </span>,
            <Chip key="state" tone={order.state === "delivered" ? "success" : "danger"}>
              {order.state === "delivered" ? "Delivered" : "Failed"}
            </Chip>,
          ],
        }))}
      />
    </AdminShell>
  );
}
