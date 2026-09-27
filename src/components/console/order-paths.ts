import type { OrderPaths } from "./order-views";

/**
 * CR04 — where each console's order screens link to.
 *
 * Kept beside the views rather than inside them: the views are the same for both
 * consoles, the paths are not, and passing them in is what stops a Builder
 * screen linking a Seller into somebody else's console.
 */
export const SELLER_ORDER_PATHS: OrderPaths = {
  ordersHref: "/seller/orders",
  leadHref: (leadId) => `/seller/purchased/${leadId}`,
  marketplaceHref: "/seller/leads",
  ledgerHref: "/seller/billing/history",
};

export const BUILDER_ORDER_PATHS: OrderPaths = {
  ordersHref: "/builder/orders",
  leadHref: (leadId) => `/builder/leads/${leadId}`,
  marketplaceHref: "/builder/marketplace",
  ledgerHref: "/builder/billing/history",
};
