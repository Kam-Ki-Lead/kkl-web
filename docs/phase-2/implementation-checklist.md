# Phase 2 Implementation Checklist

Mapped to the screen inventory in the approved baseline
(`KKL Phase 1 - Screen Inventory.dc.html`, kkl-design @ `5bc3512`).

## How to read this

The inventory has **113 rows. They are not 113 pages.** The distinction matters:

| Kind | Count | Meaning |
|---|---|---|
| **Route** | 95 | Has its own URL |
| **Nested state** | 6 | Lives inside another screen — P-21, S-10, B-14, B-18, B-19, A-07 |
| **Shared component group** | 12 | C-01 to C-12 — the library, not screens |

The inventory marks nested rows with `—` or `within …` in its route column. Building those as
separate pages would contradict the design.

## Status vocabulary

| Mark | Meaning |
|---|---|
| `[ ]` | **Not started** |
| `[S]` | **Implemented with sample services** — renders from fixtures; no real backend |
| `[R]` | **Connected to real services** — reads/writes kkl-backend |
| `[V]` | **Verified** — with the scope of the check named in `verification.md` |

Nothing is `[R]`: kkl-backend has not published its versioned OpenAPI spec, so no API client
exists. Selecting `api` fails closed rather than falling back to fixtures.

---

## C — shared components and states (the library)

| ID | Group | Status | Where |
|---|---|---|---|
| C-01 | Colour tokens | `[V]` | `src/app/globals.css` `@theme` |
| C-02 | Typography | `[V]` | `src/app/globals.css` `.t-*`, `src/app/layout.tsx` |
| C-03 | Navigation systems | `[S]` public header/footer + drawer · `[ ]` dashboard rails | `src/components/layout/` |
| C-04 | Form controls | `[S]` | `src/components/ui/button.tsx`, `field.tsx` |
| C-05 | Filters, tables, pagination | `[ ]` filter chip only | `src/components/ui/chip.tsx` |
| C-06 | Cards | `[S]` property + project · `[ ]` lead card | `src/components/property/property-card.tsx` |
| C-07 | Dialogs, uploads, notifications | `[ ]` | — |
| C-08 | Content states | `[S]` | `src/components/ui/states.tsx` |
| C-09 | Access & session states | `[S]` | `src/components/ui/states.tsx` |
| C-10 | Journey map | n/a — design artefact | — |
| C-11 | Verification report | carried into `verification.md` | — |
| C-12 | Client decision list | `[S]` encoded as unresolved rules | `src/lib/config/business-rules.ts` |

## P — public portal and Buyer

| ID | Screen | Route | Status |
|---|---|---|---|
| P-01 | Homepage | `/` | `[V]` at 1440 · 768 · 390 |
| P-02 | Search results | `/search` | `[ ]` |
| P-03 | Property / project detail | `/property/:id` | `[ ]` |
| P-04 | Enquiry form | `/property/:id/enquiry` | `[ ]` |
| P-05 | Site-visit request | `/property/:id/site-visit` | `[ ]` |
| P-06 | Mobile OTP sign-in / register | `/auth` | `[ ]` |
| P-07 | Enquiry confirmation | `/enquiry/:id/confirmed` | `[ ]` |
| P-08 | Requirement capture (5 steps) | `/find-my-match` | `[ ]` |
| P-09 | Requirement review | `/find-my-match/review` | `[ ]` |
| P-10 | Matched properties | `/matches` | `[ ]` |
| P-11 | Shortlist | `/account/shortlist` | `[ ]` |
| P-12 | Buyer dashboard | `/account` | `[ ]` |
| P-13 | My enquiries | `/account/enquiries` | `[ ]` |
| P-14 | Enquiry detail | `/account/enquiries/:id` | `[ ]` |
| P-15 | Profile & settings | `/account/profile` | `[ ]` |
| P-16 | Notifications | `/account/notifications` | `[ ]` |
| P-17 | For builders | `/builders` | `[ ]` |
| P-18 | For brokers | `/brokers` | `[ ]` |
| P-19 | Contact & support | `/support` | `[ ]` |
| P-20 | Policy page template | `/legal/:slug` | `[ ]` |
| P-21 | System states | *nested — within C-08 / C-09* | `[S]` components exist, not yet wired to routes |

