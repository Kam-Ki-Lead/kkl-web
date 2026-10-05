import type { ReactNode } from "react";
import { headers } from "next/headers";
import { AvatarBadge, ConsoleShell } from "@/components/layout/console-shell";
import { ServiceError } from "@/lib/services/contracts";
import { redirectForAuth } from "@/lib/auth/recover";
import { readSignedInProfile } from "@/lib/auth/backend";
import { SAMPLE_STAFF } from "@/lib/domain/identity";
import { getServices } from "@/lib/services";
import { liveAdminQueues } from "@/lib/services/live-admin-queues";
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
  let signedInName: string | null = null;
  let signedInRole: string | null = null;
  if (bearerMode() === "browser-session") {
    try {
      const profile = await readSignedInProfile();
      signedInName = profile.displayName;
      signedInRole = profile.role;
    } catch (error) {
      redirectForAuth(error, (await headers()).get("x-kkl-path") ?? "/admin");
      if (!(error instanceof ServiceError && error.kind === "unavailable")) throw error;
      signedInName = "Session";
    }
    if (signedInRole !== "staff") {
      return (
        <section className="mx-auto flex max-w-[640px] flex-col gap-[12px] px-[24px] py-[48px]">
          <h1 className="t-page-title">{title}</h1>
          <p role="alert" className="t-body text-body">
            {signedInName === "Session"
              ? "The account could not be read. This screen does not open the sample queues."
              : signedInRole
                ? `This session is a ${signedInRole} account. The operations console is for a staff account, and this screen does not open the sample queues.`
                : "This session has no staff role. The operations console does not open the sample queues."}
          </p>
          {signedInName ? (
            <p className="t-caption text-muted">Signed in as {signedInName}.</p>
          ) : null}
        </section>
      );
    }
  }

  const admin = getServices().admin;
  const [live, notifications, ownerListings, verification] = await Promise.all([
    liveAdminQueues(),
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

  const asideName = signedInName ?? SAMPLE_STAFF.name;
  let asideTeam = signedInName ? "Signed-in session" : SAMPLE_STAFF.team;
  if (bearerMode() === "browser-session" && signedInName === "Session") {
    asideTeam = "Account could not be read";
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
        railCounts(live.queues, notifications.length, ownerWaiting, verification.attention.length),
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
