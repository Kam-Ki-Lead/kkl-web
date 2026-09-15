# User Journeys

Walkthrough scripts for the prototype (`prototype/index.html`), matching the acceptance-plan and
the client's requested first-prototype walkthrough.

## Journey 1 — Homepage → search/filter → property detail → submit enquiry

1. `index.html` — Buyer lands, uses hero search (location + type + BHK + budget) or scrolls to
   featured/browse-by-location.
2. `search.html` — Filters by location hierarchy, configuration, budget; sorts by price.
3. `property-detail.html` — Reviews gallery, specs, amenities, location; fills the enquiry form
   (name, mobile, message) or requests a site visit.
4. Enquiry submission triggers the OTP verification step (`buyer-register.html`'s OTP state) if
   the buyer isn't already logged in — not built as a separate submit-confirmation screen in this
   pass (see `screens.md`'s "needed for sign-off" list for the purchase/receipt-style confirmation
   pattern this would reuse).

## Journey 2 — Buyer tracks enquiry → Builder receives notification

1. `buyer-account.html` — Buyer sees the enquiry just submitted listed as "Open."
2. `builder-enquiries.html` — Represents the Builder's view of the same enquiry arriving as an
   instant notification (per the recommended default in D-01; the explicit on-page notice flags
   this as pending client confirmation, not a resolved design decision).
3. Builder marks it "Mark contacted" or calls directly — `builder-enquiries.html`'s action row.
4. Buyer's `buyer-account.html` view would reflect the status change to "Contacted" (shown as a
   static example row rather than a live state transition, since this is a disposable prototype
   with no backend).

## Journey 3 — Buyer requirement capture → matched properties

1. `requirement-capture.html` — Budget slider, location, configuration, handover timing,
   investment-vs-end-use toggle, phone number.
2. `matches.html` — Match-scored results, with a path back to `requirement-capture.html` to edit,
   and a confirmation that matches were saved to the buyer's account.

## Journey 4 — Seller: KYC → masked lead marketplace → recharge → purchase → contact download

1. `seller-kyc.html` — PAN/Aadhaar submission; pending-status card explicitly states the 24-hour
   figure is an operational target, not an automatic-approval guarantee.
2. `admin-kyc.html` — Represents the Admin side: reviewing the same submission, with SLA
   countdown/overdue indicators (visual cue only, not enforced by any backend logic — see
   `demo-assessment.md`), and explicit Approve/Reject actions.
3. `seller-marketplace.html` — Post-approval, Seller browses masked leads, filters by location/
   category/demand/freshness (including the aging-discount "On Sale −20%" pricing state).
4. `seller-wallet.html` — Recharge flow (Razorpay CTA), usage history showing a purchase debit and
   an expiring-soon credit batch.
5. Purchase → download is represented by the "Purchase" button on the marketplace card; the
   confirm/download step itself is listed under `screens.md`'s "needed for sign-off" items rather
   than built, to keep this pass time-boxed to the requested representative journeys.

## Journey 5 — Builder: subscription → property management → enquiries

1. `builder-subscription.html` — Activates the monthly plan; status table shows that marketplace
   lead purchase remains available independent of subscription state (D-03's recommended default,
   explicitly flagged as pending confirmation).
2. `builder-properties.html` — Manages listings (published/draft/unpublished states shown
   side-by-side, including the "unpublished — subscription inactive" state per D-03), creates a
   new listing with the full field set from the spec (name, description, images/video, address,
   amenities, pricing, specifications).
3. `builder-enquiries.html` — Reviews and actions incoming buyer enquiries on owned listings.

## Journey 6 — Admin: KYC approval

1. `admin-kyc.html` — The representative Admin journey built for this milestone: queue with
   pending/overdue indicators, applicant KYC summary (masked PAN/Aadhaar), explicit per-row
   Approve/Reject actions matching the requirement that approval is a deliberate admin act, never
   automatic.
2. Other Admin modules (users, properties, leads/pricing, billing/refunds, support, audit log,
   settings) are sitemapped but not mocked up in this pass — see `screens.md`.

## Mobile

All built screens reflow to a single-column, touch-friendly layout under 680px width
(`prototype/styles.css` breakpoints) — verified by browser-viewport resize on every built screen.
A dedicated mobile-first pass (not just reflow) on the homepage and property detail is
recommended before full sign-off; see `screens.md`.

## What this prototype deliberately does not do

No screen in `prototype/` calls a real backend, stores real data, or persists any state between
page loads — every "submit," "purchase," and "approve" action is a static link to the next screen
in the journey, not a working transaction. This is intentional: the client's brief requires an
"explicitly disposable, navigable prototype using synthetic data," deferring production
implementation until the prototype is approved (see `../../../kkl-backend` docs,
`delivery-plan.md`).
