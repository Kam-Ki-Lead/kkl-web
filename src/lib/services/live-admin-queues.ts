import type { DashboardAlert, QueueTile } from "@/lib/domain/admin";
import { intakeStoreKind } from "@/lib/services/backend/config";
import { bearerMode } from "@/lib/services/backend/session";
import {
  adminOperationsStore,
  getServices,
  notificationStore,
  supportStore,
} from "@/lib/services";

/**
 * Queue tiles the operations dashboard and the admin rail both read.
 *
 * The sample dashboard counts its own fixtures. Once a domain is served by
 * kkl-backend, that tile is counted from the same call the queue page uses.
 * KYC applications and moderated property review stay on the sample tiles:
 * those screens are still the sample queues, and zeroing the badge while the
 * page lists fixture rows would be a second disagreement.
 */
export async function liveAdminQueues(): Promise<{
  queues: readonly QueueTile[];
  alerts: readonly DashboardAlert[];
}> {
  const services = getServices();
  const dashboard = await services.admin.dashboard();
  let queues = dashboard.queues.map((queue) => ({ ...queue }));

  if (supportStore() === "backend") {
    const tickets = await services.admin.listTickets();
    const waiting = tickets.filter((ticket) => ticket.state === "awaiting_reply").length;
    queues = queues.map((queue) =>
      queue.href === "/admin/support"
        ? {
            ...queue,
            value: tickets.length,
            note: `${waiting} awaiting first reply`,
            flag: null,
            tone: "neutral" as const,
          }
        : queue,
    );
  }

  if (adminOperationsStore() === "backend") {
    const refunds = await services.admin.listRefunds();
    const open = refunds.filter((refund) => refund.decision === null).length;
    queues = queues.map((queue) =>
      queue.href === "/admin/refunds"
        ? {
            ...queue,
            value: open,
            note: open === 0 ? "No refund request is stored" : "Awaiting a decision",
            flag: null,
            tone: "neutral" as const,
          }
        : queue,
    );
  }

  let alerts = [...dashboard.alerts];
  if (bearerMode() === "browser-session") {
    if (notificationStore() === "backend") {
      alerts = alerts.filter((alert) => alert.href !== "/admin/notifications");
    }
    if (intakeStoreKind() === "backend") {
      alerts = alerts.filter((alert) => !alert.href.startsWith("/admin/leads/intake"));
    }
    alerts = alerts.filter((alert) => alert.href !== "/admin/system");
  }

  return { queues, alerts };
}
