import type { ReactNode } from "react";
import { AvatarBadge, ConsoleShell } from "@/components/layout/console-shell";
import { SAMPLE_STAFF } from "@/lib/domain/identity";
import { getServices } from "@/lib/services";
import { adminRailItems, railCounts } from "./admin-nav";

/**
 * The shell every Admin screen uses.
 *
 * It reads the dashboard's own queue counts so the rail badges and A-02 cannot
 * disagree — both come from one call.
 *
 * The header names the staff identity this build records actions against. It is
 * a constant, not a session, and A-01 says so; the label here is so a reviewer
 * looking at any screen can see whose name an action would carry.
 */
export async function AdminShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const admin = getServices().admin;
  const [dashboard, notifications] = await Promise.all([
    admin.dashboard(),
    admin.listNotifications("failed"),
  ]);

  return (
    <ConsoleShell
      navLabel="Admin console"
      navEyebrow="Internal operations"
      // Twenty destinations under eight headings; the approved A-02 sets a
      // tighter step than the Seller and Builder rails use.
      dense
      tone="admin"
      items={adminRailItems(railCounts(dashboard.queues, notifications.length))}
      footer={null}
      title={title}
      subtitle={subtitle}
      aside={
        <>
          <span className="t-caption text-muted max-[860px]:hidden">
            {SAMPLE_STAFF.name} · {SAMPLE_STAFF.team}
          </span>
          <AvatarBadge name={SAMPLE_STAFF.name} />
        </>
      }
    >
      {children}
    </ConsoleShell>
  );
}
