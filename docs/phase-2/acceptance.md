# Phase 2 Frontend — Acceptance Report

What is finished, what is not, and — the part that matters most — **which kind
of "not finished" each remaining item is.** Lumping a missing backend into the
same list as a broken button produces a number nobody can act on.

Everything here is traceable to an approved source: the screen inventory and
prototypes in kkl-design @ `5bc3512`, the decision register in
`src/lib/config/business-rules.ts`, or kkl-backend's own docs. Where this
document once asserted a requirement with no source, that is marked and
withdrawn.

---

## 1. The four categories

| | Category | Count | Whose it is |
|---|---|---|---|
| **A** | Frontend defects or missing approved interactions | **1 open** | This repository |
| **B** | Frontend visual and accessibility verification | **5 open** | This repository, plus 2 design decisions |
| **C** | Backend / integration dependencies | **9** | kkl-backend — *not frontend work* |
| **D** | Unresolved client decisions | **16** | The client |

### A · Frontend defects or missing approved interactions

Work this repository owns and could do today.

| # | Item | State | Evidence |
|---|---|---|---|
| A-1 | B-15 unsaved-changes: mark, dialog, save/discard/keep, reload warning | **Closed** | `verify-builder-flow.mjs` 27–41 |
| A-2 | B-15 browser Back/Forward | **Closed** — edits survive; see §2 | `verify-builder-flow.mjs` 42–46 |
| A-3 | Card overrides ignored by the base surface | **Closed** — every coloured panel rendered white | `verify-visual-baseline.mjs` |
| A-4 | Three colour tokens and nine literals absent from the baseline | **Closed** | `verify-design-tokens.mjs` |
| A-5 | Card headings at the screen-heading step (26px vs 17px) | **Closed** | §3 |
| A-6 | Admin rail at the Seller's step; 20 items did not fit | **Closed** | §3 |
| A-7 | Form controls using the card hairline, not the control border | **Closed** | §3 |
| A-8 | Reflow failures at 320 CSS px on two screens | **Closed** | `verify-zoom.mjs` |
| A-9 | **B-15 unsaved-changes prompt on browser Back** | **Open, partial** | §2 |
| A-10 | P-03 gallery sized by ratio, not the approved fixed heights | **Closed** | §3 |
| A-11 | Public container 64px narrow on every page (border-box vs content-box) | **Closed** | §3 |
| A-12 | Deployment guard compared the server against itself, not the bundle | **Closed** | `verify-sample-mode-guard.sh` 10/10 |

**A-9 is the only open frontend item**, and it is partial rather than missing:
edits are no longer lost, but the approved *dialog* does not appear on Back.
The trade-off and what would close it are in §2.

### B · Frontend visual and accessibility verification

| # | Item | State |
|---|---|---|
| B-1 | Rendered comparison against the prototypes | **Done for 17 screens**, 11 at 1440 only — §3 |
| B-2 | Remaining screens compared | **Open** — 96 of 113 rows not compared |
| B-3 | Status-chip contrast measured | **Closed** — 5/5 pass, §4 |
| B-4 | Native and text-only zoom | **Closed** — 32/32, §4 |
| B-5 | Keyboard, dialog focus, validation announcements | **Closed** — 22/22, §4 |
| B-6 | Screen-reader behaviour | **Pending** — no tooling, §4 |
| B-7 | Forced-colors / High Contrast | **Pending** — needs Windows, §4 |
| B-8 | Imagery in the normal-state comparison | **Done for slot geometry** — §3 |
| B-11 | Photographic fidelity against the baseline's own images | **Blocked** — host denied, §3 |
| B-12 | Attribution band on cards with review imagery | **Open, review path only** — §3 |
| B-9 | Focus-ring contrast (2.11:1) | **Design decision** — §4 |
| B-10 | Control-border contrast (1.60:1) | **Design decision** — §4 |

### C · Backend / integration dependencies — *not unfinished frontend work*

These are listed so nobody counts them against the frontend. Every one is a
capability kkl-backend owns and has not published. **The frontend work for each
is complete**: a typed interface exists, a sample implementation behaves, and
the screen states are built and verified.

