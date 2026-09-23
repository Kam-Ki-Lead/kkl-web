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

One context could not be measured and is **not** guessed at: the Admin detail
screens' subject heading (`<h2 className="t-heading">` on eight screens). The
prototype strings were not reachable through the screen picker. Left as-is and
recorded here.

## 5 · Proposed deviations awaiting a decision

Listed in full in `acceptance.md` §1 category E. Summarised here so this
document is self-contained:

| # | Deviation | Owner |
|---|---|---|
| **E-P1** | B-15's three-way dialog does not appear on browser Back. Edits are retained and restored; nothing is saved silently | Client or designer |
| **E-P2a** | Focus indicator corrected with a dark companion edge — applied, sign-off open | Designer |
| **E-P2b** | Control border darkened `#C6CCE0` → `#8A8E9C` — applied, sign-off open | Designer |
| **E-P3** | Review imagery attributes every card; the approved homepage attributes only the project cards | Designer |

E-P4 is **withdrawn**: §4 above resolves it from the screens rather than
needing a ruling.

## 6 · What remains unclassified

Measured divergence is not zero and this pass did not chase it to zero. After
the fixes above, the residue is dominated by:

- **`weight 700->600` and `weight 600->700`** on labels and inline emphasis,
  in both directions, so there is no single shared cause to fix.
- **`family Archivo->Public Sans`** on S-07's filter tabs and S-17's ledger
  amounts, and **`Public Sans->IBM Plex Mono`** on reference identifiers —
  the second is a deliberate choice this project made and never recorded.
- **1px size differences** on secondary text, scattered across screens.

**None of these has been confirmed as a defect and none is claimed to be
clean.** They are the working list for whoever picks this up, and the ranked
JSON orders them. Reporting "zero open visual defects" while this section has
entries would be false, which is why it is here.
