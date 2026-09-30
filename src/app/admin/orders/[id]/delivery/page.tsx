import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { IdentityBanner } from "@/components/admin/identity-banner";
import { Card } from "@/components/ui/card";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";
import { getServices } from "@/lib/services";
import { adminOperationsStoreKind, staffOrdersStoreKind } from "@/lib/services/backend/config";
import { getStaffOrder } from "@/lib/services/backend/staff-orders";
import { cancelPendingOrder } from "@/app/actions/staff-order";
import {
  ORDER_SCREEN_OMISSIONS,
  formatCredits,
  orderStatusLabel,
  type StaffOrder,
} from "@/lib/services/backend/staff-views";
import { StateMessage } from "@/components/ui/states";

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
function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function toneFor(status: string | null): ChipTone {
  if (status === "completed") return "success";
  if (status === "failed") return "danger";
  if (status === "pending") return "warning";
  if (status === "cancelled") return "muted";
  return "neutral";
}

function factsFor(order: StaffOrder): ReadonlyArray<{ label: string; value: string }> {
  const facts: { label: string; value: string }[] = [];
  const add = (label: string, value: string | null) => {
    if (value) facts.push({ label, value });
  };
  add("Credits", order.amountCredits === null ? null : formatCredits(order.amountCredits));
  add("Buyer", order.buyerDisplayName);
  add("Account", order.accountId);
  add("Lead", order.leadReference ?? order.lead?.reference ?? null);
  add("Requirement", order.lead?.summary ?? null);
  add("Property type", order.lead?.propertyType ?? null);
  add("Budget", order.lead?.budgetBand ?? null);
  add("Location", order.lead?.locationName ?? null);
  add("Placed", order.createdAt);
  add("Completed", order.completedAt);
  add("Cancelled", order.cancelledAt);
  add("Cancelled by", order.cancelledBy);
  add("Reason", order.failureReason);
  if (order.contact) {
    add("Contact", [order.contact.fullName, order.contact.phone, order.contact.email].filter(Boolean).join(" · ") || null);
  }
  return facts;
}

export default async function AdminDeliveryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  if (staffOrdersStoreKind() === "backend") {
    const query = await searchParams;
    const loaded = await getStaffOrder(id);
    if (!loaded.ok) {
      return (
        <AdminShell title={`Order ${id}`} subtitle="What was delivered and downloaded">
          <IdentityBanner />
          <StateMessage tone="error" title="This order could not be loaded">
            {loaded.message} Sample orders are not shown in their place.
          </StateMessage>
        </AdminShell>
      );
    }
    if (!loaded.value) notFound();
    const order = loaded.value;
    const cancelError = one(query.cancelError);
    const cancelled = one(query.cancelled) === "1";
    const facts = factsFor(order);
    return (
      <AdminShell title={`Order ${order.reference ?? order.id}`} subtitle="What was delivered and downloaded">
        <div className="flex max-w-[860px] flex-col gap-[16px]">
          <IdentityBanner />
          <Link href="/admin/orders" className="t-caption text-brand underline underline-offset-2">
            ← Orders
          </Link>
          {cancelled ? (
            <StateMessage tone="success" title="Order cancelled">
              The pending order is now cancelled. The reason is stored on the order.
            </StateMessage>
          ) : null}
          <Card className="p-[20px]">
            <div className="flex flex-wrap items-start justify-between gap-[12px]">
              <div className="min-w-0">
                <p className="t-mono text-[12px] text-muted">{order.reference ?? order.id}</p>
                <h2 className="t-heading mt-[2px] text-ink">
                  {order.leadReference ?? order.lead?.reference ?? "Lead reference is not on this read"}
                </h2>
                <p className="t-body text-body">
                  {order.buyerDisplayName ?? "Buyer name is not on this read"}
                </p>
              </div>
              <Chip tone={toneFor(order.status)}>{orderStatusLabel(order.status)}</Chip>
            </div>
            <dl className="mt-[16px] grid grid-cols-2 gap-x-[18px] gap-y-[10px] border-t border-line pt-[16px] max-[700px]:grid-cols-1">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="t-caption text-muted">{fact.label}</dt>
                  <dd className="text-[15px] font-semibold text-ink">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card className="p-[20px]">
            <h2 className="t-card-title text-ink">What this order includes</h2>
            <p className="t-body mt-[8px] text-body">{ORDER_SCREEN_OMISSIONS.join(" ")}</p>
            {adminOperationsStoreKind() === "backend" && order.accountId ? (
              <div className="mt-[14px]">
                <ButtonLink
                  href={`/admin/wallets?account=${order.accountId}`}
                  variant="secondary"
                  size="sm"
                >
                  Open this account&rsquo;s ledger
                </ButtonLink>
              </div>
            ) : null}
          </Card>
          {order.status === "pending" ? (
            <Card className="p-[20px]">
              <h2 className="t-card-title text-ink">Cancel this pending order</h2>
              <p className="t-body mt-[6px] text-body">
                A reason is required. A completed order is refused, because cancelling it would mean returning credits.
              </p>
              <form action={cancelPendingOrder} className="mt-[14px] flex max-w-[520px] flex-col gap-[12px]">
                <input type="hidden" name="orderId" value={order.id} />
                <Field id="cancel-reason" label="Reason" error={cancelError || undefined}>
                  <TextArea id="cancel-reason" name="reason" required rows={3} />
                </Field>
                <Button type="submit" variant="destructive" className="self-start">
                  Cancel this pending order
                </Button>
              </form>
            </Card>
          ) : cancelError ? (
            <StateMessage tone="error" title="Cancellation was refused">
              {cancelError}
            </StateMessage>
          ) : null}
        </div>
      </AdminShell>
    );
  }
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
              <p className="t-mono text-[12px] text-muted">{order.id}</p>
              {/* The approved A-17 subject steps 23/26/28 with the frame —
                  the admin detail-subject role. */}
              <h2 className="t-heading mt-[2px] text-ink">
                {order.leadLabel}
              </h2>
              <p className="t-body text-body">
                {order.purchaserName} · {order.purchaserOrganisation}
              </p>
              <p className="text-[16px] text-body">{order.when}</p>
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
          {/* The approved events panel is headed at 17px/700 ("Delivery &
              download record"). The impl's shorter wording is a recorded
              content difference; the type role matches the approved panel. */}
          <h2 className="t-card-title text-ink">Delivery record</h2>
          <ol className="mt-[12px] flex flex-col">
            {order.events.map((event, index) => (
              <li key={`${event.what}-${index}`} className="flex gap-[12px] border-b border-line py-[10px] last:border-b-0">
                <span
                  aria-hidden="true"
                  className="mt-[6px] h-[9px] w-[9px] flex-none rounded-full bg-brand"
                />
                <span className="min-w-0 flex-1">
                  {/* The approved timeline sets events in 400-weight and their
                      timestamps in 15px Public Sans, not mono. */}
                  <span className="block text-[15px] text-ink">{event.what}</span>
                  <span className="t-caption block text-muted">{event.detail}</span>
                </span>
                <span className="flex-none text-[15px] text-muted">{event.when}</span>
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
