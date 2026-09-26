import type { ReactNode } from "react";
import { AvatarBadge, ConsoleShell } from "@/components/layout/console-shell";
import { builderRailFooter, builderRailItems } from "./builder-nav";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { getServices } from "@/lib/services";
import type { BuilderSubscriptionState } from "@/lib/domain/types";

const SUBSCRIPTION: Record<
  BuilderSubscriptionState,
  { label: string; tone: ChipTone }
> = {
  none: { label: "No subscription", tone: "muted" },
  active: { label: "Active", tone: "success" },
  due: { label: "Renewal due", tone: "warning" },
  grace: { label: "In grace", tone: "warning" },
  expired: { label: "Expired", tone: "danger" },
};

/**
 * The shell every Builder screen uses.
 *
 * It fetches the account and the unread count itself so the rail badge and the
 * screen body cannot disagree — both come from the same request.
 */
export async function BuilderShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const services = getServices().builder;
  const [account, unread] = await Promise.all([
    services.account.get(),
    services.enquiries.unreadCount(),
  ]);

  const status = SUBSCRIPTION[account.subscription.state];

  return (
    <ConsoleShell
      navLabel="Builder console"
      navEyebrow="Builder"
      items={builderRailItems(unread)}
      footer={builderRailFooter(status.label, account.subscription.state === "none" ? "Subscribe" : "Manage")}
      title={title}
      subtitle={subtitle}
      aside={
        <>
          {/* Approved Builder console header: the subscription chip is 14px/700
              (larger than a status chip) and stays visible down to 480px. */}
          <Chip tone={status.tone} size="lg" className="max-[479px]:hidden">
            {status.label}
          </Chip>
          <AvatarBadge name={account.contactName} />
        </>
      }
    >
      {children}
    </ConsoleShell>
  );
}
