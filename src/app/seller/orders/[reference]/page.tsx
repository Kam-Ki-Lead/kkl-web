import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SellerShell } from "@/components/seller/seller-shell";
import { OrderDetail } from "@/components/console/order-views";
import { SELLER_ORDER_PATHS } from "@/components/console/order-paths";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "Order", robots: { index: false } };

/**
 * CR04 — one order.
 *
 * A reference that does not exist, and one belonging to another account, are the
 * same 404. The service answers for the caller's own identity and takes no
 * account parameter, so there is nothing here to probe with.
 */
export default async function SellerOrderPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const order = await getServices().leadMarket.getOrder(reference);
  if (order === null) notFound();

  return (
    <SellerShell
      title={`Order ${order.reference}`}
      subtitle={order.status === "paid"
        ? "What you ordered, and what paid for it"
        : "What you ordered. This order is not paid."}
    >
      <OrderDetail order={order} paths={SELLER_ORDER_PATHS} />
    </SellerShell>
  );
}
