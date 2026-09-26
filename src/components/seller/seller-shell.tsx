import type { ReactNode } from "react";
import Link from "next/link";
import { AvatarBadge, ConsoleShell } from "@/components/layout/console-shell";
import { sellerRailFooter, sellerRailItems } from "./seller-nav";
import { formatCreditBalance } from "@/lib/format";
import { getServices } from "@/lib/services";

/**
 * The shell every railed Seller screen uses (S-05 to S-25).
 *
 * It fetches the account and wallet itself rather than taking them as props, so
 * a screen cannot render a stale balance in the header while showing a fresh one
 * in its body. Both come from the same request.
 */
export async function SellerShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const services = getServices();
  const [account, wallet, market] = await Promise.all([
    services.sellerAccount.get(),
    services.credits.wallet(),
    services.leadMarket.list({}),
  ]);

  const balance = formatCreditBalance(wallet.balanceCredits);

  return (
    <ConsoleShell
      navLabel="Seller console"
      items={sellerRailItems(market.total)}
      footer={sellerRailFooter(balance)}
      title={title}
      subtitle={subtitle}
      aside={
        <>
          {/* Approved Seller Console header: the balance is an outlined pill
              button to billing — 15px/700 ink on #F6F8FD with a #D4DBF3
              border — visible down to 480px. Not a status chip. */}
          <Link
            href="/seller/billing"
            className="flex items-center gap-[8px] whitespace-nowrap rounded-full border-[1.5px] border-[#D4DBF3] bg-[#F6F8FD] px-[14px] py-[9px] text-[15px] font-bold text-ink max-[479px]:hidden"
          >
            <span aria-hidden="true" className="text-brand">
              ◈
            </span>
            {balance}
          </Link>
          <AvatarBadge name={account.contactName} />
        </>
      }
    >
      {children}
    </ConsoleShell>
  );
}
