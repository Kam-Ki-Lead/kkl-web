import type { ReactNode } from "react";
import { headers } from "next/headers";
import { AvatarBadge, ConsoleShell } from "@/components/layout/console-shell";
import { builderRailFooter, builderRailItems } from "./builder-nav";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { ServiceError } from "@/lib/services/contracts";
import { redirectForAuth } from "@/lib/auth/recover";
import { readSignedInProfile } from "@/lib/auth/backend";
import { getServices } from "@/lib/services";
import { bearerMode } from "@/lib/services/backend/session";
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
  let signedInName: string | null = null;
  let signedInRole: string | null = null;
  if (bearerMode() === "browser-session") {
    try {
      const profile = await readSignedInProfile();
      signedInName = profile.displayName;
      signedInRole = profile.role;
    } catch (error) {
      redirectForAuth(error, (await headers()).get("x-kkl-path") ?? "/builder");
      if (!(error instanceof ServiceError && error.kind === "unavailable")) throw error;
      signedInName = "Session";
    }
    if (signedInRole !== null && signedInRole !== "builder") {
      return (
        <section className="mx-auto flex max-w-[640px] flex-col gap-[12px] px-[24px] py-[48px]">
          <h1 className="t-page-title">{title}</h1>
          <p role="alert" className="t-body text-body">
            This session is a {signedInRole} account. The Builder console is for a builder
            account, and this screen does not open the sample builder.
          </p>
          {signedInName ? (
            <p className="t-caption text-muted">Signed in as {signedInName}.</p>
          ) : null}
        </section>
      );
    }
  }

  let account;
  let unread;
  try {
    [account, unread] = await Promise.all([
      services.account.get(),
      services.enquiries.unreadCount(),
    ]);
  } catch (error) {
    redirectForAuth(error, (await headers()).get("x-kkl-path") ?? "/builder");
    if (error instanceof ServiceError && (error.kind === "forbidden" || error.kind === "unavailable")) {
      return (
        <section className="mx-auto flex max-w-[640px] flex-col gap-[12px] px-[24px] py-[48px]">
          <h1 className="t-page-title">{title}</h1>
          <p role="alert" className="t-body text-body">
            {error.message}
          </p>
          {signedInName ? (
            <p className="t-caption text-muted">Signed in as {signedInName}.</p>
          ) : null}
        </section>
      );
    }
    throw error;
  }

  const status = SUBSCRIPTION[account.subscription.state];
  const asideName = signedInName ?? account.contactName;

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
          <AvatarBadge name={asideName} />
        </>
      }
    >
      {children}
    </ConsoleShell>
  );
}
