import type { RailItem } from "@/components/layout/dashboard-rail";
import type { QueueTile } from "@/lib/domain/admin";

/**
 * The Admin rail, grouped as the approved A-02 shows it.
 *
 * Twenty destinations under eight headings. The badges are counted from the
 * live queues rather than written down, so a rail that says 7 and a queue that
 * holds 4 cannot happen.
 *
 * **Which items appear says nothing about what anybody may do.** There is one
 * staff identity in this build and no sign-in; real staff roles would hide some
 * of these and, more importantly, would be enforced server-side on every
 * request. Hiding a link has never been a permission check.
 */
export function adminRailItems(counts: {
  kyc: number;
  listings: number;
  tickets: number;
  refunds: number;
  notifications: number;
}): readonly RailItem[] {
  const badge = (n: number) => (n > 0 ? String(n) : null);
  return [
    { group: "OVERVIEW", href: "/admin", label: "Dashboard", match: "exact" },

    { group: "ACCOUNTS", href: "/admin/users", label: "Users" },
    { group: "ACCOUNTS", href: "/admin/kyc", label: "KYC queue", badge: badge(counts.kyc) },
    { group: "ACCOUNTS", href: "/admin/subscriptions", label: "Subscriptions" },

    { group: "LISTINGS", href: "/admin/properties", label: "Property review", badge: badge(counts.listings) },

    { group: "LEADS", href: "/admin/leads/intake", label: "Lead intake" },
    { group: "LEADS", href: "/admin/leads", label: "Leads", match: "exact" },
    { group: "LEADS", href: "/admin/settings/pricing", label: "Pricing & aging" },

    { group: "MONEY", href: "/admin/orders", label: "Orders" },
    { group: "MONEY", href: "/admin/wallets", label: "Wallets & credits" },
    { group: "MONEY", href: "/admin/refunds", label: "Refunds", badge: badge(counts.refunds) },

    { group: "QUALIFICATION", href: "/admin/voice", label: "Voice calls" },
    { group: "QUALIFICATION", href: "/admin/whatsapp", label: "WhatsApp" },
    { group: "QUALIFICATION", href: "/admin/consent", label: "Consent & suppression" },

    { group: "SUPPORT", href: "/admin/support", label: "Support queue", badge: badge(counts.tickets) },

    { group: "SYSTEM", href: "/admin/notifications", label: "Notifications", badge: badge(counts.notifications) },
    { group: "SYSTEM", href: "/admin/reports", label: "Reports" },
    { group: "SYSTEM", href: "/admin/audit", label: "Audit log" },
    { group: "SYSTEM", href: "/admin/system", label: "Jobs & integrations" },
    { group: "SYSTEM", href: "/admin/settings", label: "Platform settings", match: "exact" },
  ];
}

/** Counts for the rail badges, taken from the same tiles A-02 renders. */
export function railCounts(
  queues: readonly QueueTile[],
  notifications: number,
): Parameters<typeof adminRailItems>[0] {
  const find = (label: string) =>
    queues.find((q) => q.label.toLowerCase().startsWith(label))?.value ?? 0;
  return {
    kyc: find("kyc"),
    listings: find("listings"),
    tickets: find("support"),
    refunds: find("refund"),
    notifications,
  };
}
