import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SellerShell } from "@/components/seller/seller-shell";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DECISIONS } from "@/lib/config/business-rules";
import { formatDate, formatExactInr } from "@/lib/format";
import { getServices } from "@/lib/services";
import type { InvoiceParty } from "@/lib/domain/types";

export const metadata: Metadata = { title: "Invoice" };

/**
 * S-20 — invoice detail.
 *
 * There is no tax line, and that is deliberate. D-13 leaves GST treatment on
 * credits unconfirmed: whether credits are invoiced with GST, and at what rate,
 * is a client decision. A zero-rated line or an assumed 18% would both be a tax
 * claim nobody has made, on a document someone may file. The screen says what is
 * missing instead.
 *
 * `taxInr` is null from the service for the same reason — the absence is in the
 * data, not just in the rendering.
 */
export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getServices().credits.invoice(id);
  if (!invoice) notFound();

  return (
    <SellerShell title="Invoice" subtitle="Detail and download">
      <div className="max-w-[760px]">
        <Card className="p-[24px]">
          <div className="flex flex-wrap items-start justify-between gap-[12px]">
            <div>
              <h2 className="t-heading text-ink">
                Invoice <span className="t-mono">{invoice.number}</span>
              </h2>
              <p className="t-caption mt-[2px] text-muted">
                Issued {formatDate(invoice.issuedAt)}
              </p>
            </div>
            <Chip tone={invoice.status === "paid" ? "success" : "warning"}>
              {invoice.status === "paid" ? "Paid" : "Pending"}
            </Chip>
          </div>

          <div className="mt-[20px] grid grid-cols-2 gap-[18px] max-[640px]:grid-cols-1">
            <Party heading="Billed to" party={invoice.billedTo} />
            <Party heading="From" party={invoice.issuedBy} gstinPending />
          </div>

          <table className="mt-[22px] w-full border-collapse">
            <caption className="sr-only">Invoice lines</caption>
            <thead>
              <tr className="border-b border-line bg-tint">
                <th scope="col" className="t-label px-[14px] py-[10px] text-left text-muted">
                  Item
                </th>
                <th scope="col" className="t-label px-[14px] py-[10px] text-right text-muted">
                  Qty
                </th>
                <th scope="col" className="t-label px-[14px] py-[10px] text-right text-muted">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line) => (
                <tr key={line.description} className="border-b border-line">
                  <td className="px-[14px] py-[12px] text-[15px] text-ink">{line.description}</td>
                  <td className="px-[14px] py-[12px] text-right text-[15px] text-body">
                    {line.quantity}
                  </td>
                  <td className="px-[14px] py-[12px] text-right text-[15px] font-bold text-ink">
                    {formatExactInr(line.amountInr)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-tint">
                <th scope="row" colSpan={2} className="px-[14px] py-[12px] text-left text-[15px] font-bold text-ink">
                  Total
                </th>
                <td className="px-[14px] py-[12px] text-right text-[16px] font-bold text-ink">
                  {formatExactInr(invoice.totalInr)}
                </td>
              </tr>
            </tfoot>
          </table>

          {invoice.taxInr === null ? (
            <p className="t-caption mt-[14px] rounded-[8px] bg-chip-warning-bg px-[13px] py-[10px] text-warning">
              No tax line is shown. {DECISIONS["D-13"].pendingCopy} — whether credits are invoiced
              with GST, and at what rate, is a client decision (D-13). Nothing is assumed on a
              document you may need to file.
            </p>
          ) : null}
        </Card>

        <div className="mt-[16px] flex flex-wrap gap-[10px]">
          <ButtonLink href="/seller/billing/invoices" variant="secondary">
            All invoices
          </ButtonLink>
        </div>
        <p className="t-caption mt-[10px] text-muted">
          There is no PDF download. A tax invoice is generated and numbered server-side by
          kkl-backend, which does not exist yet, and a button that produced nothing — or produced
          a document without its tax treatment settled — would be worse than its absence.
        </p>
      </div>
    </SellerShell>
  );
}

function Party({
  heading,
  party,
  gstinPending = false,
}: {
  heading: string;
  party: InvoiceParty;
  gstinPending?: boolean;
}) {
  return (
    <div>
      <h3 className="text-[12px] text-muted">{heading}</h3>
      <p className="mt-[4px] text-[15px] font-bold text-ink">{party.name}</p>
      {party.addressLines.map((line) => (
        <p key={line} className="text-[15px] text-body">
          {line}
        </p>
      ))}
      <p className="t-caption mt-[4px] text-muted">
        GSTIN —{" "}
        {party.gstin ?? (gstinPending ? "pending client input" : "not provided")}
      </p>
    </div>
  );
}
