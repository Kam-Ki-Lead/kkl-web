import Link from "next/link";
import { Card, InsetPanel, SectionHeader } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ButtonLink } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/states";
import { formatAreaPath, formatDateTime, formatExactInr } from "@/lib/format";
import type { LeadOrder } from "@/lib/domain/types";

/**
 * CR04 — order history and order detail, shared by both consoles.
 *
 * The Seller and Builder lead pools are separate, but an order reads the same
 * either way, so the screens are written once and the console supplies its own
 * paths. Two copies of this would have drifted on the first change to the
 * invoice wording.
 *
 * WHAT THESE SCREENS ARE CAREFUL NOT TO SAY
 * -----------------------------------------
 * Nothing here implies a payment gateway, a tax treatment or a refund. The
 * confirmed CR04 decision is a direct order settled from wallet credits; the
 * payment block names exactly that and links to the ledger entry that moved the
 * credits, so the money is traceable rather than asserted. The invoice block
 * states whether a document exists — and when one does not, why not — instead of
 * offering a download that leads nowhere.
 *
 * There is no "Cancel order" and no "Request refund" control, because refund
 * eligibility and destination are undecided. A button that opens a request
 * nobody has agreed to handle is worse than no button.
 */

export type OrderPaths = {
  /** Where an order's own page lives, e.g. `/seller/orders`. */
  readonly ordersHref: string;
  /** Where the purchased lead lives, given its id. */
  readonly leadHref: (leadId: string) => string;
  /** The marketplace to send someone to when they have no orders. */
  readonly marketplaceHref: string;
  /** The wallet ledger, where the deduction can be seen. */
  readonly ledgerHref: string;
};

export function OrderList({
  orders,
  paths,
}: {
  orders: readonly LeadOrder[];
  paths: OrderPaths;
}) {
  if (orders.length === 0) {
    return (
      <StateMessage
        title="No orders yet"
        action={
          <ButtonLink href={paths.marketplaceHref} size="action">
            Browse Buy Leads
          </ButtonLink>
        }
      >
        An order is created when you buy a lead. It records what you bought, what it cost and how it
        was paid for. Nothing is charged until you confirm a purchase.
      </StateMessage>
    );
  }

  return (
    <div className="flex flex-col gap-[16px]">
      <p className="text-[16px] font-bold text-ink">
        {orders.length} {orders.length === 1 ? "order" : "orders"}
      </p>
      <ul className="flex flex-col gap-[12px]">
        {orders.map((order) => (
          <li key={order.reference}>
            <Card className="p-[18px]">
              <div className="flex flex-wrap items-start justify-between gap-[12px]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-[10px]">
                    <p className="t-mono text-[13px] text-muted">{order.reference}</p>
                    <Chip tone={order.status === "paid" ? "success" : "danger"}>
                      {order.status === "paid" ? "Paid" : "Failed"}
                    </Chip>
                  </div>
                  <h2 className="t-card-title mt-[3px] text-ink">
                    <Link
                      href={`${paths.ordersHref}/${order.reference}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {order.itemLabel}
                    </Link>
                  </h2>
                  <p className="t-caption mt-[1px] text-muted">
                    {formatAreaPath(order.locationPath)} · {formatDateTime(order.placedAt)} ·{" "}
                    {order.payment.label}
                  </p>
                </div>
                <div className="flex-none text-right">
                  <p className="t-card-title text-ink">
                    {formatExactInr(order.payment.amountCredits)}
                  </p>
                  <p className="t-caption text-muted">credits</p>
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OrderDetail({ order, paths }: { order: LeadOrder; paths: OrderPaths }) {
  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex flex-wrap items-center gap-[12px]">
        <p className="t-mono text-[14px] text-muted">{order.reference}</p>
        <Chip tone={order.status === "paid" ? "success" : "danger"}>
          {order.status === "paid" ? "Paid" : "Failed"}
        </Chip>
        <Link href={paths.ordersHref} className="t-caption font-semibold text-brand">
          All orders
        </Link>
      </div>

      <Card className="p-[20px]">
        <SectionHeader title="What you ordered" />
        <dl className="grid grid-cols-2 gap-[14px] max-[560px]:grid-cols-1">
          <Row label="Item" value={order.itemLabel} />
          <Row label="Area" value={formatAreaPath(order.locationPath)} />
          <Row label="Placed" value={formatDateTime(order.placedAt)} />
          <Row
            label="Marketplace"
            value={order.scope === "builder" ? "Builder lead pool" : "Seller lead pool"}
          />
        </dl>
        {order.leadId === null ? (
          <p className="t-caption mt-[14px] border-t border-line pt-[14px] text-muted">
            Nothing was released for this order.
          </p>
        ) : (
          <div className="mt-[14px] border-t border-line pt-[14px]">
            <ButtonLink href={paths.leadHref(order.leadId)} variant="secondary" size="action">
              Open the lead
            </ButtonLink>
            <p className="t-caption mt-[8px] text-muted">
              The contact details released by this order are on the lead itself, not here — they
              belong to one screen, not several.
            </p>
          </div>
        )}
      </Card>

      <Card className="p-[20px]">
        <SectionHeader title="Payment" />
        <InsetPanel>
          <dl className="grid grid-cols-2 gap-[14px] max-[560px]:grid-cols-1">
            <Row label="Method" value={order.payment.label} />
            <Row label="Amount" value={`${formatExactInr(order.payment.amountCredits)} credits`} />
            <Row label="Ledger entry" value={order.payment.ledgerReference} mono />
          </dl>
        </InsetPanel>
        <p className="t-caption mt-[12px] text-muted">
          Credits were deducted first and the lead released only because that succeeded. The
          deduction is on your{" "}
          <Link href={paths.ledgerHref} className="font-semibold text-brand">
            credit ledger
          </Link>{" "}
          under the reference above, so the money can be traced rather than taken on trust.
        </p>
        <p className="t-caption mt-[8px] text-muted">
          Paying by card or UPI instead of wallet credits is a later addition. No payment provider
          has been chosen, and none is contacted anywhere in this build.
        </p>
      </Card>

      <Card className="p-[20px]">
        <SectionHeader title="Invoice" />
        {order.invoice.kind === "issued" ? (
          <>
            <p className="t-body text-ink">
              Invoice <span className="t-mono">{order.invoice.number}</span>
            </p>
            <div className="mt-[12px]">
              <ButtonLink
                href={`/seller/billing/invoices/${order.invoice.invoiceId}`}
                variant="secondary"
                size="action"
              >
                View invoice
              </ButtonLink>
            </div>
          </>
        ) : (
          <>
            <p className="t-body text-body">No separate invoice for this order.</p>
            <p className="t-caption mt-[6px] max-w-[70ch] text-muted">{order.invoice.reason}</p>
            <div className="mt-[12px]">
              <ButtonLink href="/seller/billing/invoices" variant="secondary" size="action">
                Recharge invoices
              </ButtonLink>
            </div>
          </>
        )}
      </Card>

      <p className="t-caption max-w-[70ch] text-muted">
        There is no cancel or refund control on this screen, and that is deliberate: whether a lead
        purchase can be refunded, on what grounds and to where, has not been decided. A button that
        opened a request nobody has agreed to handle would be worse than its absence.
      </p>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="t-caption text-muted">{label}</dt>
      <dd className={`mt-[2px] break-words text-ink ${mono ? "t-mono text-[14px]" : "t-body"}`}>
        {value}
      </dd>
    </div>
  );
}
