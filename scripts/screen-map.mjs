/**
 * Every inventory row, mapped to the evidence that covers it.
 *
 * The inventory has 113 rows and they are not 113 routes. Three kinds:
 *
 *   pair      A prototype screen exists and an application route renders it.
 *             Captured as a side-by-side pair.
 *   nested    The row is a state inside another screen and the prototype has
 *             no separate screen for it. Covered by the parent's pair plus the
 *             named state evidence.
 *   library   C-01..C-12 — the shared component library, not a screen. Covered
 *             by component evidence plus the screen context named here.
 *
 * `setup` names a sequence the implementation needs before the screen exists
 * at all: a purchase result that no browser has earned cannot be opened, and
 * should not be.
 */

const BUYER = 'KKL Buyer Journey.dc.html';
const SELLER = 'KKL Seller Console.dc.html';
const BUILDER = 'KKL Builder Console.dc.html';
const ADMIN = 'KKL Admin Console.dc.html';
const HOME = 'KKL Homepage - Portal Layout.dc.html';
const LIB = 'KKL Component and State Library.dc.html';

/** Both widths unless a screen has no distinct narrow layout to compare. */
const W = [1440, 390];

export const PAIRS = [
  // ---------------------------------------------------------------- public
  { id: 'P-01', file: HOME, screen: null, path: '/', widths: W },
  { id: 'P-02', file: BUYER, screen: 'P-02', path: '/search', widths: W },
  { id: 'P-03', file: BUYER, screen: 'P-03', path: '/property/greenview-residency', widths: W },
  { id: 'P-04', file: BUYER, screen: 'P-04', path: '/property/greenview-residency/enquiry', widths: W },
  { id: 'P-05', file: BUYER, screen: 'P-05', path: '/property/greenview-residency/site-visit', widths: W },
  { id: 'P-06', file: BUYER, screen: 'P-06', path: '/auth', widths: W },
  { id: 'P-07', file: BUYER, screen: 'P-07', path: null, widths: W, setup: 'enquiry-confirmed' },
  { id: 'P-08', file: BUYER, screen: 'P-08', path: '/find-my-match', widths: W },
  { id: 'P-09', file: BUYER, screen: 'P-09', path: '/find-my-match/review', widths: W },
  { id: 'P-10', file: BUYER, screen: 'P-10', path: '/matches', widths: W },
  { id: 'P-11', file: BUYER, screen: 'P-11', path: '/account/shortlist', widths: W },
  { id: 'P-12', file: BUYER, screen: 'P-12', path: '/account', widths: W },
  { id: 'P-13', file: BUYER, screen: 'P-13', path: '/account/enquiries', widths: W },
  { id: 'P-14', file: BUYER, screen: 'P-14', path: '/account/enquiries/e-39884', widths: W },
  { id: 'P-15', file: BUYER, screen: 'P-15', path: '/account/profile', widths: W },
  { id: 'P-16', file: BUYER, screen: 'P-16', path: '/account/notifications', widths: W },
  { id: 'P-17', file: BUYER, screen: 'P-17', path: '/builders', widths: W },
  { id: 'P-18', file: BUYER, screen: 'P-18', path: '/brokers', widths: W },
  { id: 'P-19', file: BUYER, screen: 'P-19', path: '/support', widths: W },
  { id: 'P-20', file: BUYER, screen: 'P-20', path: '/legal/terms', widths: W },

  // ---------------------------------------------------------------- seller
  { id: 'S-01', file: SELLER, screen: 'S-01', path: '/seller/register', widths: W },
  { id: 'S-02', file: SELLER, screen: 'S-02', path: '/seller/onboarding', widths: W },
  { id: 'S-03', file: SELLER, screen: 'S-03', path: '/seller/kyc', widths: W },
  { id: 'S-04', file: SELLER, screen: 'S-04', path: '/seller/kyc/status', widths: W },
  { id: 'S-05', file: SELLER, screen: 'S-05', path: '/seller/restricted', widths: W, setup: 'seller-suspended' },
  { id: 'S-06', file: SELLER, screen: 'S-06', path: '/seller', widths: W },
  { id: 'S-07', file: SELLER, screen: 'S-07', path: '/seller/leads', widths: W },
  { id: 'S-08', file: SELLER, screen: 'S-08', path: '/seller/leads/L-4471', widths: W },
  { id: 'S-09', file: SELLER, screen: 'S-09', path: '/seller/leads/L-4471/buy', widths: W },
  { id: 'S-11', file: SELLER, screen: 'S-11', path: null, widths: W, setup: 'purchase' },
  { id: 'S-12', file: SELLER, screen: 'S-12', path: '/seller/purchased', widths: W, setup: 'purchase-then' },
  { id: 'S-13', file: SELLER, screen: 'S-13', path: '/seller/purchased/L-4471', widths: W, setup: 'purchase-then' },
  { id: 'S-14', file: SELLER, screen: 'S-14', path: '/seller/billing', widths: W },
  { id: 'S-15', file: SELLER, screen: 'S-15', path: '/seller/billing/recharge', widths: W },
  { id: 'S-16', file: SELLER, screen: 'S-16', path: null, widths: W, setup: 'payment-success' },
  { id: 'S-17', file: SELLER, screen: 'S-17', path: '/seller/billing/history', widths: W },
  { id: 'S-18', file: SELLER, screen: 'S-18', path: '/seller/billing/expiry', widths: W },
  { id: 'S-19', file: SELLER, screen: 'S-19', path: '/seller/billing/invoices', widths: W },
  { id: 'S-20', file: SELLER, screen: 'S-20', path: '/seller/billing/invoices/INV-2026-0821', widths: W },
  { id: 'S-21', file: SELLER, screen: 'S-21', path: '/seller/billing/details', widths: W },
  { id: 'S-22', file: SELLER, screen: 'S-22', path: '/seller/support', widths: W },
  { id: 'S-23', file: SELLER, screen: 'S-23', path: '/seller/support/new', widths: W },
  { id: 'S-24', file: SELLER, screen: 'S-24', path: '/seller/support/T-2260', widths: W },
  { id: 'S-25', file: SELLER, screen: 'S-25', path: '/seller/profile', widths: W },

  // --------------------------------------------------------------- builder
  { id: 'B-01', file: BUILDER, screen: 'B-01', path: '/builder/register', widths: W },
  { id: 'B-02', file: BUILDER, screen: 'B-02', path: '/builder/verification', widths: W },
  { id: 'B-03', file: BUILDER, screen: 'B-03', path: '/builder/subscription', widths: W },
  { id: 'B-04', file: BUILDER, screen: 'B-04', path: null, widths: W, setup: 'builder-subscription-payment' },
  { id: 'B-05', file: BUILDER, screen: 'B-05', path: '/builder/subscription/renewal', widths: W },
  { id: 'B-06', file: BUILDER, screen: 'B-06', path: '/builder', widths: W },
  { id: 'B-07', file: BUILDER, screen: 'B-07', path: '/builder/properties', widths: W },
  { id: 'B-08', file: BUILDER, screen: 'B-08', path: '/builder/properties/bl-greenview/basics', widths: W },
  { id: 'B-09', file: BUILDER, screen: 'B-09', path: '/builder/properties/bl-greenview/location', widths: W },
  { id: 'B-10', file: BUILDER, screen: 'B-10', path: '/builder/properties/bl-greenview/pricing', widths: W },
  { id: 'B-11', file: BUILDER, screen: 'B-11', path: '/builder/properties/bl-greenview/specifications', widths: W },
  { id: 'B-12', file: BUILDER, screen: 'B-12', path: '/builder/properties/bl-greenview/media', widths: W },
  { id: 'B-13', file: BUILDER, screen: 'B-13', path: '/builder/properties/bl-greenview/preview', widths: W },
  { id: 'B-15', file: BUILDER, screen: 'B-15', path: '/builder/properties/bl-greenview/basics', widths: W, setup: 'dirty-editor' },
  { id: 'B-16', file: BUILDER, screen: 'B-16', path: '/builder/enquiries', widths: W },
  { id: 'B-17', file: BUILDER, screen: 'B-17', path: '/builder/enquiries/E-8801', widths: W },
  { id: 'B-18', file: BUILDER, screen: 'B-18', path: '/builder/enquiries/notifications', widths: W },
  { id: 'B-19', file: BUILDER, screen: 'B-19', path: '/builder/restrictions', widths: W },
  { id: 'B-20', file: BUILDER, screen: 'B-20', path: '/builder/marketplace', widths: W },
  { id: 'B-21', file: BUILDER, screen: 'B-21', path: '/builder/leads', widths: W },
  { id: 'B-22', file: BUILDER, screen: 'B-22', path: '/builder/billing', widths: W },
  { id: 'B-23', file: BUILDER, screen: 'B-23', path: '/builder/support', widths: W },
  { id: 'B-24', file: BUILDER, screen: 'B-24', path: '/builder/profile', widths: W },

  // ----------------------------------------------------------------- admin
  { id: 'A-01', file: ADMIN, screen: 'A-01', path: '/admin/login', widths: W },
  { id: 'A-02', file: ADMIN, screen: 'A-02', path: '/admin', widths: W },
  { id: 'A-03', file: ADMIN, screen: 'A-03', path: '/admin/users', widths: W },
  { id: 'A-04', file: ADMIN, screen: 'A-04', path: '/admin/users/U-10442', widths: W },
  { id: 'A-05', file: ADMIN, screen: 'A-05', path: '/admin/kyc', widths: W },
  { id: 'A-06', file: ADMIN, screen: 'A-06', path: '/admin/kyc/K-3318', widths: W },
  { id: 'A-08', file: ADMIN, screen: 'A-08', path: '/admin/properties', widths: W },
  { id: 'A-09', file: ADMIN, screen: 'A-09', path: '/admin/properties/P-2204', widths: W },
  { id: 'A-10', file: ADMIN, screen: 'A-10', path: '/admin/leads/intake', widths: W },
  { id: 'A-11', file: ADMIN, screen: 'A-11', path: '/admin/leads/intake/INT-2291', widths: W },
  { id: 'A-12', file: ADMIN, screen: 'A-12', path: '/admin/leads', widths: W },
  { id: 'A-13', file: ADMIN, screen: 'A-13', path: '/admin/leads/LD-88104', widths: W },
  { id: 'A-14', file: ADMIN, screen: 'A-14', path: '/admin/settings/pricing', widths: W },
  { id: 'A-15', file: ADMIN, screen: 'A-15', path: '/admin/settings', widths: W },
  { id: 'A-16', file: ADMIN, screen: 'A-16', path: '/admin/orders', widths: W },
  { id: 'A-17', file: ADMIN, screen: 'A-17', path: '/admin/orders/ORD-10233/delivery', widths: W },
  { id: 'A-18', file: ADMIN, screen: 'A-18', path: '/admin/wallets', widths: W },
  { id: 'A-19', file: ADMIN, screen: 'A-19', path: '/admin/wallets/U-10442/adjust', widths: W },
  { id: 'A-20', file: ADMIN, screen: 'A-20', path: '/admin/refunds', widths: W },
  { id: 'A-21', file: ADMIN, screen: 'A-21', path: '/admin/subscriptions', widths: W },
  { id: 'A-22', file: ADMIN, screen: 'A-22', path: '/admin/support', widths: W },
  { id: 'A-23', file: ADMIN, screen: 'A-23', path: '/admin/support/T-2291', widths: W },
  { id: 'A-24', file: ADMIN, screen: 'A-24', path: '/admin/voice', widths: W },
  { id: 'A-25', file: ADMIN, screen: 'A-25', path: '/admin/voice/C-7741', widths: W },
  { id: 'A-26', file: ADMIN, screen: 'A-26', path: '/admin/whatsapp', widths: W },
  { id: 'A-27', file: ADMIN, screen: 'A-27', path: '/admin/notifications', widths: W },
  { id: 'A-28', file: ADMIN, screen: 'A-28', path: '/admin/consent', widths: W },
  { id: 'A-29', file: ADMIN, screen: 'A-29', path: '/admin/reports', widths: W },
  { id: 'A-30', file: ADMIN, screen: 'A-30', path: '/admin/audit', widths: W },
  { id: 'A-31', file: ADMIN, screen: 'A-31', path: '/admin/system', widths: W },

  // Shared navigation, captured as its own state rather than a screen.
  { id: 'C-mobile-nav', file: ADMIN, screen: 'A-02', path: '/admin', widths: [390], drawer: true },
];

