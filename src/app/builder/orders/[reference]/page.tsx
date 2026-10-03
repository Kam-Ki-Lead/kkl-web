import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BuilderShell } from "@/components/builder/builder-shell";
import { OrderDetail } from "@/components/console/order-views";
import { BUILDER_ORDER_PATHS } from "@/components/console/order-paths";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "Order", robots: { index: false } };

/** CR04 — one Builder order. A reference from the other pool is a 404 here. */
export default async function BuilderOrderPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const order = await getServices().builder.leadMarket.getOrder(reference);
  if (order === null) notFound();

  return (
    <BuilderShell
      title={`Order ${order.reference}`}
      subtitle={order.status === "paid"
        ? "What you ordered, and what paid for it"
        : "What you ordered. This order is not paid."}
    >
      <OrderDetail order={order} paths={BUILDER_ORDER_PATHS} />
    </BuilderShell>
  );
}