## S — Seller / broker

| ID | Screen | Route | Status |
|---|---|---|---|
| S-01 | Seller registration | `/seller/register` | `[ ]` |
| S-02 | Onboarding — business details | `/seller/onboarding` | `[ ]` |
| S-03 | KYC submission (PAN, Aadhaar) | `/seller/kyc` | `[ ]` |
| S-04 | KYC status | `/seller/kyc/status` | `[ ]` |
| S-05 | Restricted / suspended account | `/seller/restricted` | `[ ]` |
| S-06 | Seller dashboard | `/seller` | `[ ]` |
| S-07 | Lead marketplace | `/seller/leads` | `[ ]` |
| S-08 | Lead preview (masked) | `/seller/leads/:id` | `[ ]` |
| S-09 | Purchase review & confirm | `/seller/leads/:id/buy` | `[ ]` |
| S-10 | Purchase failure states | *nested — within S-09 / S-11* | `[ ]` |
| S-11 | Purchase success & contact reveal | `/seller/leads/:id/purchased` | `[ ]` |
| S-12 | Purchased leads | `/seller/purchased` | `[ ]` |
| S-13 | Purchased lead detail | `/seller/purchased/:id` | `[ ]` |
| S-14 | Credits & balance | `/seller/billing` | `[ ]` |
| S-15 | Recharge credits | `/seller/billing/recharge` | `[ ]` |
| S-16 | Payment handoff & result | `/seller/billing/payment` | `[ ]` |
| S-17 | Transactions & usage history | `/seller/billing/history` | `[ ]` |
| S-18 | Credit expiry & renewal | `/seller/billing/expiry` | `[ ]` **gated on D-04** |
| S-19 | Invoices | `/seller/billing/invoices` | `[ ]` |
| S-20 | Invoice detail | `/seller/billing/invoices/:id` | `[ ]` **GST open, D-13** |
| S-21 | Billing information | `/seller/billing/details` | `[ ]` |
| S-22 | Support tickets | `/seller/support` | `[ ]` |
| S-23 | New ticket | `/seller/support/new` | `[ ]` *disconnected step 2* |
| S-24 | Ticket detail & replies | `/seller/support/:id` | `[ ]` |
| S-25 | Profile & settings | `/seller/profile` | `[ ]` |

## B — Builder

| ID | Screen | Route | Status |
|---|---|---|---|
| B-01 | Builder registration | `/builder/register` | `[ ]` |
| B-02 | Builder KYC & verification | `/builder/kyc` | `[ ]` **documents open, D-15** |
| B-03 | Subscription overview | `/builder/subscription` | `[ ]` **price open, D-01** |
| B-04 | Subscription payment result | `/builder/subscription/payment` | `[ ]` |
| B-05 | Renewal & expiry | `/builder/subscription/renewal` | `[ ]` **listing outcome open, D-02** |
| B-06 | Builder dashboard | `/builder` | `[ ]` |
| B-07 | My properties | `/builder/properties` | `[ ]` |
| B-08 | Create listing — basics | `/builder/properties/new` | `[ ]` |
| B-09 | Create listing — location | `…/new/location` | `[ ]` |
| B-10 | Create listing — pricing & configuration | `…/new/pricing` | `[ ]` |
| B-11 | Create listing — specifications & amenities | `…/new/specs` | `[ ]` |
| B-12 | Create listing — media | `…/new/media` | `[ ]` |
| B-13 | Create listing — preview & publish | `…/new/preview` | `[ ]` *disconnected step 1* |
| B-14 | Listing actions | *nested — within B-07* | `[ ]` |
| B-15 | Edit listing & unsaved changes | `/builder/properties/:id/edit` | `[ ]` |
| B-16 | Enquiries on my listings | `/builder/enquiries` | `[ ]` |
| B-17 | Enquiry detail | `/builder/enquiries/:id` | `[ ]` **contact disclosure open, D-05** |
| B-18 | New-enquiry notification | *nested* | `[ ]` **D-05** |
| B-19 | Access restrictions | *nested* | `[ ]` |
| B-20 | Lead marketplace (Builder) | `/builder/marketplace` | `[ ]` **lead prices open, D-03** |
| B-21 | Purchased leads (Builder) | `/builder/leads` | `[ ]` |
| B-22 | Billing & credits (Builder) | `/builder/billing` | `[ ]` |
| B-23 | Support (Builder) | `/builder/support` | `[ ]` |
| B-24 | Profile & settings (Builder) | `/builder/profile` | `[ ]` **dual role open, D-08** |

