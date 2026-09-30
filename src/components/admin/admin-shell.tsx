import type { ReactNode } from "react";
import { headers } from "next/headers";
import { AvatarBadge, ConsoleShell } from "@/components/layout/console-shell";
import { ServiceError } from "@/lib/services/contracts";
import { redirectForAuth } from "@/lib/auth/recover";
import { readSignedInProfile } from "@/lib/auth/backend";
import { SAMPLE_STAFF } from "@/lib/domain/identity";
import { getServices } from "@/lib/services";
import { bearerMode } from "@/lib/services/backend/session";
import { adminRailItems, railCounts } from "./admin-nav";

/**
 * The shell every Admin screen uses.
 *
 * It reads the dashboard's own queue counts so the rail badges and A-02 cannot
 * disagree — both come from one call.
 *
 * The header names who an action is attributed to. With `KKL_AUTH` unset that
 * is the labelled sample staff identity. With `KKL_AUTH=backend` it is the
 * signed-in account, and a missing session returns to sign-in. The header
 * does not turn a customer account into staff.
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
  const [dashboard, notifications, ownerListings, verification] = await Promise.all([
    admin.dashboard(),
    admin.listNotifications("failed"),
    // CR02: the rail badge counts what is actually waiting for a person —
    // submitted and awaiting-resubmission — not everything in the queue.
    admin.listOwnerListings(),
    // CR07: the badge counts cases waiting on a person. Routine processing is
    // not a backlog and must not read as one.
    admin.verificationQueues(),
  ]);
  const ownerWaiting = ownerListings.filter(
    (l) => l.status === "submitted" || l.status === "in_review",
  ).length;

  let asideName = SAMPLE_STAFF.name;
  let asideTeam = SAMPLE_STAFF.team;
  if (bearerMode() === "browser-session") {
    try {
      const profile = await readSignedInProfile();
      asideName = profile.displayName;
      asideTeam = profile.status === "suspended" ? "Suspended" : "Signed-in session";
    } catch (error) {
      redirectForAuth(error, (await headers()).get("x-kkl-path") ?? "/admin");
      if (error instanceof ServiceError && error.kind === "unavailable") {
        asideName = "Session";
        asideTeam = "Account could not be read";
      } else {
        throw error;
      }
    }
  }

  return (
    <ConsoleShell
      navLabel="Admin console"
      navEyebrow="Internal operations"
      // Twenty destinations under eight headings; the approved A-02 sets a
      // tighter step than the Seller and Builder rails use.
      dense
      tone="admin"
      items={adminRailItems(
        railCounts(dashboard.queues, notifications.length, ownerWaiting, verification.attention.length),
      )}
      footer={null}
      title={title}
      subtitle={subtitle}
      aside={
        <>
          <span className="t-caption text-muted max-[860px]:hidden">
            {asideName} · {asideTeam}
          </span>
          <AvatarBadge name={asideName} />
        </>
      }
    >
      {children}
    </ConsoleShell>
  );
}
