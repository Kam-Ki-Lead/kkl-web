import type { NotificationService } from "@/lib/services/contracts";
import { ServiceError } from "@/lib/services/contracts";
import type { BuyerNotification, NotificationCategory } from "@/lib/domain/types";
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
