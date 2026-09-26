# Phase 2 — visual differences, classified

Every measured difference between the approved prototypes and the
implementation, grouped by **what kind of thing it is**. A list that mixes a
broken mobile action with a sample figure and a tool artefact is a list nobody
can act on, which is why this exists separately from the ranked JSON.

Sources: `visual/geometry-1440.json`, `visual/geometry-390.json`, the captured
pairs in `visual/`, and direct measurement of the prototype where the differ
could not reach.

**This does not aim at zero numerical divergence, and reaching zero would mean
the tool had stopped measuring rather than that the screens matched.** Sample
content differs on purpose; the library and the screens disagree with each
other; and some differences are the measurement, not the screen.

---

## 1 · Implementation defects — fixed in this pass

| # | Screen(s) | Difference | Evidence | State |
|---|---|---|---|---|
| D-1 | All console screens | Console header title rendered **26px/800**; S-06, B-07 and A-02 all render **22px/700** | `verify-typography.mjs` rows 4–6 | Fixed |
| D-2 | S-06, B-06, A-02 | Panel headings rendered **17px**; the approved consoles render **18px/700** | `verify-typography.mjs` rows 7–9 | Fixed |
| D-3 | P-01 | Listing card titles rendered **17px**; P-01 renders **18px/700** | `verify-typography.mjs` row 10 | Fixed |
| D-4 | Every form (30 screens) | Field labels rendered ink **#12182B**; the approved forms render body **#2A3250** — 14px/600 at that colour appears 14 times in the Buyer journey and never at ink | `visual/geometry-1440.json`, pattern `colour rgb(42,50,80)->rgb(18,24,43)` | Fixed |
| D-5 | 16 console screens | The rail footer card's label rendered **#8A9AD8**; the approved consoles render **#B9C3EC**. Regressed in the previous pass when a hardcoded value was swapped for the wrong token | `geometry-1440.json`, pattern `colour rgb(185,195,236)->rgb(138,154,216)` | Fixed |
| D-6 | All console screens @390 | Header title and subtitle truncated with an ellipsis — "Operations dash…" — where the approved A-02 fits the title and wraps the subtitle | `visual/A-02-390-{baseline,implementation}.png` | Fixed (previous pass) |
| D-7 | P-01 | Section headings demoted 26px → 17px by this project's own earlier fix | `visual/P-01-1440-*.png` | Fixed (previous pass) |

D-1 to D-3 share one cause and are resolved together in §2 of
`acceptance.md`: the C-02 library names one step where the screens render
five.

### This pass — the differ's residue, chased to the baseline

The previous pass left §6 below as an unclassified working list. This pass
took every remaining row back to the rendered baseline and either fixed it or
classified it. What was confirmed as a defect and fixed:

| # | Screen(s) | Difference | State |
|---|---|---|---|
| D-8 | 16 flow pages across all three consoles (registration, KYC, purchase, payment, recharge, result) | Panel page titles rendered at the 34px page-title step; the approved flow screens render **30px/800 Archivo**. The differ had missed these because it paired the topbar's 22px span, not the panel heading — found by direct measurement. New `.t-flow-title` | Fixed |
| D-9 | A-13 and every Admin lead detail | The rail's "Leads" item matched `exact`, so it rendered **inactive** on `/admin/leads/LD-*` — the one console section whose own pages disowned it. Rail items gained `excludePrefix` | Fixed |
| D-10 | Every chip, all four journeys | Chips rendered 600-weight; the baseline draws **700**. Admin table chips rendered 13px; the baseline draws **12px** (new `size="sm"`). Danger-chip foreground `#B3261E` → the baseline's **`#7A2119`**; muted-chip foreground → the baseline's slate **`#3C4763`** | Fixed |
| D-11 | A-05, A-13, A-16, A-21, A-23, A-27, A-28 and others | Reference identifiers had a mono treatment the approved screens reserve for the Admin ledger and audit contexts; queue and list references are **Public Sans** at the sizes and colours the approved screens render (K-refs 15px body-colour, U-refs 14px muted sans, T-refs 14px sans, LD/E/RF/ORD refs 12px) | Fixed |
| D-12 | B-07, B-16 | Listing rows rebuilt to the approved card: pill filter chips (14px/600, brand-filled when active) instead of underline tabs — on **both** screens, B-16 included — Archivo titles, 12px chips, and the approved action set: primary **Edit listing**, secondary **Preview**, quiet toggle, quiet-danger **Delete** | Fixed |
| D-13 | Every form submission and console action | The baseline draws **four** button steps, not two: **lg 17px/700** for form submissions ("Send OTP", "Send enquiry", "Continue to KYC"), md 16px/700 default, **action 15px/700** for console header and row actions, sm 14px. Submissions were at md and console actions scattered. New `quietDanger` (the baseline's underlined destructive link) and `secondaryBrand` (S-25/B-25 "View status": white surface, border, **brand** label) variants, so no className overrides a variant's text colour — two utilities for one property are decided by stylesheet order, not intent | Fixed |
| D-14 | B-18 | The notification toast was brand-deep; the approved toast is **ink `#12182B`** with a saffron icon chip, `#C6CCE0` body and a white **View** button | Fixed |
| D-15 | B-13 | The preview card's measures: price **23px/800**, name 19px/700, locality 15px body, possession 14px/700 `#8A4A08`, amenity tiles 14px body on `#F0F2F9` | Fixed |
| D-16 | P-11, P-13, P-04, P-05 | P-11's one filled action is **"Browse properties"** — the implementation had it secondary and its own added sign-in action primary; swapped. P-13's "Awaiting builder" chip is the **warning** tone (`#8A4A08`), not neutral brand. P-04/P-05 submit at lg with the OTP note at **14px** | Fixed |
| D-17 | S-02, S-03, S-24, S-25, B-01, B-03, B-05, B-06, B-17, B-19, B-21, B-22, B-23, A-01, A-02, A-04, A-06, A-08, A-09, A-14, A-15, A-17, A-18, A-19, A-20, A-24, A-25, A-26, A-30, A-31 | Per-screen size, weight, family and tone corrections, each measured against the approved screen: legend and label colours, stat-block and ledger typography, chip tones and sizes, button sizes, caption steps. Itemised in the commit message for this pass | Fixed |

One harness row was wrong, not the application: `verify-visual-baseline.mjs`
expected a 21px `.t-figure` stat tile on S-06; the rendered baseline's tile is
**26px/800 Archivo**. The row now encodes the measured value.

### This pass — the owner-reclassified corrections (E-P5, E-P6) and one shared step

The owner reclassified E-P5 and E-P6 as **corrections to match the approved
baseline**, not deviations needing approval. Both are closed:

| # | Screen(s) | Difference | State |
|---|---|---|---|
| D-18 | B-02 (and B-01) | B-02 rendered inside the Builder console shell; the approved B-02 is a **standalone light page** sharing B-01's pre-console chrome. Restored: new `BuilderOnboardingShell` (approved wordmark header, static three-step bar, centred 640px column at the approved 16 / 20·22 / 24·28 padding steps), the approved title steps (24/27/30px), intro and amber note verbatim, the four approved document cards with their hints and dashed upload buttons, and the approved validation — a single submit-line error, no per-document errors on submit (the per-document box in the approved source is the simulated format-rejection state, unreachable in sample mode). B-01 adopts the same shell — the approved chrome is shared and B-01 was missing its steps bar | Fixed |
| D-19 | B-07 | Listing rows were text-only; the approved rows are **image-bearing cards**. Restored: the approved image slot (100%×180 / 200×170 / 250×186 on `#EEF0F7`), the approved margins, the actions row without the added divider, and the approved **"No photos yet"** missing-photo state (the Sundew draft carries it, as in the approved fixture). `ListingSummary.coverImage` resolves the first renderable photograph, else the review session's stand-in cover; a listing whose photo was chosen but never stored (sample mode keeps no bytes) says **"No file kept — sample mode"** rather than claiming no photos. `PropertyImage` now renders its designed fallback for an empty-URL media record instead of a broken `img` — this also fixes B-13's preview for such listings | Fixed |
| D-20 | Every console screen @390 and tablet | Console header title rendered 20px below 1060px; the approved steps are **19px** below 620px and **21px** at 620–1059 (`pageTitleSize: pick('19px','21px','22px')`). Surfaced only after the geometry harness fix below — earlier 390 runs had measured the prototype's desktop frame, and the row had been classified against a 22px baseline that the 390 frame never rendered | Fixed |

One harness row was wrong, not the application: `verify-screen-geometry.mjs`
clicked the prototype's width tab with a whitespace-sensitive selector that
never matched, so its 390px runs silently measured the prototype's **default
1440px frame**. The click now falls back to a trimmed-text match, the same way
`capture-visual-comparison.mjs` already did, and geometry-390 has been
regenerated. Every §6 row that cited a 390 measurement was re-derived.

#### D-20 evidence impact — closed

The full impact of the broken selector, closed out after the fix above:

- **Affected recorded results.** Only `visual/geometry-390.json` as committed
  at `dfb0165`, `969ae3d` and `1591aa0`. In those revisions every "390"
  measurement is the prototype's 1440 frame at a 390 viewport and is
  **superseded** by the regeneration at `7afe140`; `visual/README.md` carries
  the marker. Nothing else was affected: every 1440 geometry run measured the
  default frame it intended; every PNG capture went through
  `capture-visual-comparison.mjs`, which already had the working fallback; the
  E-P1/E-P2/E-P3 evidence never drives the prototype at 390.
- **The harness now fails explicitly.** All four scripts that drive the
  prototype's width tabs go through `scripts/proto-width.mjs`, which selects
  the tab and then **asserts the stage frame's rendered width** (±3px for the
  frame border). A run whose frame does not match the requested width throws
  and no measurement or capture happens. The two evidence scripts that still
  swallowed the 1440 click (`capture-contrast-evidence.mjs`,
  `capture-attribution-evidence.mjs`) now use the same helper — harmless
  before, since 1440 is the default frame, but the swallow is gone.
  Negative-tested: requesting a width the prototype does not offer fails the
  run with "refusing to measure or capture against the wrong frame".