## A — Admin

| ID | Screen | Route | Status |
|---|---|---|---|
| A-01 | Admin sign-in | `/admin/login` | `[ ]` **MFA open, D-16** |
| A-02 | Admin dashboard | `/admin` | `[ ]` |
| A-03 | Users | `/admin/users` | `[ ]` |
| A-04 | User detail | `/admin/users/:id` | `[ ]` |
| A-05 | KYC queue | `/admin/kyc` | `[ ]` |
| A-06 | KYC applicant review | `/admin/kyc/:id` | `[ ]` |
| A-07 | KYC decision | *nested — within A-06* | `[ ]` |
| A-08 | Property review queue | `/admin/properties` | `[ ]` **pre/post publish open, D-10** |
| A-09 | Property detail & moderation | `/admin/properties/:id` | `[ ]` |
| A-10 | Lead intake overview | `/admin/leads/intake` | `[ ]` |
| A-11 | Intake results & failures | `/admin/leads/intake/:id` | `[ ]` |
| A-12 | Leads | `/admin/leads` | `[ ]` |
| A-13 | Lead detail & history | `/admin/leads/:id` | `[ ]` |
| A-14 | Lead pricing & aging rules | `/admin/settings/pricing` | `[ ]` **D-03** |
| A-15 | Platform settings | `/admin/settings` | `[ ]` |
| A-16 | Orders & purchases | `/admin/orders` | `[ ]` |
| A-17 | Delivery & download records | `/admin/orders/:id/delivery` | `[ ]` |
| A-18 | Wallet & credit oversight | `/admin/wallets` | `[ ]` |
| A-19 | Credit adjustment | `/admin/wallets/:id/adjust` | `[ ]` |
| A-20 | Refund review | `/admin/refunds` | `[ ]` **refund policy open, D-06** |
| A-21 | Subscriptions & billing | `/admin/subscriptions` | `[ ]` |
| A-22 | Support queue | `/admin/support` | `[ ]` |
| A-23 | Ticket conversation | `/admin/support/:id` | `[ ]` |
| A-24 | Voice qualification overview | `/admin/voice` | `[ ]` |
| A-25 | Call detail | `/admin/voice/:id` | `[ ]` |
| A-26 | WhatsApp funnel | `/admin/whatsapp` | `[ ]` |
| A-27 | Notification delivery | `/admin/notifications` | `[ ]` |
| A-28 | Consent & suppression | `/admin/consent` | `[ ]` **D-14** |
| A-29 | Analytics & reports | `/admin/reports` | `[ ]` |
| A-30 | Audit log | `/admin/audit` | `[ ]` |
| A-31 | Jobs & integration status | `/admin/system` | `[ ]` |

---

## The two deliberately disconnected steps

The design prototype leaves these unconnected and says so in C-10. They are represented through
the service interfaces so they connect once, at the right layer:

1. **Builder publish → public portal visibility.** In the prototype, publishing in B-13 does not
   reach the portal, which uses fixed sample listings. Here it belongs to the property service:
   publishing changes a listing's status, and public search reads published listings through the
   same service. The sample implementation will demonstrate it end to end; the real behaviour is
   kkl-backend's and stays **pending** until the API exists.

2. **Seller ticket creation → Admin support queue.** In the prototype, S-23 opens the existing
   thread rather than creating a queue item. Here both surfaces read one support service, so a
   created ticket appears in the Admin queue. Demonstrated in sample, **pending** for real.

Neither is faked at the component layer, and neither is presented as connected to a real system.

## Progress

| Area | Routes | Not started | Sample | Verified |
|---|---|---|---|---|
| C library | — | 3 groups | 7 groups | 2 groups |
| P public + Buyer | 20 | 19 | 1 | 1 |
| S Seller | 24 | 24 | 0 | 0 |
| B Builder | 21 | 21 | 0 | 0 |
| A Admin | 30 | 30 | 0 | 0 |

**Phase 2 is not close to complete.** The shared foundation and one route are done; 94 routes
remain, and none of them are connected to a real service.
