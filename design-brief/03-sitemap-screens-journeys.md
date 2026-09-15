# Sitemap, Screen Inventory & Journeys

## Sitemap

Public portal takes navigation priority. The lead marketplace is reached only through role login
and is never presented as part of the consumer browsing experience.

```
/                                Homepage — hero search, featured, browse by location
├── /search                      Search results — filters, sort, cards
├── /property/[slug]             Property detail — gallery, specs, amenities, enquiry
├── /requirement                 Buyer requirement capture
├── /requirement/matches         Matched & shortlisted properties
├── /for-builders, /for-sellers  Role-targeted landing pages (secondary, not primary nav)
│
├── /login, /register            Role-aware entry: Buyer OTP · Seller & Builder signup
│
├── /buyer
│   ├── /enquiries               Track own enquiries
│   ├── /shortlist               Shortlisted properties
│   └── /account                 Profile & password
│
├── /seller                      KYC-gated
│   ├── /kyc                     KYC submission & status
│   ├── /marketplace             Lead marketplace — masked preview, filters
│   ├── /purchases               Lead management — purchased leads, downloads
│   ├── /wallet                  Billing & credits
│   ├── /support                 Support tickets
│   └── /account                 Profile & password
│
├── /builder                     KYC + subscription gated
│   ├── /kyc                     Same KYC flow as Seller
│   ├── /subscription            Monthly subscription management
│   ├── /properties              Property management — CRUD, media
│   ├── /enquiries               Buyer enquiries on own listings
│   ├── /marketplace             Same marketplace as Seller
│   ├── /purchases               Lead management
│   ├── /wallet                  Billing & credits
│   ├── /support                 Support tickets
│   └── /account                 Profile & password
│
└── /admin                       Internal accounts only
    ├── /kyc                     KYC verification queue
    ├── /users                   User management
    ├── /properties              Property moderation
    ├── /leads                   Lead & pricing management
    ├── /billing                 Billing, subscriptions, refunds
    ├── /support                 Support ticket management
    ├── /audit                   Audit log
    └── /settings                Platform settings
```

## Screen inventory

**Priority 1** — the public consumer experience. This is where the identity is established and
where design quality matters most. Prototype these first and fully, desktop and mobile.

| # | Screen | Notes for design |
|---|---|---|
| 1 | Homepage | Hero search (location, type, BHK, budget), featured projects, browse by location, role entry points. The single most important screen in the product. |
| 2 | Search results | Filter panel (location hierarchy, configuration, budget, status), sort, result cards, pagination, map-vs-list consideration. Heavy mobile use. |
| 3 | Property detail | Image gallery (hero treatment), pricing, specifications, amenities, location/map, builder identity, enquiry and site-visit actions. Must work with poor-quality builder photos. |
| 4 | Enquiry / site-visit flow | Including the OTP verification step for an unregistered buyer. Currently the weakest flow — treat as a designed conversion moment, not a form. |
| 5 | Requirement capture | Budget, location, handover timing, configuration, investment-vs-end-use. Multi-step; a candidate for a more considered, guided interaction. |
| 6 | Matched properties | Match results and shortlisting. |

**Priority 2** — the paying and operating surfaces. Denser, more functional, same brand.

| # | Screen | Notes for design |
|---|---|---|
| 7 | Buyer — my enquiries | Enquiry status tracking, shortlist, profile. |
| 8 | Buyer OTP register / login | Phone entry and OTP entry states. |
| 9 | Seller KYC submission & status | PAN/Aadhaar capture, document upload, pending/approved/rejected states. Must convey seriousness and reassure about document handling. |
| 10 | Lead marketplace | Masked lead cards, filters (location, category, demand, freshness), the aged-lead "Sale" treatment, purchase action. The core commercial screen — a lead card must communicate worth before purchase. |
| 11 | Purchase confirmation & download | Credit cost, confirmation, post-purchase contact reveal and file download. Not designed at all in the rejected prototype. |
| 12 | Billing & credits | Balance, recharge, usage history, expiry indication, invoices, billing details. |
| 13 | Builder property management | Listing table with status states; the create/edit listing form with media upload — the heaviest authoring surface. |
| 14 | Builder enquiries | Incoming enquiry list and actions. |
| 15 | Builder subscription | Plan state, activation, renewal, expiry states. |
| 16 | Admin KYC queue | Queue with pending/overdue indicators, applicant summary, approve/reject with reason. |

**Priority 3** — needed for full sign-off but lower design risk; can follow the established system.

Seller/Builder lead management detail · support ticket list, new ticket and thread · profile &
password · invoices list and single invoice · admin user management, property moderation, lead &
pricing management, billing/refunds, support management, audit log viewer, platform settings ·
suspended account screen · 404 / project not found.

**System-level states** — needed across every list and detail screen, designed once:

Loading (skeletons) · empty · error · access-denied · masked-data (pre-purchase) · pending-
approval · subscription-inactive. The rejected prototype treated these as an afterthought page;
they should be part of the system.

## Journeys to prototype

1. **Discover → enquire.** Homepage → search and filter → property detail → submit enquiry → OTP
   verification → confirmation.
2. **Track and receive.** Buyer sees the enquiry in their account → Builder receives the enquiry
   notification and acts on it.
3. **Guided matching.** Requirement capture → matched properties → shortlist.
4. **Seller commercial journey.** KYC submission → pending state → approved → marketplace browse
   with masked leads → recharge credits → purchase a lead → contact reveal and download.
5. **Builder journey.** Subscription activation → create and publish a listing with media →
   receive and action an enquiry.
6. **Admin journey.** KYC queue → review an applicant → approve or reject with reason.

Journeys 1 and 4 are the two that get demonstrated to the client. They should be the most
complete.

## Mobile

Mobile is the primary context for Priority 1 screens. Design the mobile experience deliberately —
particularly the hero search (four inputs is a lot on a phone), the filter panel, the property
gallery, and the enquiry flow. The rejected prototype only reflowed desktop to one column.
