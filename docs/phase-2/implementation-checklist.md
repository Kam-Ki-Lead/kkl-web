# Phase 2 Implementation Checklist

Mapped to the screen inventory in `design-brief/03-sitemap-screens-journeys.md`. Order follows the
agreed sequence: foundation → public portal + Buyer → Seller → Builder → Admin.

Status: `[ ]` not started · `[~]` in progress · `[x]` done · `[blocked]` waiting on the approved
design files (see `approved-baseline.md` §2).

---

## Stage 0 — Foundation (design-independent)

These do not depend on the approved appearance and are complete or in progress now.

- [x] Next.js + React + TypeScript + Tailwind application configuration
- [x] Domain types derived from the approved requirements
- [x] Business-rules configuration module — confirmed rules configurable, unresolved rules explicitly unresolved
- [x] Sample-data service layer behind an interface, clearly separated and labelled
- [x] API client boundary — no secrets, no payment authority, no permissions enforcement
- [x] Environment configuration with no secret material in frontend code
- [ ] Route structure matching the approved sitemap *(deferred — route shape should be confirmed against the design project's screen set on unblock, to avoid building routes the designs then contradict)*

## Stage 1 — Shared visual foundation **[blocked]**

Every item here reads directly from `KKL Component and State Library.dc.html`.

- [blocked] Design tokens: colour scales, type scale, spacing scale, radii, elevation, motion
- [blocked] Global stylesheet and Tailwind theme mapped to the tokens
- [blocked] Typography components / prose styles
- [blocked] Reusable controls: button variants, inputs, select, checkbox/radio, range, textarea, form field wrapper with label + error
- [blocked] Card primitives (property card, lead card, generic surface)
- [blocked] Badge / status pill system with semantic mapping
- [blocked] Table primitives
- [blocked] Tabs, pagination, breadcrumbs
- [blocked] Modal / drawer / sheet
- [blocked] Toast or inline notification
- [blocked] Image slot component — the design imports `image-slot.js`; this is expected to govern aspect-ratio handling, cropping and the no-image fallback for builder-uploaded media
- [blocked] Whatever `support.js` provides — unknown until readable; do not guess its role
- [blocked] **State set, designed once and reused:** loading / skeleton, empty, error, access-denied, masked-data (pre-purchase), pending-approval, subscription-inactive

## Stage 2 — App shell and navigation **[blocked]**

- [blocked] Public portal header and footer
- [blocked] Authenticated shell for Buyer / Seller / Builder / Admin
- [blocked] Mobile navigation (designed, not a reflow of desktop)
- [blocked] Role-aware navigation composition — presentation only; never the access control

## Stage 3 — Public portal + Buyer (first vertical slice) **[blocked on visuals]**

Priority 1 and the Buyer part of Priority 2 from the screen inventory.

| Inventory # | Screen | UI | Data | States | Responsive | A11y |
|---|---|---|---|---|---|---|
| 1 | Homepage — hero search, featured, browse by location | [blocked] | [ ] | [ ] | [ ] | [ ] |
| 2 | Search results — filters, sort, cards, pagination | [blocked] | [ ] | [ ] | [ ] | [ ] |
| 3 | Property detail — gallery, specs, amenities, location, enquiry | [blocked] | [ ] | [ ] | [ ] | [ ] |
| 4 | Enquiry / site-visit flow incl. OTP step | [blocked] | [ ] | [ ] | [ ] | [ ] |
| 5 | Requirement capture — multi-step | [blocked] | [ ] | [ ] | [ ] | [ ] |
| 6 | Matched properties + shortlist | [blocked] | [ ] | [ ] | [ ] | [ ] |
| 8 | Buyer OTP register / login | [blocked] | [ ] | [ ] | [ ] | [ ] |
| 7 | Buyer — my enquiries | [blocked] | [ ] | [ ] | [ ] | [ ] |

Cross-cutting for this slice:

- [ ] Client-side validation on every form — mirroring, never replacing, server validation
- [ ] Loading, empty, error and access-denied state on every data-backed view
- [ ] Buyer-reaching-marketplace access-denied path — the hard product boundary
- [ ] Responsive layouts verified at real breakpoints
- [ ] OTP flow presented as sample-data, never as live authentication

## Stage 4 — Seller **[blocked on visuals]**

| Inventory # | Screen |
|---|---|
| 9 | KYC submission & status — pending / approved / rejected |
| 10 | Lead marketplace — masked cards, filters, freshness/Sale treatment |
| 11 | Purchase confirmation & download |
| 12 | Billing & credits |

- [ ] Masked lead data rendered as a genuine masked state, **not** a blur over real values — the server omits those fields (`design-brief/05-implementation-constraints.md` §3)
- [ ] Purchase flow presented as sample-data; no simulated payment shown as live
- [ ] Credit expiry surfaced via the business-rules config, not a hardcoded period
- [ ] Pending-KYC and rejected-KYC access states

## Stage 5 — Builder **[blocked on visuals]**

| Inventory # | Screen |
|---|---|
| 13 | Property management — list + create/edit with media |
| 14 | Builder enquiries |
| 15 | Subscription |

- [ ] Enquiry card supports **both** masked and revealed contact states — the reveal rule is an unresolved client decision (`design-brief/04-confirmed-vs-unresolved.md` §B4)
- [ ] Subscription price rendered from config with an unresolved placeholder, never a hardcoded figure
- [ ] Subscription-inactive / lapsed state
- [ ] Media upload handles bad aspect ratios and the no-image case

## Stage 6 — Admin **[blocked on visuals]**

| Inventory # | Screen |
|---|---|
| 16 | KYC verification queue |

- [ ] Reconcile "Screen 7 - Admin" baseline naming against this inventory (`approved-baseline.md` §4)
- [ ] KYC queue ageing shown as an internal ops aid, never as a customer-facing turnaround promise
- [ ] Document handling treated as sensitive in the UI

## Stage 7 — Priority 3 screens **[blocked on visuals]**

Lead management detail · support ticket list / new / thread · profile & password · invoices list and
detail · admin user management, property moderation, lead & pricing management, billing & refunds,
support management, audit log, platform settings · suspended account · 404 / not found.

---

## Carried-forward checks — design approval does not mark these passed

- [ ] Accessibility: colour contrast verified against the approved palette
- [ ] Accessibility: visible focus states on all interactive elements
- [ ] Accessibility: real form labels and error association
- [ ] Accessibility: touch target sizing on mobile
- [ ] Accessibility: keyboard navigation through each journey
- [ ] Accessibility: screen-reader semantics (landmarks, headings, live regions for async states)
- [ ] Responsive verification on real devices/breakpoints
- [ ] Cross-browser check
- [ ] Lighthouse / performance pass on the public portal
- [ ] Build, typecheck and lint green

## Standing constraints

- [x] No secrets in frontend code
- [x] No payment authority in frontend code
- [x] No permissions enforcement in frontend code — server is authoritative
- [x] No business transactions executed in frontend code
- [x] Sample-data services clearly separated from real services
- [x] No simulated payment, authentication or messaging presented as live
- [x] kkl-web / kkl-backend / kkl-voice boundaries preserved
- [x] Reviewer controls kept outside the application
- [x] Not deployed publicly; no live financial or messaging operations