- **Rerun and investigation.** The 390 sweep was rerun with the hardened
  harness and reproduces the `7afe140` regeneration. Comparing the superseded
  file against the corrected one surfaced a class the broken runs had hidden:
  **the approved prototypes step their display type down at mobile and the
  implementation holds the desktop step** — plus a handful of flat-size rows
  that desktop pairing had kept ambiguous. Every newly surfaced row is
  classified in §6 ("Typography at 390 — surfaced by the harness fix"). None
  of it is corrected in this pass: the owner's instruction is to record, and a
  responsive-type pass is a cycle of its own.

## 2 · Intentional sample-content differences — not defects

The prototypes carry illustrative figures; this build carries fixtures. The
numbers differ by design and **must not be reconciled**, because matching them
would mean inventing data the client has not supplied.

| Kind | Example | Why it differs |
|---|---|---|
| Counts and totals | "Search 128 properties" against "Search 6 properties"; 4 KYC applications against 7 | Derived from fixtures; the prototype's are illustrative |
| Money | Ledger amounts, balances, invoice totals | Same |
| Dates and references | `E-8801`, `INV-2026-0821`, "Published 2 Aug 2026" | Fixture identifiers |
| Relative time | "2 days ago" in the prototype, an explicit date here | A relative time computed server-side is wrong as soon as it is cached |
| Longer copy on open rules | "Expiry period is not yet set by the client" | Names the decision rather than abbreviating it |
| Sample-data banner and disclosure panels | Present here, absent in the prototype | Required: nothing here is a real account |

## 3 · Measurement and matching artefacts — not differences in any screen