| # | Capability | Frontend state |
|---|---|---|
| C-1 | Authentication and sessions (Buyer OTP, Seller/Builder, staff) | Screens and states built; no session exists |
| C-2 | Authorization and staff roles | Not modelled — nothing here is separated by permission |
| C-3 | KYC document storage, scanning, retention | Upload fields built; no byte is stored |
| C-4 | Media storage for listings | Editor records a count; no byte is stored |
| C-5 | Payment capture and reconciliation | Three designed outcomes built; no gateway |
| C-6 | Lead intake pipeline | A-10, A-11 built over fixtures |
| C-7 | Voice qualification (kkl-voice) | A-24, A-25 built over fixtures |
| C-8 | WhatsApp journey | A-26 built over fixtures |
| C-9 | Notification delivery and suppression enforcement | A-27, A-28 built over fixtures |

**None of these is a frontend defect, and none blocks frontend acceptance.**
The contract each needs is in `docs/phase-2/service-contract.md`.

### D · Unresolved client decisions

Sixteen, unchanged since Phase 1 and listed in full in
`docs/phase-2/decisions.md`. Six **block launch**. They are not frontend work
either — but unlike category C they have a visible consequence, because several
screens are deliberately inert rather than unfinished:

- **D-01** no subscription amount appears on A-21 or B-03.
- **D-03** A-14's price fields are disabled placeholders.
- **D-06** A-20 records a refund decision and writes no ledger entry.
- **D-10** A-08 and A-09 have no approve action.
- **D-02** nothing hides a live listing when a subscription lapses.
- **D-05** both contact-access alternatives are built; a switch chooses.

A reviewer seeing an inert control on one of those screens is seeing the
decision, not a bug.

### A requirement this report previously invented

An earlier version listed **"no four-eyes rule on money"** as an outstanding
gap, as though A-19 and A-20 needed a two-person approval. **No approved source
asks for one.** The screen inventory does not mention it, the prototypes do not
draw it, and kkl-backend's access matrix specifies the opposite shape: an Admin
may "issue refund / adjust ledger", qualified only by *"audited ledger event
only, never a manual balance overwrite"* — which is what is built.

Withdrawn. It is recorded rather than deleted because an invented requirement
in a verification document reads as a defect, and somebody would have built it.

---

## 2. B-15 — the Back/Forward trade-off

**Reproduced first.** Editing a field, pressing Back, then Forward returned a
re-rendered page with the edit gone and no warning at any point.

### Each interaction, checked separately

| Interaction | Behaviour | Check |
|---|---|---|
| Save draft | Saves, clears the mark, settles the label | 35, 44 |
| Save draft and close | Saves **and** lands where the Builder was going | 33 |
| Discard changes | Leaves without saving; not undone by the restore | 32, 45 |
| Keep editing | Stays, preserves the typing, mark still up | 31 |
| Section navigation | Intercepted — dialog, not silent loss | 37, 38 |
| Console navigation (rail) | Intercepted | 36 |
| **Browser Back** | **Not intercepted.** Not data loss either | 42, 43 |
| **Browser Forward** | Returns to the work, with a notice | 43 |
| Reload / tab close | Browser warning armed while dirty, disarmed after save | 40, 41 |
| Without JavaScript | No mark, no dialog, no warning — stated on screen | L3 |

### What was rejected, and why

**A history trap** — pushing a duplicate entry and re-pushing it on every
`popstate` — was rejected. Back is not cancellable: by the time `popstate`
fires the navigation has happened, so the trap has to undo it. That breaks
Forward, grows the stack, escapes on a fast double press, and competes with the
App Router for the same events. It reports a pass and behaves badly.

**Next 16 Cache Components** was trialled properly, because it uses React's
`<Activity>` to preserve component state across client navigation and its own
documentation names form drafts as the case. It is a real option and it is not
free:

- Every route-segment `dynamic` export becomes illegal (4 layouts).
- The build then fails on per-visit `randomUUID` in the idempotency tokens,
  which must move behind `connection()` or into client components.
- Partial Prerendering becomes the default for the whole application.
- `<Activity>` preserves **at most 3 routes**; beyond that the oldest is
  evicted and the draft is lost anyway.

That is an architectural decision for the team, not an acceptance-pass change.
The config was reverted.

### What was done

