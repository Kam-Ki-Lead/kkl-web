import type { RailFooter, RailItem } from "@/components/layout/dashboard-rail";

/** The Builder console's rail, as approved in B-06. */
export function builderRailItems(unreadEnquiries: number): readonly RailItem[] {
  return [
    { href: "/builder", label: "Dashboard", match: "exact" },
    { href: "/builder/properties", label: "My properties" },
    {
      href: "/builder/enquiries",
      label: "Enquiries",
      badge: unreadEnquiries > 0 ? `${unreadEnquiries} new` : null,
    },
    { href: "/builder/subscription", label: "Subscription" },
    { href: "/builder/marketplace", label: "Lead marketplace" },
    { href: "/builder/leads", label: "My leads" },
    { href: "/builder/billing", label: "Billing & credits" },
    { href: "/builder/support", label: "Support" },
    { href: "/builder/profile", label: "Profile" },
  ];
}

/**
 * The rail's footer card.
 *
 * The Builder's is the subscription, not a credit balance — publishing depends
 * on it, so it is the thing worth keeping in view. Credits matter too but they
 * are one module among several here, rather than the whole product.
 */
export function builderRailFooter(state: string, renewsLabel: string): RailFooter {
  return {
    label: "Subscription",
    value: state,
    actionHref: "/builder/subscription",
    actionLabel: renewsLabel,
    // Approved Builder Console rail footer: the state is 17px/800 Archivo.
    valueClassName: "text-[17px]",
  };
}
