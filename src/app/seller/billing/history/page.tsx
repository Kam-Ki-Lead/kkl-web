import type { Metadata } from "next";
import Link from "next/link";
import { SellerShell } from "@/components/seller/seller-shell";
import { Card } from "@/components/ui/card";
import { StateMessage } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { formatCreditBalance, formatDate, formatSignedInr } from "@/lib/format";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "Transactions" };

const FILTERS = [
  { key: "", label: "All" },
  { key: "recharge", label: "Recharge" },
  { key: "purchase", label: "Purchase" },
] as const;

/**
 * S-17 — the full ledger.
 *
 * Every row carries the balance that resulted from it, because that is what
 * makes a ledger checkable: a reader can follow the running balance down the
 * column. The balances come from the service; this page does not add anything up.
 */
export default async function TransactionHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.show) ? params.show[0] : params.show;
  const show = raw === "recharge" || raw === "purchase" ? raw : undefined;

  const ledger = await getServices().credits.ledger(show ? { type: show } : undefined);

  return (
    <SellerShell title="Transactions" subtitle="Every ledger entry on this account">
      <div className="flex flex-col gap-[16px]">
        <div className="flex flex-wrap items-center gap-[10px]">
          <span className="t-label text-ink">Show</span>
          {FILTERS.map((filter) => {
            const active = (show ?? "") === filter.key;
            return (
              <Link
                key={filter.label}
                href={filter.key ? `/seller/billing/history?show=${filter.key}` : "/seller/billing/history"}
                aria-current={active ? "page" : undefined}
                className={`min-h-[36px] rounded-[8px] border-[1.5px] px-[13px] pt-[7px] text-[14px] font-semibold transition-[background-color,border-color,color] duration-150 ${
                  active
                    ? "border-brand bg-chip-neutral-bg text-brand"
                    : "border-line bg-white text-body hover:border-[#C3C9DA]"
                }`}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>

        {ledger.length === 0 ? (
          <StateMessage
            title="No entries match this filter"
            action={<ButtonLink href="/seller/billing/history">Show all</ButtonLink>}
          >
            {show === "recharge"
              ? "There are no recharges on this account yet."
              : "There are no lead purchases on this account yet."}
          </StateMessage>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <caption className="sr-only">
                Ledger entries, newest first, with the balance after each entry
              </caption>
              <thead>
                <tr className="border-b border-line bg-tint">
                  <Th>Date</Th>
                  <Th>Description</Th>
                  <Th>Reference</Th>
                  <Th align="right">Amount</Th>
                  <Th align="right">Balance</Th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((entry) => (
                  <tr key={entry.id} className="border-b border-line last:border-b-0">
                    <Td>{formatDate(entry.occurredAt)}</Td>
                    <Td strong>{entry.description}</Td>
                    <Td mono>{entry.id}</Td>
                    <Td align="right" tone={entry.deltaCredits < 0 ? "debit" : "credit"}>
                      {formatSignedInr(entry.deltaCredits)}
                    </Td>
                    <Td align="right">{formatCreditBalance(entry.balanceAfterCredits)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        <p className="t-caption text-muted">
          Every line is a ledger entry. Balances are derived from these entries and are never
          edited directly, so the column on the right can be checked against the one beside it.
        </p>
      </div>
    </SellerShell>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`t-label px-[16px] py-[11px] text-muted ${align === "right" ? "text-right" : "text-left"}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  strong = false,
  mono = false,
  tone,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  strong?: boolean;
  mono?: boolean;
  tone?: "debit" | "credit";
}) {
  const colour =
    tone === "debit" ? "text-danger font-bold" : tone === "credit" ? "text-success font-bold" : "";
  return (
    <td
      className={`px-[16px] py-[13px] text-[15px] ${align === "right" ? "text-right" : "text-left"} ${
        strong ? "font-bold text-ink" : "text-body"
      } ${mono ? "t-mono text-[13px]" : ""} ${colour}`}
    >
      {children}
    </td>
  );
}
