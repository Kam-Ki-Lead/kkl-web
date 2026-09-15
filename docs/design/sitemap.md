# Sitemap

Public portal is the primary product surface and takes navigation priority, per the client's
explicit instruction — it is not a marketing page in front of the marketplace.

```
/ (Homepage — hero search, featured, browse by location)
├── /search                         Search results (filters, sort, cards)
├── /property/[slug]                Property detail (gallery, specs, enquiry)
├── /requirement                    Buyer requirement-capture flow
├── /requirement/matches            Matched & shortlisted properties
├── /for-builders, /for-sellers     Role-targeted marketing landing (secondary, not primary nav)
│
├── /login, /register               Role-aware entry: Buyer OTP / Seller & Builder KYC signup
│
├── /buyer                          Buyer area (own identity only)
│   ├── /buyer/enquiries            Track own enquiries
│   ├── /buyer/shortlist            Shortlisted properties
│   └── /buyer/account              Profile & password
│
├── /seller                         Seller / Vendor portal (KYC-gated)
│   ├── /seller/kyc                 KYC submission & status
│   ├── /seller/marketplace         Lead marketplace (masked preview, search/filter)
│   ├── /seller/purchases           Lead management — purchased/downloaded leads
│   ├── /seller/wallet              Billing & credits (recharge, usage, invoices)
│   ├── /seller/support             Support tickets
│   └── /seller/account             Profile & password
│
├── /builder                        Builder portal (KYC + subscription gated)
│   ├── /builder/kyc                Same KYC flow as Seller
│   ├── /builder/subscription       Monthly subscription management
│   ├── /builder/properties         Property Management (CRUD, media)
│   ├── /builder/enquiries          Buyer-interest notifications on own listings
│   ├── /builder/marketplace        Same lead marketplace as Seller (credits)
│   ├── /builder/purchases          Lead management
│   ├── /builder/wallet             Billing & credits
│   ├── /builder/support            Support tickets
│   └── /builder/account            Profile & password
│
└── /admin                          Administrator console (internal accounts only)
    ├── /admin/kyc                  KYC verification queue
    ├── /admin/users                User management
    ├── /admin/properties           Property moderation
    ├── /admin/leads                Lead & pricing management
    ├── /admin/billing              Billing, subscriptions, refunds
    ├── /admin/support              Support ticket management
    ├── /admin/audit                Audit log
    └── /admin/settings             Platform settings (pricing, expiry, calling windows)
```

Navigation principle: the top-level public nav is Buy a Home / For Builders / For Sellers — the
lead marketplace and role dashboards are reached through role-specific login, never exposed as
if they were part of the public consumer browsing experience. This keeps "public property
listings" and "purchasable lead listings" distinct in the navigation as required, mirroring the
same distinction already enforced in the data model and permissions (`access-matrix.md`).
