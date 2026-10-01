import type { DashboardAlert, QueueTile } from "@/lib/domain/admin";
import { intakeStoreKind } from "@/lib/services/backend/config";
import { bearerMode } from "@/lib/services/backend/session";
import {
  adminOperationsStore,
  getServices,
  listingStore,
  notificationStore,
  supportStore,
  verificationStore,
} from "@/lib/services";
import { kycCountTile, propertyCountTile } from "@/lib/services/backend/admin-queue-reading";
import { loadKycCounts, loadPropertyCount } from "@/lib/services/backend/admin-queues";

/**
 * Queue tiles the operations dashboard and the admin rail both read.
 *
 * The sample dashboard counts its own fixtures. Once a domain is served by
 * kkl-backend, that tile is counted from the same call the queue page uses.
 * KYC applications follow `KKL_VERIFICATION`. Live property review follows
 * `KKL_LISTINGS`. A failed count stays unavailable: it is not the sample
 * figure and it is not zero.
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

  if (verificationStore() === "backend") {
    const counts = await loadKycCounts();
    const tile = kycCountTile(counts);
    queues = queues.map((queue) => (queue.href === "/admin/kyc" ? tile : queue));
  }

  if (listingStore() === "backend") {
    const counts = await loadPropertyCount();
    const tile = propertyCountTile(counts);
    queues = queues.map((queue) => (queue.href === "/admin/properties" ? tile : queue));
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