The differ matches elements across two unrelated DOMs **by their rendered
text**. That is the only key available, and it mismatches when the same words
appear twice.

| Artefact | What it looked like | What it was |
|---|---|---|
| Header-versus-footer matches | `Sign in`: prototype `#1B3BB3`, implementation `#D7DDF6`, on 18 screens at 390 | Two different elements. The prototype's mobile frame renders no site header at all, so the only "Sign in" on that side is elsewhere on the page. The differ now records each element's surface and position and **excludes** pairs that disagree on both |
| Rail-versus-header matches | `Dashboard` measured 15px against an expected 22px | The rail link, not the console title. The typography check is scoped to `header` for those rows |
| Stage-versus-viewport width | `content width 1344 -> 1440`, and `1344 -> 390` at mobile | The prototype's stage against the application's viewport. Fixed: the differ now takes the widest box **narrower than** the frame |
| Pill radius notation | `999px` against `3.35544e+07px` | The same pill. Chromium clamps an enormous radius to 2²⁵px; the baseline writes 999px. Normalised |
| Text-transform on already-uppercase text | `transform none->uppercase`, 231 times | Both sides render the same glyphs. Excluded when the matched text is already uppercase |
| Prototype reviewer chrome | 92 of 93 screens "diverging" on the first run | The tool was reading the prototype's screen picker and width tabs. Scoped to the emulated frame |
| Prototype width-tab click | Every 390px geometry run measured the prototype's **desktop frame** | The differ's `:text-is()` selector never matched the tab's padded label, and the failure was swallowed. Fixed with the same trimmed-text fallback the capture script already used — and now **asserted**: `scripts/proto-width.mjs` verifies the frame's rendered width and fails the run if it is not the requested one. geometry-390 regenerated, one long-standing misclassification (console titles) corrected as D-20, and the newly surfaced rows classified in §6 |
| B-02's upload button label | "Choose File" in the implementation against "Choose file" in the approved render | The approved composition **is** a file input's native chooser button; "Choose File" is the browser's own label for that control, not page copy. Styling (dashed border, brand ink, 15px/700, 8px radius) matches the approved drawing; the caption text is the platform's |

## 4 · Conflicts inside the approved baseline — resolved by screen precedence

**C-02 declares one step — "Card and section title — Archivo 700 · 17px" — and
the screens render five.** Applying the library's single label everywhere is
what caused D-1, D-2, D-3 and D-7.

Measured from the rendered baseline at 1440:

| Context | Baseline | Class | Representative screen |
|---|---|---|---|
| Page title | 34px / 800 | `.t-title` | P-03 subject |
| Public section heading | 26px / 700 | `.t-section-title` | P-01 "Featured properties" |
| Console header title | 22px / 700 | `.t-console-title` | S-06, B-07, A-02 |
| Console panel heading, and the portal's listing-card titles | 18px / 700 | `.t-panel-title` | S-06, B-06, A-02, P-01 cards |
| Card title (compact and stat cards) | 17px / 700 | `.t-card-title` | S-06 "Credits" |

**So 17px and 18px were never a contradiction** — they are two roles the
library gave one name. The precedence rule, now written into `globals.css`:
**where an approved screen renders a size, that size wins over the library's
generic label.** Verified per context by `verify-typography.mjs`, 11/11.

One context could not be measured at the time and was **not** guessed at: the Admin detail
screens' subject heading (`<h2 className="t-heading">` on eight screens). The
prototype strings were not reachable through the screen picker. The fixed 390
harness has since reached them: the approved subject steps **23 / 26 / 28**
and the implementation holds 28px — recorded in §6, Class A.

## 5 · Proposed deviations awaiting a decision

Listed in full in `acceptance.md` §1 category E. Summarised here so this
document is self-contained:

