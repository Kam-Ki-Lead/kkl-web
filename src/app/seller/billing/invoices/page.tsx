import type { Metadata } from "next";
import Link from "next/link";
import { SellerShell } from "@/components/seller/seller-shell";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ButtonLink } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/states";
import { formatDate, formatExactInr } from "@/lib/format";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "Invoices" };

/** S-19 — recharge invoices. */
export default async function InvoicesPage() {
  const invoices = await getServices().credits.invoices();

  return (
    <SellerShell title="Invoices" subtitle="Recharge invoices">
      {invoices.length === 0 ? (
        <StateMessage
          title="No invoices yet"
          action={<ButtonLink href="/seller/billing/recharge">Recharge credits</ButtonLink>}
        >
          An invoice is issued for each successful recharge. Lead purchases are credit deductions,
          not separate invoices — they appear in the transaction history.
        </StateMessage>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse">
            <caption className="sr-only">Invoices issued to this account, newest first</caption>
            <thead>
              <tr className="border-b border-line bg-tint">
                <th scope="col" className="t-label px-[16px] py-[11px] text-left text-muted">
                  Invoice
                </th>
                <th scope="col" className="t-label px-[16px] py-[11px] text-left text-muted">
                  Description
                </th>
                <th scope="col" className="t-label px-[16px] py-[11px] text-left text-muted">
                  Date
                </th>
                <th scope="col" className="t-label px-[16px] py-[11px] text-right text-muted">
                  Amount
                </th>
                <th scope="col" className="t-label px-[16px] py-[11px] text-left text-muted">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-line last:border-b-0">
                  <td className="px-[16px] py-[13px]">
                    {/* The approved S-19 renders the invoice number as plain
                        mono ink text. The link to the invoice screen is kept —
                        the prototype simply had nothing to link to — but it
                        takes the baseline's colour and weight. */}
                    <Link
                      href={`/seller/billing/invoices/${invoice.id}`}
                      className="t-mono text-[13px] text-ink underline underline-offset-2"
                    >
                      {invoice.number}
                    </Link>
                  </td>
                  <td className="px-[16px] py-[13px] text-[15px] font-semibold text-ink">
                    {invoice.description}
                  </td>
                  <td className="px-[16px] py-[13px] text-[15px] text-muted">
                    {formatDate(invoice.issuedAt)}
                  </td>
                  <td className="px-[16px] py-[13px] text-right text-[15px] font-semibold text-body">
                    {formatExactInr(invoice.amountInr)}
                  </td>
                  <td className="px-[16px] py-[13px]">
                    <Chip
                      tone={
                        invoice.status === "paid"
                          ? "success"
                          : invoice.status === "pending"
                            ? "warning"
                            : "danger"
                      }
                    >
                      {invoice.status === "paid"
                        ? "Paid"
                        : invoice.status === "pending"
                          ? "Pending"
                          : "Failed"}
                    </Chip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </SellerShell>
  );
}
