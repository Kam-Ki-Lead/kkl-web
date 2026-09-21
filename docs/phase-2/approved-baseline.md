# Approved Baseline — Phase 2

Record of the design approval authorising Phase 2, and of the baseline actually used.

## 1. Approval of record

| Field | Value |
|---|---|
| Approval | Phase 1 designs approved by the client |
| Source package named | **"KKL - Screen 7 - Admin"** |
| Baseline repository | `github.com/Kam-Ki-Lead/kkl-design` |
| **Baseline commit** | **`5bc3512ecaae0a1af3c31871e7a1c629cba054fc`** ("Archive approved Phase 1 design baseline") |
| Recorded on | 21 Sep 2026 |

The kkl-design README records the approval: reported by the project owner in the project
conversation on 21 September 2026; the original written approval is not held in that repository.
Wording such as "ready for client review" and "not approved" inside the preserved export reflects
its pre-approval creation state.

**Approval covers the design baseline only.** It does not resolve the pending business rules
(C-12 — sixteen decisions, six blocking launch), and it does not certify technical checks,
production readiness, security or accessibility.

### "Screen 7 — Admin" ambiguity: resolved

A previous session flagged that the baseline is named after an Admin screen while the
implementation order starts with the homepage, and that "Screen 7" did not map onto the brief's
own 1–16 numbering.

**Resolved.** "KKL - Screen 7 - Admin" is the name of the *export*, taken from the last screen
worked on in the design project. The exported package contains the whole design system — public
homepage, Buyer, Seller, Builder and Admin consoles, the component library and the screen
inventory. The baseline is the package, not that one screen, and the public portal is present at
the same approval status. The design package uses its own `P-/S-/B-/A-/C-` ID scheme, which is
what `implementation-checklist.md` now maps against; the brief's 1–16 priority numbering is
superseded by it.

## 2. Access — resolved

The previous session recorded this as **BLOCKED**: the approved files could not be retrieved, so
no visual work was done. That blocker is cleared. The baseline is cloned at the commit above and
was read *and run*, not just read.

### Running the baseline locally

The prototypes are Claude Design canvas files (`x-dc` with `sc-for` templating) expanded at
runtime by `support.js`. Reading the source is genuinely insufficient — the markup is templates
until the runtime resolves them.

They need one HTTP origin (`python3 -m http.server 8080`) and React, which `support.js` pulls
from `unpkg.com`. That CDN is blocked by this environment's egress policy, so the prototypes
render blank here until React is mirrored:

```
npm install react@18.3.1 react-dom@18.3.1 @babel/standalone@7.29.0   # registry.npmjs.org is reachable
# copy the UMD builds beside a *copy* of the design repo, repoint the three unpkg URLs in that
# copy's support.js at them, and serve the copy. kkl-design itself stays untouched.
```

`images.unsplash.com` is blocked too, so the baseline's illustrative photography does not load
here. That does not affect layout comparison, and the imagery is placeholder regardless — the
baseline states every image must be replaced with licensed project photography before launch.

Viewport width alone does not reflow the prototypes: the 360/390/768/1024/1440 tabs are reviewer
controls that resize an inner frame. To see the approved mobile layout, click the width tab.

## 3. What was read

`README.md`, `HANDOFF.md`, `CONTINUATION.md`; `KKL Phase 1 - Screen Inventory.dc.html` (113 rows
with a route path per ID); `KKL Component and State Library.dc.html` (C-01 to C-12, rendered
section by section); `KKL Homepage - Portal Layout.dc.html` at 1440, 768 and 390; and the Buyer,
Seller, Builder and Admin console prototypes.

## 4. Values taken from the baseline

C-01 colour tokens and the C-02 type scale are transcribed exactly into `src/app/globals.css`.
Logo geometry and the header, hero and footer values were measured from the rendered DOM rather
than estimated from screenshots.

| Token | Value | Role (C-01) |
|---|---|---|
| Brand blue | `#1B3BB3` | Primary actions, active navigation, links |
| Deep blue | `#0F2478` | Hover on primary, dashboard rail |
| Saffron | `#F2A20C` | Accent rule, focus ring, count badges **only** |
| Ink | `#12182B` | Headings, admin rail, primary text |
| Body | `#2A3250` | Paragraph and value text |
| Muted | `#5A6480` | Labels and secondary text |
| Surface | `#F4F6FB` | Page background behind cards |
| Tint | `#F6F8FD` | Inset panels and fact blocks |
| Line | `#E1E4EE` | Card borders and dividers |
| Success | `#0E6B45` | Approved, delivered, consent given |
| Warning | `#8A4A08` | Pending, ageing, unresolved rules |
| Danger | `#B3261E` | Rejected, failed, destructive |

Type: Archivo (headings, numbers), Public Sans (body), IBM Plex Mono (references, masked values),
eight steps. Focus ring 3px saffron at 2px offset on every interactive element. Minimum target
44px, 48px where a thumb is likely.

## 5. Implementation decisions

Recorded because they are departures from, or judgements about, the baseline.

1. **Reviewer chrome is excluded.** The round badge, width tabs, "Viewing: guest" switcher,
   review-notes panel and "Prototype · synthetic listings" caption are review tooling, not
   product. None of it is implemented.

2. **Exported HTML is not copied.** The designs are reimplemented as routes, layouts and reusable
   components. Values measured from the export appear as tokens and component styles.

3. **Fonts are self-hosted** via `next/font` rather than the baseline's Google Fonts `<link>`, so
   the application makes no runtime CDN request.

4. **No stock photography ships.** Every card and gallery renders the designed no-image fallback
   until kkl-backend serves real builder media.

5. **Listing counts are derived from the fixtures, not carried over.** The baseline shows
   illustrative totals (244 listings, 128 in New Town) against a much smaller sample set. Copying
   them would have the homepage claim 128 listings that search to six. Layout is unchanged; only
   the magnitudes follow the data.

6. **Mobile follows the approved mobile layout, not a reflow.** Compact dark hero, location full
   width with BHK and budget paired, property type behind a "+ More filters" disclosure,
   two-column locality grid.

7. **Masking is a content state, never a blur.** `MarketplaceLead` carries no contact fields at
   all, so an unpurchased lead's contact details cannot reach HTML, client state or a network
   response by mistake.

8. **Sample mode fails closed.** `NEXT_PUBLIC_KKL_ENV=production` with sample data throws at
   module load, as does `api` without a base URL. `NEXT_PUBLIC_KKL_ENV` is deliberately separate
   from `NODE_ENV` so a local production build still works.

9. **ESLint config repaired.** The inherited `FlatCompat` setup threw "Converting circular
   structure to JSON" on load, so lint could not run at all. `eslint-config-next` 16 flat configs
   are now imported directly.

## 6. Baseline defect observed — not inherited

The baseline README records an unresolved defect: the homepage emits console entries that
serialise to empty objects. Run here, it instead throws a visible
`TypeError: Cannot read properties of undefined (reading 'frame')` from the prototype runtime's
`componentDidUpdate`. That may be the same defect through a different runtime, or an artifact of
this environment's blocked image loads; it was not pursued further because it is a defect of the
prototype runtime, not of the product.

The application's own console output is checked independently — see `verification.md`.

## 7. Carried-forward checks — not discharged by design approval

Tracked in `verification.md`: screen-reader testing (none performed), individual status-chip
contrast measurement, and native browser zoom / Firefox text-only zoom. The baseline's simulated
200% text enlargement was **Partial**; none of these may be reported as passed without performing
them.