The editor no longer tries to stop Back. It removes the reason to: the
section's unsaved values are held **per tab** as they are typed and put back
when the section is opened again, with a notice saying so. Back-then-Forward
returns to the work rather than to the last save.

`sessionStorage`, not `localStorage` — a draft outliving the tab would be a
surprise, one shared between tabs would fight itself. Every access is wrapped;
private windows and blocked site data make these calls throw, and a failure
there costs only the restoration. It is not storage of record: nothing reads it
but this form, and a save clears it.

### Why B-15 stays partial

**The approved dialog does not appear on browser Back.** The prototype is a
single-page mock with no browser history, so it cannot model Back and the
approved experience for it is undefined — but the inventory row says
"unsaved changes", and a reviewer may reasonably expect the dialog everywhere.

Closing it fully needs one of:

1. **Accept the current behaviour** — no data loss, no dialog on Back. Free.
2. **Adopt Cache Components** — the migration above, and still best-effort at
   3 routes.
3. **A history trap** — not recommended, for the reasons above.

**B-15 is marked partial pending that decision** rather than reported as a
pass.

---

## 3. Rendered visual comparison

### The prototypes now render, locally

They load React, ReactDOM and Babel from `unpkg.com` and fonts from Google
Fonts. This environment's network policy allows package registries and denies
arbitrary hosts, so the prototypes rendered as unexpanded `{{ template }}`
placeholders and **no screenshot comparison was possible at all.**

`scripts/setup-prototype-review.sh` fixes that: it fetches the **same pinned
versions** (react 18.3.1, react-dom 18.3.1, @babel/standalone 7.29.0) from the
npm registry and the same three font families from `@fontsource`, then writes a
copy of each prototype pointing at those local files.

**kkl-design is never modified** — the script verifies the baseline is
byte-identical before it finishes, and aborts if not.

```bash
# image-present state
./scripts/setup-prototype-review.sh ../kkl-design /tmp/kkl-prototype-review
(cd /tmp/kkl-prototype-review && python3 -m http.server 8099 &)
PROTO_URL=http://127.0.0.1:8099 BASE_URL=http://127.0.0.1:3811 \
  CAPTURE_SUFFIX=-photos ONLY=P-01-home,P-02-search,P-03-property \
  PLAYWRIGHT=… node scripts/capture-visual-comparison.mjs

# missing-media state — a second copy, so BOTH sides are missing their media
KKL_REVIEW_PHOTOS=off ./scripts/setup-prototype-review.sh ../kkl-design /tmp/kkl-prototype-nophoto
(cd /tmp/kkl-prototype-nophoto && python3 -m http.server 8098 &)
PROTO_URL=http://127.0.0.1:8098 BASE_URL=http://127.0.0.1:3811 \
  PLAYWRIGHT=… node scripts/capture-visual-comparison.mjs
```

Each state needs the application built to match: the image-present run against
a build carrying `NEXT_PUBLIC_KKL_REVIEW_IMAGERY=on` and
`NEXT_PUBLIC_KKL_IMAGE_ORIGIN`, the missing-media run against the ordinary
review build. Full commands in `local-review.md`.

The harness drives the prototype's **own screen picker and width tabs**, so it
reflows as designed — a browser viewport alone does not make it do that. The
implementation is captured **full page**, after scrolling to the bottom to
trigger anything lazy; it used to be captured at viewport size while the
prototype was captured as its whole frame, which made every long screen a
top-of-page comparison.

### Screens compared, and at which widths

25 pairs across 17 screens, in `docs/phase-2/visual/` — plus 5 pairs across the
3 public screens in the image-present state.

| Area | Screen | 1440 | 390 |
|---|---|:-:|:-:|
| Public portal | P-01 homepage | ✓ | ✓ |
| | P-02 search results | ✓ | ✓ |
| | P-03 property detail | ✓ | — |
| Seller | S-06 dashboard | ✓ | ✓ |
| | S-07 lead marketplace | ✓ | ✓ |
| | S-11 purchase result | ✓ | — |
| | S-14 billing | ✓ | ✓ |
| Builder | B-06 dashboard | ✓ | ✓ |
| | B-08 listing editor | ✓ | ✓ |
| | B-16 enquiries | ✓ | — |
| | B-19 restrictions | ✓ | — |
| Admin | A-02 dashboard | ✓ | ✓ |
| | A-06 KYC review | ✓ | — |
| | A-19 wallet adjustment | ✓ | — |
| | A-23 support ticket | ✓ | — |
| | A-30 audit log | ✓ | — |
| Shared | Mobile navigation drawer | — | ✓ |

