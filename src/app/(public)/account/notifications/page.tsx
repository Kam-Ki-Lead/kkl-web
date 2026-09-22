import Link from "next/link";
import type { Metadata } from "next";
import { getServices } from "@/lib/services";
import { runtimeConfig } from "@/lib/config/runtime";
import { formatDate } from "@/lib/format";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions/notifications";
import { Card } from "@/components/ui/card";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { Button, ButtonLink } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/states";
import type { NotificationCategory } from "@/lib/domain/types";

export const metadata: Metadata = { title: "Notifications" };

const CATEGORY: Record<NotificationCategory, { label: string; tone: ChipTone }> = {
  enquiry: { label: "Enquiry", tone: "neutral" },
  match: { label: "Match", tone: "success" },
  account: { label: "Account", tone: "muted" },
};

/** P-16 — notifications, with empty, unread and read states. */
export default async function NotificationsPage() {
  const notifications = await getServices().notifications.list();
  const unread = notifications.filter((n) => n.readAt === null).length;

  return (
    <div className="mx-auto max-w-[760px] px-[32px] pb-[60px] pt-[28px] max-[1060px]:px-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-[12px]">
        <div>
          <h1 className="t-title text-ink">Notifications</h1>
          <p className="t-body mt-[6px] text-body">
            {unread === 0
              ? "Everything here has been read."
              : `${unread} unread of ${notifications.length}.`}
          </p>
        </div>
        {unread > 0 ? (
          <form action={markAllNotificationsRead}>
            <Button type="submit" variant="secondary" size="sm">
              Mark all as read
            </Button>
          </form>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <div className="mt-[20px]">
          <StateMessage
            title="No notifications yet"
            action={
              <ButtonLink href="/search" size="sm">
                Browse properties
              </ButtonLink>
            }
          >
            When a builder replies to an enquiry, or new projects match your requirement, you
            will hear about it here.
          </StateMessage>
        </div>
      ) : (
        <ul className="mt-[20px] flex flex-col gap-[10px]">
          {notifications.map((n) => {
            const isUnread = n.readAt === null;
            const meta = CATEGORY[n.category];
            return (
              <li key={n.id}>
                <Card
                  className={`p-[16px] ${isUnread ? "border-l-[3px] border-l-brand bg-tint" : ""}`}
                >
                  <div className="flex flex-wrap items-center gap-[10px]">
                    <Chip tone={meta.tone}>{meta.label}</Chip>
                    {isUnread ? (
                      <span className="inline-flex items-center gap-[6px] text-[13px] font-bold text-brand">
                        <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full bg-saffron" />
                        Unread
                      </span>
                    ) : (
                      <span className="t-caption text-muted">
                        Read {formatDate(n.readAt as string)}
                      </span>
                    )}
                    <span className="t-caption ml-auto text-muted">
                      {formatDate(n.createdAt)}
                    </span>
                  </div>

                  <h2 className={`t-card-title mt-[8px] ${isUnread ? "text-ink" : "text-body"}`}>
                    {n.title}
                  </h2>
                  <p className="t-caption mt-[4px] text-body">{n.body}</p>

                  <div className="mt-[12px] flex flex-wrap items-center gap-[12px]">
                    {n.href ? (
                      <Link
                        href={n.href}
                        className="text-[15px] font-semibold text-brand hover:text-brand-deep"
                      >
                        Open <span aria-hidden="true">→</span>
                      </Link>
                    ) : null}
                    {isUnread ? (
                      <form action={markNotificationRead}>
                        <input type="hidden" name="id" value={n.id} />
                        <button
                          type="submit"
                          className="min-h-[44px] text-[15px] font-semibold text-brand underline underline-offset-2 hover:text-brand-deep"
                        >
                          Mark as read
                        </button>
                      </form>
                    ) : null}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {runtimeConfig.isSampleMode ? (
        <p className="t-caption mt-[16px] text-muted">
          Sample notifications. Nothing was delivered by WhatsApp, email or push, and read state
          is held in the server&rsquo;s memory for this review session only.
        </p>
      ) : null}
    </div>
  );
}
