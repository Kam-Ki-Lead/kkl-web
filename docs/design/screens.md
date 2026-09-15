# Screen Inventory

Status legend: **Built** = in the clickable prototype (`prototype/`). **Needed for full sign-off**
= identified as required but not yet mocked up in this session, listed so nothing is silently
dropped from design scope.

## Public property portal — Built

| Screen | File | Notes |
|---|---|---|
| Homepage | `index.html` | Hero search (location/type/BHK/budget), featured properties, browse-by-location, role entry points |
| Search results | `search.html` | Filters (location hierarchy, config, budget, status), sorting, property cards, pagination |
| Property detail | `property-detail.html` | Gallery, description, specs, amenities, address/map, enquiry + site-visit form, builder identity |
| Requirement capture | `requirement-capture.html` | Budget, location, handover timing, configuration, investment-vs-end-use |
| Matched properties | `matches.html` | Match score, shortlist confirmation |

## Buyer — Built

| Screen | File | Notes |
|---|---|---|
| OTP login/register | `buyer-register.html` | Phone entry + OTP verification states |
| My Enquiries | `buyer-account.html` | Enquiries tab, shortlist tab (stub), profile tab (stub) |

## Seller — Built

| Screen | File | Notes |
|---|---|---|
| KYC submission | `seller-kyc.html` | PAN/Aadhaar capture, document upload placeholders, pending-status card with explicit "not automatic" notice |
| Lead marketplace | `seller-marketplace.html` | Masked contact preview, filters (location/category/demand/freshness), Sale-tab discount pricing |
| Billing & credits | `seller-wallet.html` | Balance, expiring-soon indicator, recharge, usage history with expiry column, invoices/billing-details tabs (stub) |

## Builder — Built

| Screen | File | Notes |
|---|---|---|
| Subscription | `builder-subscription.html` | Plan, activation CTA, status table showing "marketplace purchase available independent of subscription" per D-03's recommended default |
| Property Management | `builder-properties.html` | Listing table with status states (published/draft/unpublished-due-to-expired-sub), new-listing form |
| Buyer enquiries | `builder-enquiries.html` | Enquiry list, explicit callout that contact-reveal timing here reflects the *recommended default* pending D-01 |

## Admin — Built

| Screen | File | Notes |
|---|---|---|
| KYC verification queue | `admin-kyc.html` | Pending/overdue SLA indicators (visual only — no code enforces this, per `demo-assessment.md`), approve/reject actions |

## Pattern library — Built

| Screen | File | Notes |
|---|---|---|
| Loading / empty / error / access-denied states | `states.html` | Reusable states applied across list/detail screens rather than duplicated per page |

## Needed for full design sign-off (not yet mocked up)

These are named in the proposal/spec but not built in this session's time-boxed prototype pass.
Listed explicitly so they aren't silently dropped before Phase 1 sign-off:

- Seller/Builder **Lead Management** detail view (single purchased lead, download action, dispute).
- Seller/Builder **Support** ticket list + new-ticket form + ticket detail thread.
- Seller/Builder **Profile & password** settings screen.
- Builder **KYC** screen (same as Seller's `seller-kyc.html` pattern, builder-labeled).
- **Invoices** tab content (list + single invoice/receipt view) under Billing.
- Admin: **user management**, **property moderation**, **lead & pricing management**,
  **billing/subscriptions/refunds**, **support ticket management**, **audit log viewer**,
  **platform settings** (pricing, credit expiry rules, calling-hour windows) — the admin console
  is scoped in the sitemap but only the KYC queue is mocked up as the representative admin
  journey requested for this milestone.
- **Suspended account** screen (role exists in the demo's auth guard; no design yet).
- **404 / project not found** state (distinct from the empty-search-results state built here).
- Dedicated **mobile navigation drawer** interaction (hamburger button is present but the drawer
  content itself isn't built — CSS breakpoints are otherwise responsive throughout).
- Seller/Builder **purchase confirmation / receipt** modal (the marketplace screen shows the
  "Purchase" action but not the confirm-and-download step after clicking it).

## Responsive coverage

All built screens use fluid CSS Grid/Flexbox layouts with breakpoints at 900px and 680px
(`prototype/styles.css`), collapsing multi-column search/filter and dashboard layouts to a single
column and hiding the desktop nav behind a hamburger placeholder on mobile widths. This was
verified by resizing the browser viewport, not by a separate mobile-specific mockup set — full
sign-off should include at least one screen explicitly designed mobile-first (the homepage and
property detail are the highest-value candidates) rather than relying solely on reflow.