| # | Deviation | Owner |
|---|---|---|
| **E-P1** | B-15's three-way dialog does not appear on browser Back. Edits are retained and restored; nothing is saved silently | Client or designer |
| **E-P2a** | Focus indicator corrected with a dark companion edge — applied, sign-off open | Designer |
| **E-P2b** | Control border darkened `#C6CCE0` → `#8A8E9C` — applied, sign-off open | Designer |
| **E-P3** | Review imagery attributes every card; the approved homepage attributes only the project cards | Designer |

E-P5 and E-P6 were **reclassified by the owner as corrections to match the
approved baseline** and are closed — see §1 (D-18, D-19). E-P4 is
**withdrawn**: §4 above resolves it from the screens rather than needing a
ruling.

Two **additions** the implementation carries and the baseline does not —
recorded so they are not mistaken for approved elements, not proposed for
removal: A-04 has an "Open the KYC queue" action the approved screen omits,
and P-11's sign-in panel adds a "Sign in or register" action beside the
approved "Browse properties" (which keeps the filled-primary slot, as
approved).

## 6 · What remains — classified, row by row

This section used to be an unclassified working list. **It no longer is.**
After the fixes in §1 (D-8 to D-17), the differ was re-run against the review
build at the implementation commit on the decision sheet, at 1440 and at 390;
the responsive-type pass (`5c3a658`) added the 768 tablet sweep. Everything
it still reports is below, with its classification. Nothing is carried as
"unclassified".

### Typography residue at 1440 — 13 rows, none a defect

| Row | Classification |
|---|---|
| B-11 "Covered parking" — colour body → white | **Sample-data artefact.** The impl fixture has that amenity selected (white on brand chip); the baseline's does not. Same chip, different fixture state |
| P-02 filter labels ("Location", "Property type", "BHK", "Budget") — 13px → 14px | **Baseline-internal inconsistency, recorded.** P-02 draws these labels at 13px where P-01 draws the same role at 14px. The 14px step is kept; noted in `search-filters.tsx` |
| P-02 and P-10 price ranges — 23px → 24px | **Baseline-internal inconsistency, recorded.** P-01 renders the same price treatment at 24px. The 24px step is kept |
| S-06 "₹4,200" — black → ink | **Prototype artefact.** The baseline declares no colour on the stat value, so it inherits the page's default black. The implementation keeps C-01's darkest text token, ink |

### Typography at 390 and 768 — corrected in the responsive-type pass

The corrected 390 sweep (harness assertion in `scripts/proto-width.mjs`;
regeneration first committed at `7afe140`) surfaced rows the broken runs had
hidden, because the broken runs never rendered the prototype's mobile frame.
The owner then authorised the bounded responsive-typography correction, and it
landed at `5c3a658`: every row below was taken back to the approved source,
corrected with the semantic style that owns the role and the approved
620/1060 breakpoints, and re-measured at 390, 768 and 1440. The tablet sweep
is new this pass — the screen map carries only the two extreme widths, so a
wrapper extends the affected pairs in memory for a 768 run; the frame-width
assertion is kept, and the run is recorded in `visual/README.md`.

**Class A — the approved screens step display type down at mobile; the
implementation held the desktop step. Fixed.** The approved steps are the
sources' own `pick(mobile, tablet, desktop)` declarations, now carried by the
semantic classes that own each role:

| Approved step | Rows | Fix at `5c3a658` |
|---|---|---|
| **26 / 30 / 34** — Buyer Journey page titles | 8 | `.t-title` carries the steps. P-13's confirmation title moved to it too — its desktop 26px was also wrong against the approved 34px |
| **24 / 27 / 30** — console flow titles | 6 | `.t-flow-title` carries the steps; the editor wizard title and the three detail pages that had borrowed `.t-title` moved to it |
| **21 / 24 / 26** — portal section headings | 4 | `.t-section-title` carries the steps |
| **26 / 32 / 38** — portal featured-card title | 1 | P-01 hero title steps on the class; an inline `fontSize` had been defeating it and pinned 38px at every width |
| **22 / 26 / 28** — portal featured-card price | 1 | P-01 hero price steps |
| **19 / 21 / 22** — Admin section heading | 1 | A-17 — see the pairing note below; the events-panel heading is now the approved 17px/700 |
| **23 / 26 / 28** — Admin detail subject | 1 | `.t-heading` carries the steps. The three support-ticket subjects moved off it to `.t-subsection` (approved 19px/700), which is what measured clean |

