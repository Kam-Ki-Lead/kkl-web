import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminTable, Primary } from "@/components/admin/admin-table";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { getServices } from "@/lib/services";
import type { NotificationRecord } from "@/lib/domain/admin";

export const metadata: Metadata = { title: "Notification delivery", robots: { index: false } };

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Sent", value: "sent" },
  { label: "Failed", value: "failed" },
  { label: "Retrying", value: "retrying" },
];

const STATE: Record<NotificationRecord["state"], { label: string; tone: ChipTone }> = {
  sent: { label: "Sent", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  retrying: { label: "Retrying", tone: "warning" },
};

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/**
 * A-27 — sent, failed and retrying.
 *
 * **Read-only, and there is no resend.** Failures retry on a schedule, and a
 * number on the suppression list is never sent to at all — a manual resend
 * button is the one control that could push a message past that, so it does not
 * exist. The rows do not open further because there is nothing further to show
 * that is not the message body, which staff have no reason to read.
 */
export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter = one(params.filter) || "all";
  const query = one(params.q).trim().toLowerCase();

  const all = await getServices().admin.listNotifications();
  const rows = all.filter((notification) => {
    if (filter !== "all" && notification.state !== filter) return false;
    if (!query) return true;
    return `${notification.recipientName} ${notification.channel} ${notification.message}`
      .toLowerCase()
      .includes(query);
  });

  return (
    <AdminShell title="Notification delivery" subtitle="Sent, failed and retrying">
      <AdminTable
        basePath="/admin/notifications"
        filters={FILTERS}
        activeFilter={filter}
        query={one(params.q)}
        countLabel={`${rows.length} of ${all.length} notifications`}
        emptyTitle="No notifications match"
        emptyBody="Nothing matches this filter and search."
        footnote="Read-only. Failures are retried automatically on a schedule, and nothing can be sent to a number on the suppression list — so there is no resend action here and the rows do not open further. No notification has actually been sent in this build; these records are fixtures."
        columns={[
          { header: "WHEN", width: "0.9fr" },
          { header: "RECIPIENT", width: "1.2fr" },
          { header: "CHANNEL", width: "0.8fr" },
          { header: "MESSAGE", width: "1.4fr" },
          { header: "STATE", width: "0.9fr" },
        ]}
        rows={rows.map((notification) => ({
          key: notification.id,
          href: null,
          cells: [
            notification.when,
            <Primary key="to" sub={notification.recipientNumber}>
              {notification.recipientName}
            </Primary>,
            notification.channel,
            notification.message,
            <Chip key="state" tone={STATE[notification.state].tone}>
              {STATE[notification.state].label}
            </Chip>,
          ],
        }))}
      />
    </AdminShell>
  );
}
