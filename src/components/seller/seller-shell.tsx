import type { ReactNode } from "react";
import { AvatarBadge, ConsoleShell } from "@/components/layout/console-shell";
import { sellerRailFooter, sellerRailItems } from "./seller-nav";
import { Chip } from "@/components/ui/chip";
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
          <Chip tone="neutral" className="max-[560px]:hidden">
            ◈ {balance}
          </Chip>
          <AvatarBadge name={account.contactName} />
        </>
      }
    >
      {children}
    </ConsoleShell>
  );
}