**Eleven of the seventeen were compared at 1440 only.** An earlier version of
this table said "1440, 390" for whole journeys, which overstated it.

### Differences found, and fixed

Six, none of which any token or computed-style check could have seen:

1. **Card headings were at the screen-heading step.** C-02 declares
   "Card and section title — Archivo 700 · 17px"; the consoles render 18px.
   These were using `.t-heading` (26px/800) — the right ladder, the wrong rung.
   Fixed across 12 headings in all four journeys.
2. **The Credits card figure was 34px**; the approved Seller card declares
   30px. C-02's page-title step is a rung too high there.
3. **The Admin rail used the Seller's step.** The approved A-02 sets 14px with
   tighter padding, because twenty destinations do not fit at 16px. Added as a
   per-console density rather than a token.
4. **Form controls used the card hairline** `#E1E4EE` where the design uses the
   control border `#C6CCE0` at 1.5px — 124 occurrences against 268.
5. **The P-03 gallery was sized by aspect ratio.** The approved screen declares
   fixed heights — `galleryMainH` 400/320/220 and `thumbH` 194/150/120, at
   breakpoints 1060 and 620. At 1440 the implementation rendered 802×551 where
   the design is 843×400.
6. **The public container was 64px too narrow on every page.** `max-w-[1280px]`
   was read as a border-box width, giving 1216px of content; the baseline's
   wrappers are content-box, so 1280px there means 1280px of content inside a
   1344px box. Nine call sites across the public shell.

Findings 5 and 6 only became visible once photography was in the comparison —
an empty slot collapses to a box that resembles the design. They share a cause
worth carrying forward: **the approved prototypes are content-box and Tailwind
is border-box**, so a number copied across without that adjustment is short by
its own borders and padding. The first attempt at fixing 5 landed exactly 2px
short at every width for that reason.

Measured after the fix, implementation and prototype agree at 1440: 843 image,
845 wrapper, 1280 grid, 1344 container.

### Differences that remain — deliberate, and listed so they are not mistaken for defects

| Difference | Why |
|---|---|
| Sample-data banner above every screen | Not in the prototype. Required: nothing here is a real account |
| Per-console disclosure panel on dashboards | Same reason |
| Admin header reads "A. Dutta · Operations", not "OPS · FULL ACCESS" | The prototype implies an access level that does not exist |
| Admin rail shows the full wordmark, not a compact "K OPERATIONS" | Consistency with the other two consoles |
| Figures differ (4 leads not 12, 2 sale-tab not 3) | Derived from fixtures; the prototype's are illustrative |
| Recent activity shows dates, not "2 days ago" | A relative time computed server-side is wrong as soon as it is cached |
| Longer copy on unresolved rules ("Expiry period is not yet set by the client") | Names the decision rather than abbreviating it |

### Smaller differences the full-page captures show, recorded not fixed

These come from reading P-03 side by side at 1440 after the gallery fix. None
is a layout fault; they are listed so a reviewer comparing the same pair does
not have to work out whether they were noticed.

| Difference | Reading |
|---|---|
| Locality subtitle reads "New Town, Action Area II"; the prototype has "Action Area II, New Town" | An ordering choice, not a fixture artefact. Worth a decision if the prototype's order is deliberate |
| Pricing table has two rows against the prototype's three | Fixture-derived — the prototype lists a third "3 BHK large" configuration |
| "Map — tile provider not yet chosen" against "Map placeholder — tile provider not yet chosen" | Copy |
| "a target handover of Dec 2028" against "of December 2028" | Copy |

The first is the only one that would change a screen's meaning to a buyer, and
it is a one-line change once someone confirms which order the design intends.

### What is still not compared

**96 of 113 inventory rows.** The 17 compared were chosen by the priority list;
the rest have not been looked at, and no claim is made about them. The shared
*values* are right everywhere (`verify-design-tokens.mjs`,
`verify-visual-baseline.mjs`) because they come from shared components — that
says nothing about the layout of a screen nobody opened.

