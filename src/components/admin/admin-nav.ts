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
  verification: number;
  listings: number;
  ownerListings: number;
  tickets: number;
  refunds: number;
  notifications: number;
}): readonly RailItem[] {
  const badge = (n: number) => (n > 0 ? String(n) : null);
  return [
    { group: "OVERVIEW", href: "/admin", label: "Dashboard", match: "exact" },

    { group: "ACCOUNTS", href: "/admin/users", label: "Users" },
    { group: "ACCOUNTS", href: "/admin/kyc", label: "KYC queue", badge: badge(counts.kyc) },
    // CR07: verification cases under the confirmed action-based policy. Separate
    // from the KYC queue above, which is document submissions: this one answers
    // whether a check was required for an action at all, and its badge counts
    // only what needs a person — routine processing is not a backlog.
    {
      group: "ACCOUNTS",
      href: "/admin/verification",
      label: "Verification cases",
      badge: badge(counts.verification),
    },
    { group: "ACCOUNTS", href: "/admin/subscriptions", label: "Subscriptions" },

    { group: "LISTINGS", href: "/admin/properties", label: "Property review", badge: badge(counts.listings) },
    // CR02: individual owners' submissions. A separate queue from Property
    // review because it is a different question — that screen handles live and
    // reported listings, this one handles listings that have never been live
    // and, under the confirmed owner decision, do not go live by being accepted.
    { group: "LISTINGS", href: "/admin/owner-listings", label: "Owner submissions", badge: badge(counts.ownerListings) },

    { group: "LEADS", href: "/admin/leads/intake", label: "Lead intake" },
    { group: "LEADS", href: "/admin/leads", label: "Leads", excludePrefix: "/admin/leads/intake" },
    // CR03: the Request Leads queue — Sellers' requests for leads, handled here.
    { group: "LEADS", href: "/admin/requests", label: "Lead requests" },
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
  ownerListings = 0,
  verification = 0,
): Parameters<typeof adminRailItems>[0] {
  const find = (label: string) =>
    queues.find((q) => q.label.toLowerCase().startsWith(label))?.value ?? 0;
  return {
    kyc: find("kyc"),
    verification,
    listings: find("listings"),
    ownerListings,
    tickets: find("support"),
    refunds: find("refund"),
    notifications,
  };
}
