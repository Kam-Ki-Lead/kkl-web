import type { Metadata } from "next";
import { BuilderShell } from "@/components/builder/builder-shell";
import { OrderList } from "@/components/console/order-views";
import { BUILDER_ORDER_PATHS } from "@/components/console/order-paths";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "My purchases" };

/**
 * CR04 — order history, Builder console.
 *
 * The same screen as the Seller's, over the Builder's own lead pool. The pools
 * are separate; an order is the same object either way, so the view is shared
 * and only the links differ.
 */
export default async function BuilderOrdersPage() {
  const orders = await getServices().builder.leadMarket.listOrders();

  return (
    <BuilderShell title="My purchases" subtitle="Orders for the leads you have bought">
      <OrderList orders={orders} paths={BUILDER_ORDER_PATHS} />
    </BuilderShell>
  );
}