### Imagery — compared, with the limit stated

**B-8 is done for slot geometry and open for photographic fidelity.**

The blockage is real and unchanged: **this environment's network policy denies
`images.unsplash.com`** — re-confirmed this pass, the proxy rejects CONNECT —
so the baseline's seven photographs cannot be fetched here at all.

What was wrong was treating that as the end of it.
`scripts/make-review-photos.mjs` generates seven deterministic stand-in images
under the photo ids the baseline names; the prototype copy is rewritten to
fetch them and the application reaches the same files through
`NEXT_PUBLIC_KKL_IMAGE_ORIGIN`. Both sides receive identical bytes.

| | Established | Not established |
|---|---|---|
| Image-present state | Slot aspect ratio, crop behaviour, rounding, overlay and caption placement | Anything about the actual photographs |

That is what caught findings 5 and 6 above. It says nothing about photographic
fidelity and cannot: the files are placeholders and say so on their face.

The two states are captured as separate sets — `-photos` for image-present,
unsuffixed for missing media — and **neither stands in for the other**. Both
sides of a pair are always in the same state; the missing-media set uses a
second prototype copy built with `KKL_REVIEW_PHOTOS=off`.

**To close the remaining half**, one of:

- **Allow `images.unsplash.com`** in the environment's network settings, then
  re-run the capture with `NEXT_PUBLIC_KKL_REVIEW_IMAGERY=on` and no
  `NEXT_PUBLIC_KKL_IMAGE_ORIGIN`; or
- **Supply the licensed project photography** the baseline says is needed
  before launch anyway, and point the imagery module at it.

**One difference the image-present state leaves open.** The implementation
draws an attribution band on every card carrying review imagery; the approved
homepage draws one on the project cards but not the property cards. This
exists only on the review-imagery path, which is off by default, and goes away
when licensed photography replaces the stand-ins. Recorded rather than
changed — dropping attribution from a card showing a third party's photograph
is not a decision to take on layout grounds alone.

---

## 4. Accessibility

### Measured and passing

| Check | Result | How |
|---|---|---|
| Status-chip contrast — all five | **5/5 pass**, 5.26:1 to 8.07:1 | `verify-contrast.mjs` |
| Text and surface pairs | **24/24 pass** AA | same |
| Reflow at 320 CSS px (1.4.10) | **16/16 screens** | `verify-zoom.mjs` |
| Text-only zoom 200% (1.4.4) | **16/16 screens** | same |
| Every control labelled | **5 screens**, one per console | `verify-accessibility.mjs` |
| One h1, no skipped levels | **5 screens** | same |
| Keyboard reaches field and submit | pass | same |
| No positive tabindex | pass | same |
| Dialog: focus in, named, Tab trapped, Escape keeps the edit | **4/4** | same |
| Validation announced with `role="alert"` | **2 screens** | same |
| Invalid field points at its own message | pass | same |
| Mobile drawer: opens, reports state, Escape closes | **3 consoles** | same |

**C-11's chip-contrast item is closed.** It had been carried forward since
design approval; it is arithmetic on values this repository already held.

Two reflow defects were found and fixed: `sr-only` on a `<table>` does not
remove it from layout (a table cannot shrink below min-content, so `width:1px`
is ignored) and pushed `/seller/billing` 23px wide; and the Admin search form
did not wrap, pushing `/admin/users` 43px wide. Both looked perfectly fine.

### Pending — tooling or platform unavailable

Recorded as pending. Not passed, not failed.

| Check | What is needed |
|---|---|
| **Screen reader** (NVDA, JAWS, VoiceOver) | A screen reader. None is installed here and none can be |
| **Forced-colors / High Contrast** | A Windows host. This is a *real* risk: the application sets explicit backgrounds and borders throughout, which is the usual cause of failure |
| **Voice control** (Dragon, Voice Access) | The tooling |

What *is* checked is the markup that would produce announcements — roles, live
regions, `aria-describedby` wiring. That is the difference between "the page
says the right things" and "the page is usable without sight". **Only the first
is claimed.**

### Two design-level findings

