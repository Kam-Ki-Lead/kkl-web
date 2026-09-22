import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ButtonLink } from "@/components/ui/button";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "Delivery record", robots: { index: false } };

/**
 * A-17 — what was delivered and downloaded.
 *
 * The screen that answers "was this person actually charged?", which is why
 * the failed order matters more than the delivered one: it shows a deduction
 * and its reversal in the same sequence, so the net charge is visible as none.
 * A refund request against an order like that is the request that should never
 * have been raised, and A-20 says so.
 */
export default async function AdminDeliveryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getServices().admin.getOrder(id);
  if (!order) notFound();

  return (
    <AdminShell title={`Order ${order.id}`} subtitle="What was delivered and downloaded">
      <div className="flex max-w-[860px] flex-col gap-[16px]">
        <Link href="/admin/orders" className="t-caption text-brand underline underline-offset-2">
          ← Orders
        </Link>

        <Card className={`p-[20px] ${order.state === "failed" ? "border-[#F3C4BF]" : ""}`}>
          <div className="flex flex-wrap items-start justify-between gap-[12px]">
            <div className="min-w-0">
              <p className="t-mono text-[13px] text-muted">{order.id}</p>
              <h2 className="t-heading mt-[2px] text-ink">{order.leadLabel}</h2>
              <p className="t-body text-body">
                {order.purchaserName} · {order.purchaserOrganisation}
              </p>
              <p className="t-caption text-muted">{order.when}</p>
            </div>
            <div className="flex flex-none flex-col items-end gap-[6px]">
              <Chip tone={order.state === "delivered" ? "success" : "danger"}>
                {order.state === "delivered" ? "Delivered" : "Failed"}
              </Chip>
              {order.live ? <Chip tone="neutral">Live this session</Chip> : null}
            </div>
          </div>

          <dl className="mt-[16px] grid grid-cols-2 gap-x-[18px] gap-y-[10px] border-t border-line pt-[16px] max-[700px]:grid-cols-1">
            {order.facts.map((fact) => (
              <div key={fact.label}>
                <dt className="t-caption text-muted">{fact.label}</dt>
                <dd className="text-[15px] font-semibold text-ink">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-[20px]">
          <h2 className="t-card-title text-ink">Delivery record</h2>
          <ol className="mt-[12px] flex flex-col">
            {order.events.map((event, index) => (
              <li key={`${event.what}-${index}`} className="flex gap-[12px] border-b border-line py-[10px] last:border-b-0">
                <span
                  aria-hidden="true"
                  className="mt-[6px] h-[9px] w-[9px] flex-none rounded-full bg-brand"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-ink">{event.what}</span>
                  <span className="t-caption block text-muted">{event.detail}</span>
                </span>
                <span className="t-mono flex-none text-[12px] text-muted">{event.when}</span>
              </li>
            ))}
          </ol>
          {order.state === "failed" ? (
            <p className="t-body mt-[14px] rounded-[8px] bg-chip-success-bg px-[14px] py-[11px] text-success">
              <strong>Net charge: none.</strong> The deduction and its reversal are both in the
              sequence above, in the same second. Nothing here needs a refund, and a request
              against this order should be declined as already reversed rather than approved
              twice.
            </p>
          ) : null}
          <div className="mt-[14px] flex flex-wrap gap-[10px]">
            <ButtonLink
              href={`/admin/wallets?account=${order.purchaserAccountId}`}
              variant="secondary"
              size="sm"
            >
              Open the purchaser&rsquo;s ledger
            </ButtonLink>
            <ButtonLink href={`/admin/leads/${order.leadId}`} variant="secondary" size="sm">
              Open the lead
            </ButtonLink>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
