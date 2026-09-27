import type { RailFooter, RailItem } from "@/components/layout/dashboard-rail";

/**
 * The Seller console's rail items, as approved in S-06.
 *
 * `badge` is a count the server supplies. It is not computed here and it is not
 * a permission: an item is shown whether or not the account may currently use
 * it, and kkl-backend refuses the request if it may not.
 */
export function sellerRailItems(newLeadCount: number | null): readonly RailItem[] {
  return [
    // Exact: "/seller" is a prefix of every other route in the console.
    { href: "/seller", label: "Dashboard", match: "exact" },
    {
      href: "/seller/leads",
      // CR01: the marketplace entry is named for the action — buying leads.
      label: "Buy Leads",
      badge: newLeadCount && newLeadCount > 0 ? `${newLeadCount} new` : null,
    },
    { href: "/seller/purchased", label: "My leads" },
    // CR04: the commercial record of what was bought, separate from the working
    // list of leads to call. Different question, different screen.
    { href: "/seller/orders", label: "My purchases" },
    // CR03: Request Leads is its own journey, separate from buying an
    // available lead — the rail names it for what it is.
    { href: "/seller/requests", label: "Lead requests" },
    // CR07: what needs checking, per action. Not the same question as "is my
    // KYC submission approved", which lives under Profile.
    { href: "/seller/verification", label: "Verification" },
    { href: "/seller/billing", label: "Billing & credits" },
    { href: "/seller/support", label: "Support" },
    { href: "/seller/profile", label: "Profile" },
  ];
}

export function sellerRailFooter(balanceLabel: string): RailFooter {
  return {
    label: "Credit balance",
    value: balanceLabel,
    actionHref: "/seller/billing/recharge",
    actionLabel: "Recharge",
    // Approved Seller Console rail footer: the balance is 24px/800 Archivo.
    valueClassName: "text-[24px]",
  };
}
