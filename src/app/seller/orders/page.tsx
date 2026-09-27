import type { Metadata } from "next";
import { SellerShell } from "@/components/seller/seller-shell";
import { OrderList } from "@/components/console/order-views";
import { SELLER_ORDER_PATHS } from "@/components/console/order-paths";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "My purchases" };

/**
 * CR04 — order history.
 *
 * Separate from "My leads" because they answer different questions. My leads is
 * the working list: who to call, with contact details. This is the commercial
 * record: what was ordered, what it cost, how it was paid and what paperwork
 * exists. Folding them together made the second question unanswerable without
 * opening a lead.
 */
export default async function SellerOrdersPage() {
  const orders = await getServices().leadMarket.listOrders();

  return (
    <SellerShell title="My purchases" subtitle="Orders for the leads you have bought">
      <OrderList orders={orders} paths={SELLER_ORDER_PATHS} />
    </SellerShell>
  );
}
