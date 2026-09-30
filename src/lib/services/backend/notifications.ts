import type { NotificationRecord, NotificationState } from "@/lib/domain/admin";
import type { NotificationService } from "@/lib/services/contracts";
import { ServiceError } from "@/lib/services/contracts";
import type { BuyerNotification, NotificationCategory } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/format";
import { callAs, type BackendRole } from "./session";

/**
 * In-app notifications, served by kkl-backend.
 *
 * IN-APP IS THE ONLY CLAIM MADE HERE
 * These are records for an account to read in the application. Whether
 * anything was *sent* to that person by email or WhatsApp is a different
 * question with a different answer — no, because no provider credentials
 * exist (Q-7) — and it lives on the delivery queue rather than here. This
 * service deliberately exposes no "sent" flag, because there is nothing true
 * it could put in one.
 */

type BackendNotification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  subject: { kind: string; id: string } | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
};

/**
 * kkl-backend's kinds are event names; the approved screens group them into
 * three categories. The mapping is explicit rather than a prefix match, so a
 * new kind appears under `account` and is noticed, instead of silently
 * landing in whichever bucket a substring happened to hit.
 */
const CATEGORY: Record<string, NotificationCategory> = {
  "enquiry.received": "enquiry",
  "support.replied": "account",
  "support.resolved": "account",
  "listing.decision": "account",
  "lead_request.status_changed": "match",
  "lead.purchased": "match",
};

/** Where a notification points, when it points anywhere in the application. */
function hrefFor(n: BackendNotification): string | null {
  if (!n.subject) return null;
  switch (n.subject.kind) {
    case "support_ticket": return `/seller/support`;
    case "listing": return `/owner/listings/${n.subject.id}`;
    case "lead_request": return `/seller/requests/${n.subject.id}`;
    case "order": return `/seller/orders`;
    default: return null;
  }
}

const toBuyerNotification = (n: BackendNotification): BuyerNotification => ({
  id: n.id,
  category: CATEGORY[n.kind] ?? "account",
  title: n.title,
  body: n.body,
  createdAt: n.createdAt,
  readAt: n.readAt,
  href: hrefFor(n),
});

function raise(status: number, body: { error?: string }): never {
  throw new ServiceError("unavailable", body.error ?? `The notification service returned ${status}.`);
}

export function backendNotifications(role: BackendRole): NotificationService {
  return {
    async list() {
      const { status, body } = await callAs<{ notifications: BackendNotification[] }>(
        role, "/v1/notifications");
      if (status !== 200) raise(status, body);
      return body.notifications.map(toBuyerNotification);
    },

    async markRead(id) {
      const { status, body } = await callAs<{ marked: number }>(role, "/v1/notifications/read", {
        method: "POST", body: { id },
      });
      if (status !== 200) raise(status, body);
    },

    async markAllRead() {
      const { status, body } = await callAs<{ marked: number }>(role, "/v1/notifications/read", {
        method: "POST", body: {},
      });
      if (status !== 200) raise(status, body);
    },

    async unreadCount() {
      const { status, body } = await callAs<{ unread: number }>(
        role, "/v1/notifications?unreadOnly=true");
      if (status !== 200) raise(status, body);
      return body.unread;
    },
  };
}

type BackendDelivery = {
  id: string;
  notificationId: string;
  kind: string;
  channel: string;
  status: string;
  attempts: number;
  lastError: string | null;
  nextAttemptAt: string | null;
  sentAt: string | null;
};

const DELIVERY_STATES: readonly NotificationState[] = [
  "queued", "sending", "sent", "failed", "suppressed", "unconfigured", "retrying",
];

function deliveryState(status: string): NotificationState {
  return DELIVERY_STATES.find((state) => state === status) ?? "unconfigured";
}

/**
 * Staff and the owning account read `GET /v1/notifications/deliveries`.
 *
 * The row has a channel and a status. It does not have an address, so this
 * adapter does not invent a recipient. `unconfigured` and `suppressed` stay
 * themselves: collapsing either into `failed` would say a message was attempted
 * and bounced.
 */
export const backendAdminDeliveries = {
  async listNotifications(filter?: NotificationState): Promise<readonly NotificationRecord[]> {
    const { status, body } = await callAs<{ deliveries: BackendDelivery[] }>(
      "staff", "/v1/notifications/deliveries");
    if (status === 401) {
      throw new ServiceError("unauthenticated", body.error ?? "Sign in again to read deliveries.");
    }
    if (status === 403) {
      throw new ServiceError("forbidden", body.error ?? "This session cannot read deliveries.");
    }
    if (status !== 200) raise(status, body);
    const records = body.deliveries.map((delivery): NotificationRecord => ({
      id: delivery.id,
      when: formatDateTime(delivery.sentAt ?? delivery.nextAttemptAt),
      recipientName: delivery.kind,
      recipientNumber: "No address is stored",
      channel: delivery.channel,
      message: delivery.lastError ?? "No provider error recorded",
      state: deliveryState(delivery.status),
    }));
    return filter ? records.filter((record) => record.state === filter) : records;
  },
};