**Class B — flat approved sizes the implementation rendered differently.
Fixed.** These are not responsive steps: the approved source declares one
size at all widths. They surfaced only at 390 because at 1440 the same text
appears twice on a side and the differ (correctly) declines to pair it.

| Row | Approved (flat) | Fix at `5c3a658` |
|---|---|---|
| S-14 "₹4,200 credits" | 38px/800 (Seller Console, wallet balance) | `.t-balance`, a new semantic class for the role |
| B-22 wallet balance | 38px/800 (Builder Console) | `.t-balance` |
| S-18 "₹4,200 credits" | 24px/800 (Seller Console, expiry-state amount and rail balance) | inline 24px/800 on the three expiry amounts |
| P-01 "Buy" | 17px/700 Archivo (Portal Layout, search-panel tab) | 17px Archivo on the tab |
| A-06 "Approve verification" | 16px/700 (Admin Console, KYC actions) | md buttons, 16px |
| S-20 invoice subject — **found by the source review this pass; no differ row had flagged it** | 21px/800 flat (Seller Console, invoice) | inline 21px/800 |

**Class C — one non-size row. Fixed.** P-01 "+ More filters (property type)"
is now 15px/**700**, the approved mobile filter-toggle weight.

**Pairing suspects — resolved, and both were real.** B-18 "Enquiries"
(15 → 16) was a real specimen mismatch: the approved B-18 notification
specimen is a 15px/700 white label on a brand row inside a brand-deep well,
and the implementation's specimen page drew a different composition — rebuilt
to the approved one (the real rail item was already correct). B-24 "Active"
(16 → 13) did pair across elements, but the aside behind it was a real
composition difference: the approved B-24 panel is one "Account status" card
of 12px-label / 16px-600-value tiles with "Verification" and "Subscription"
actions. The aside is rebuilt to that panel; the implementation's extra
Suspension card is kept and recorded as an addition. The S-14/S-18 structural
row `button radius [50% | 6px] -> [8px]` is the prototype's mobile pill button
against the implementation's 8px — recorded with the standardisation note in
the structural table below.

### Console chrome — surfaced by the tablet sweep

The 768 run pairs elements the extreme widths cannot: at 1440 the rail and
the header carry the same label and the differ (correctly) declines to pair
duplicates, and at 390 the chrome is hidden. Four rows, each taken back to
the approved console templates and **fixed at `5c3a658`**:

| Row | Approved | Fix |
|---|---|---|
| Builder header subscription chip — 13px → 14px | 14px/700, visible at frame width ≥ 480 (Builder Console header) | `Chip size="lg"`; the hide threshold moves from 560px to the approved 480px |
| Builder rail footer value ("Active") — 700 → 800 | 17px/**800** Archivo | per-console value step on the rail footer |
| Seller rail footer value (balance) — 17px/700 → 24px/800 | 24px/800 Archivo — the same approved value the Class B table cites for S-18 | per-console value step on the rail footer |
| Seller header balance — neutral chip → outlined pill | a pill **button** to billing: 15px/700 ink on #F6F8FD with a #D4DBF3 border, visible ≥ 480px | it navigates; it is not a status chip |

The Admin header's identity tag is **not** a difference to correct: the
prototype draws "OPS · FULL ACCESS", implying an access level that does not
exist — recorded in `acceptance.md` against the D-2 dependency.

**Further findings recorded this pass:**

- **A-18 "Balances by account"** — the approved screen is a row list (name
  15px/600, balance 19px/800, "Ledger →" 14px/700); the implementation renders
  cards. The amounts are fixed to the approved 19px/800; the cards-versus-rows
  composition is recorded for the owner, not changed unilaterally.
- **A-01 login title** — approved at 26px/800 **flat**. Leaving it on the
  newly stepped `.t-heading` would have created a fresh mobile mismatch; it is
  inline 26px/800 with a comment saying why.
- **Builder marketplace and purchased-lead detail pages** have no approved
  counterpart screens; they are aligned to the approved S-08 pattern (the
  approved copy states the builder's marketplace access is identical to the
  broker's). Recorded so a future approved frame is matched deliberately.
- **B-24 "Suspension" card** — an implementation addition the approved panel
  does not draw. Kept, retitled, and recorded here so it is not mistaken for
  an approved element.

| Row | Classification |
|---|---|
| Console header titles | **Fixed (D-20).** Earlier 390 runs of the differ had measured the prototype's default desktop frame — its width-tab click never landed — so this row was classified against a 22px the approved 390 frame never rendered. With the harness fixed, the approved mobile step measured **19px** (tablet 21px); the implementation's flat 20px was corrected to the approved 19/21 steps and the row is gone |
| A-17 "Delivery record" — 19px → 22px | **Cross-element pairing, surfacing a recorded composition difference.** The approved A-17's console title is "Delivery record" (19px at 390); the implementation titles its shell with the order reference ("Order ORD-…", at the corrected 19px) and keeps "Delivery record" as a panel heading — now at the approved events-panel step, 17px/700 ("Delivery & download record"). At 1440 the coincidence 22 = 22 hid this. The wording difference is **recorded, not corrected** — which words title a screen is a content decision, referred to the owner |
| The 1440 residue rows | The same rows as 1440, for the same reasons |

### Structural rows — all accounted for

| Pattern | Count at 1440 | Classification |
|---|---|---|
| `content width 1440 -> 1176 / 1184` | 67 | **Measurement artefact.** The differ compares the prototype's full-width stage against the implementation's rail-inset content column (1440 − 264 = 1176, 1440 − 256 = 1184). There is no full-width content box on a console screen to measure against |
| `content width 1440 -> 620 / 420 / 270` | 7 | **Measurement artefact.** Centred narrow layouts (forms, auth); the widest box narrower than the frame is the form card |
| `content width 1440 -> 640` (B-01, B-02) | 2 | **Measurement artefact.** The prototype's onboarding outer container spans the frame; the approved content column inside it is 640px, which is what the implementation renders as its widest box. Same class as the centred-layout rows above |
| `button radius [6px | 8px] -> [6px]` (B-02) | 1 | **Measurement limitation.** The approved upload button (8px) is rendered by the implementation as the file input's `::file-selector-button` — the approved composition's own control — and a pseudo-element's radius is invisible to the differ, which only reads the input itself. Visually verified in the B-02 pairs |
| `control border … -> … rgb(138, 142, 156)` | 16+ | **E-P2b, intentional.** The corrected control border `#8A8E9C`, awaiting design sign-off |
| `control border … -> … rgb(225, 228, 238)` | 6 | **E-P2b's stated scope.** Disabled fields (A-14) deliberately render in the card hairline on a tint — 1.4.11 excepts inactive components, and the exceptions document says so |
| `control height [52] -> [47]` and variants | ~20 | **Recorded, deferred.** The implementation's controls are 44px-minimum with 15px text (47px typical) against the baseline's 52px. A deliberate target-size floor; changing it is a design decision, not a defect fix |
| `button radius […] -> [6px]` | ~40 | **Recorded.** The implementation standardises on the baseline's dominant 6px (64 occurrences against 4 at 8px in the console documents). The baseline's residual 0/7/8px radii are its own inconsistency |

**What this means:** every measured difference that was a confirmed
implementation defect is fixed; everything still measured is a named artefact,
a recorded baseline inconsistency, an intentional correction awaiting sign-off,
or a deviation with its own exception row. If a future run of the differ
reports a row that is not in this table, that row is new and unclassified —
treat it as a finding, not as noise.