Both are values the approved baseline declares. Changing either alters the
approved appearance, so they are reported rather than quietly darkened.

**B-9 · Focus ring on a light background — 2.11:1, needs 3:1** (1.4.11).
C-01 names the focus ring as one of saffron's three permitted uses, so the
colour is part of the identity. Proposed: keep saffron and pair it with a dark
companion — an outline plus a 1px ink box-shadow reads as one indicator and
clears 3:1 on any background — or darken the ring on light surfaces only.

**B-10 · Control border on white — 1.60:1, needs 3:1** (1.4.11). A text input
is identified by its border. The approved `#C6CCE0` is 1.60:1. (The controls
were using the card hairline at 1.27:1 until this pass; that part is fixed.)
Proposed: darken the control border on light surfaces, or give controls a
filled surface distinct from the card. The card hairline itself is decorative —
it groups visible content rather than identifying a component — and is not in
scope.

**Neither is claimed as passing, and neither was changed unilaterally.**

---

## 5. Tests

**No test framework was added.** `node:test` and `node:assert` are built into
Node 22. The nine browser harnesses cover the journeys; these cover the logic
underneath them, chosen because the browser suites cover it *poorly* — not to
raise a count.

| File | Tests | What the browser suites miss |
|---|---|---|
| `tests/ledger.test.mjs` | 6 | The invariant as a **property** over 500 randomised sequences checked at every prefix, not four examples. Plus the two reset defects reproduced as tests |
| `tests/idempotency.test.mjs` | 5 | A key reused with **different inputs** — the dangerous case. The suites only assert the safe one |
| `tests/access-boundaries.test.mjs` | 9 | All 8 status/verification combinations both ways; the scope field against 23 hostile values; note containment over all 16 interleavings |
| `tests/deployment-guard.test.mjs` | 7 | The full 72-combination configuration space. The shell script proves the guard is *wired in*; this proves it is *right* |

`npm test` · 27 tests, 27 pass.

Each file states where it mirrors a rule rather than importing the module, and
what that trade-off costs.

---

## 6. Recommendation

### Ready for frontend acceptance, with one named partial

Every screen in the inventory is built and behaves against typed sample
services. The verification is repeatable, runs twice against one server with
identical results, and separates behaviour from known limitations throughout.

**This pass changed that answer once before arriving at it.** Wiring
photography into the comparison exposed two layout defects that every
automated check had been passing over, and re-examining the deployment guard
showed its central comparison had never actually run. Both are fixed and
verified; they are listed as closed in §1 rather than omitted, because the
reason they were missed matters more than the fixes: **a check that cannot
fail reports the same number as a check that passes.**

**The one open frontend item is A-9**: B-15's approved dialog does not appear
on browser Back. Edits are no longer lost — that defect is fixed — but the
interaction differs from the dialog shown for in-app navigation. **It needs a
decision, not more work**, and the three options are in §2.

### Not blockers, and should not be counted as frontend work

- **Nine backend capabilities** (category C). The frontend for each is
  complete: interface, sample implementation, built and verified states.
- **Sixteen client decisions** (category D), six of which block launch. Several
  screens are deliberately inert because of them.

### Genuinely outstanding, and named

| Item | Needs |
|---|---|
| Photographic fidelity in the comparison | `images.unsplash.com` allowed, or the licensed photography. Slot geometry **is** compared — see §3 |
| 96 of 113 rows not visually compared | Time, with the rig that now exists |
| 11 of the 17 compared at 1440 only | Time — the harness takes both widths already |
| Attribution band on cards with review imagery | A decision, not code: it affects the review path only (B-12) |
| Screen-reader, forced-colors, voice control | Tooling and a Windows host |
| Focus-ring and control-border contrast | A design decision (B-9, B-10) |
| Production/api deployment-guard scenarios | A reachable kkl-backend; reported pending, not passing |

### The boundaries this pass maintained

No live services, no public deployment, no payments, no authentication, no
calls, no messaging. The sample-mode guard still refuses to serve a production
deployment running sample services, and was not weakened.

**Phase 2 is not complete**, and completeness is not what this report claims.
It claims that the frontend scope is built and verified, that the remaining
work is correctly attributed, and that one frontend item is open and named.