/**
 * Rows with no prototype screen of their own. Each names the pair that carries
 * its layout and the state evidence that carries its behaviour.
 */
export const NESTED = [
  { id: 'P-21', within: 'C-08, C-09', note: 'System states — empty, error, loading, offline, permission. The library defines them; the pairs that render them are P-02 (no results), P-13 (empty), S-07 (empty after filters).', evidence: 'verify-accessibility.mjs, verify-route-sweep.mjs console checks' },
  { id: 'S-10', within: 'S-09', note: 'Purchase failure states — insufficient balance, already purchased, lead withdrawn. No prototype screen; the approved design shows them inside S-09.', evidence: 'verify-seller-flow.mjs 9-13' },
  { id: 'B-14', within: 'B-07', note: 'Listing actions — edit, unpublish, delete, duplicate. Row actions inside the properties table.', evidence: 'verify-builder-flow.mjs 17-22' },
  { id: 'A-07', within: 'A-06', note: 'KYC decision — approve, reject with reason, request more. Part of A-06 review, not a separate page.', evidence: 'verify-admin-flow.mjs 12-19' },
];

/** The library rows, and the screen context each is judged in. */
export const LIBRARY = [
  { id: 'C-01', name: 'Colour tokens', evidence: 'verify-design-tokens.mjs', context: 'every pair' },
  { id: 'C-02', name: 'Typography', evidence: 'verify-visual-baseline.mjs + geometry diff', context: 'every pair' },
  { id: 'C-03', name: 'Navigation systems', evidence: 'geometry diff', context: 'P-01, S-06, B-06, A-02, C-mobile-nav' },
  { id: 'C-04', name: 'Form controls', evidence: 'verify-accessibility.mjs, verify-no-javascript.mjs', context: 'P-04, S-03, S-15, B-08, A-19' },
  { id: 'C-05', name: 'Filters, tables, pagination', evidence: 'geometry diff', context: 'P-02, S-07, A-03, A-12' },
  { id: 'C-06', name: 'Cards', evidence: 'verify-visual-baseline.mjs', context: 'P-01, P-02, S-07, B-07' },
  { id: 'C-07', name: 'Dialogs, uploads, notifications', evidence: 'verify-builder-flow.mjs 27-41', context: 'B-15, B-18, P-16, S-03' },
  { id: 'C-08', name: 'Content states', evidence: 'geometry diff', context: 'P-02, P-13, S-12' },
  { id: 'C-09', name: 'Access & session states', evidence: 'verify-seller-flow.mjs 15-16', context: 'S-05, B-19, A-01' },
  { id: 'C-10', name: 'Journey map', evidence: 'documentation only — not an interface', context: 'n/a' },
  { id: 'C-11', name: 'Verification report', evidence: 'documentation only — not an interface', context: 'n/a' },
  { id: 'C-12', name: 'Client decision list', evidence: 'documentation only — not an interface', context: 'n/a' },
];

export const DOCS = { BUYER, SELLER, BUILDER, ADMIN, HOME, LIB };
