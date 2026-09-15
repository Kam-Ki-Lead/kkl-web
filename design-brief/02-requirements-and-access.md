# Requirements & Access Matrix

Condensed from the two client source documents for design use. Full traceable versions with page
references live in the `kkl-backend` repository (`docs/requirements.md`, `docs/access-matrix.md`).

**Sources:** KKL Account Roles & Access Specification ("ROLES") and Kam Ki Lead Development
Proposal v1.0, 07 Sep 2026 ("PROP").

Everything on this page is **confirmed** unless marked ⚠️. Anything marked ⚠️ is an open client
decision — see `04-confirmed-vs-unresolved.md` before designing around it.

## Public property portal (confirmed)

- Homepage with hero search: **location + property type + BHK + budget**.
- Featured properties; browsing by location and category.
- Search results with property cards, filtering, and sorting.
- Location hierarchy: **India → West Bengal → Kolkata → New Town → Action Area → Project.**
- Property detail page: image gallery, description, pricing, specifications, amenities,
  address/location, and enquiry / site-visit actions.
- Buyer requirement capture: budget, location, handover timing, configuration, and an
  investment-versus-end-use intent choice.
- Matched properties and shortlisting.
- Responsive across desktop, tablet and mobile, with baseline accessibility.
- Clean, light theme. 99acres used as a functional reference for hierarchy and discovery
  patterns only — not for branding or assets.

## Accounts (confirmed)

| Role | Registration | Activation |
|---|---|---|
| Buyer | Mobile number + OTP, free | Immediate |
| Seller / Vendor | Mobile OTP + PAN + Aadhaar submitted for KYC | Admin approval required |
| Builder | Same KYC flow as Seller | Admin KYC approval **and** an active monthly subscription to list properties |
| Administrator | Created internally only — no public signup route | n/a |

⚠️ Whether Buyer registration is OTP-only or OTP plus a password is unresolved. ⚠️ Whether one
identity may hold more than one role is unresolved. ⚠️ What a Seller/Builder can access *before*
KYC approval is unresolved.

## Lead marketplace (confirmed)

- Sellers browse available leads with a **limited preview — sensitive contact details hidden until
  purchase**.
- Search and filter leads by location, category and demand.
- View enquiry volume by property/location.
- Purchase and download leads using credits; a Lead Management area for purchased leads.
- Instant download (Excel/CSV) after purchase.
- Lead lifecycle: new → qualifying → qualified → listed → on-sale → sold / delivered /
  disqualified.
- **Freshness/aging:** leads aged 2–10 days move to a "Sale" tab at an automatic 20% discount.
- One lead is sold to exactly one purchaser.
- Delivery only after a successful credit deduction.

## Credits and billing (partly confirmed)

- **1 INR = 1 credit.** Confirmed.
- Credits are consumed when purchasing leads. Confirmed.
- **Credits have an expiry date**, and the billing area includes recharge, renew, expiry tracking,
  usage history, invoices and billing details. The *existence* of expiry is confirmed; ⚠️ **every
  mechanic of it is unresolved** — the period, what "renew" means, consumption order, refunds
  after expiry, and tax treatment.
- Recharge is processed through a payment gateway (Razorpay), confirmed server-side.
- ⚠️ No credit pack sizes, lead prices, or subscription prices appear in any source document.

## Builder (partly confirmed)

- Organic property listing: create, edit, publish, unpublish, delete.
- Listing fields: name, description, images, **videos**, address, amenities, pricing,
  specifications, location.
- Builder receives a notification when a buyer submits an enquiry on a listed property.
- Builders can purchase marketplace leads with credits, same system as Sellers.
- Lead Management, Billing, Profile and Support areas identical to Seller.
- ⚠️ Whether an enquiry on the builder's **own** listing reveals buyer contact immediately or
  requires a paid unlock is **contradicted between the two source documents** and unresolved.
- ⚠️ What happens to listings and access when a subscription expires is unresolved.

## Administrator (confirmed)

Full access to every module: approve/reject Seller and Builder verification; manage users,
properties, leads, credits, billing, subscriptions and support tickets; view analytics, reports
and audit logs; configure credit pricing, expiry rules and platform settings.

## Role / permission matrix

✅ allowed · ❌ denied · ⚠️ unresolved, see `04-confirmed-vs-unresolved.md`

| Capability | Buyer | Seller (KYC approved) | Builder (KYC + active sub) | Admin |
|---|---|---|---|---|
| Browse/search public listings | ✅ | ✅ | ✅ | ✅ |
| View property detail | ✅ | ✅ | ✅ | ✅ |
| Submit enquiry / site visit | ✅ | ✅ | ✅ | via admin tools |
| Track own enquiries | ✅ | n/a | n/a | ✅ all |
| Requirement capture & shortlist | ✅ | — | — | ✅ support |
| **Browse lead marketplace** | **❌** | ✅ | ✅ | ✅ |
| See unmasked lead contact pre-purchase | ❌ | ❌ | ❌ | ✅ |
| Purchase a lead with credits | ❌ | ✅ | ✅ | ✅ audited |
| Download purchased lead contacts | ❌ | ✅ own only | ✅ own only | ✅ |
| View another account's purchases | ❌ | ❌ | ❌ | ✅ |
| Create/edit/publish property listings | ❌ | ❌ | ✅ | ✅ moderation |
| Receive enquiry on own listing | n/a | n/a | ✅ | n/a |
| See buyer contact on own-listing enquiry | n/a | n/a | ⚠️ | ✅ |
| Wallet balance, recharge, invoices | n/a | ✅ own only | ✅ own only | ✅ all |
| Configure pricing / expiry rules | ❌ | ❌ | ❌ | ✅ |
| Approve/reject KYC | ❌ | ❌ | ❌ | ✅ |
| View KYC documents | ❌ | ✅ own only | ✅ own only | ✅ access-logged |
| Raise a support ticket | ⚠️ | ✅ | ✅ | ✅ |
| Analytics, reports, audit logs | ❌ | ❌ | ❌ | ✅ |

**The hardest boundary in the product:** a Buyer account must never reach marketplace or
seller/builder data under any circumstance. Design the public and authenticated surfaces so this
separation is obvious to a user, not just enforced invisibly.
