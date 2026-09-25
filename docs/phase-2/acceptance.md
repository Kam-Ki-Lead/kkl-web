# Phase 2 Frontend — Acceptance Report

What is finished, what is not, and — the part that matters most — **which kind
of "not finished" each remaining item is.** Lumping a missing backend into the
same list as a broken button produces a number nobody can act on.

Everything here is traceable to an approved source: the screen inventory and
prototypes in kkl-design @ `5bc3512`, the decision register in
`src/lib/config/business-rules.ts`, or kkl-backend's own docs. Where this
document once asserted a requirement with no source, that is marked and
withdrawn.

> **Update — later pass, implementation commit `b95e81e`.** This report
> describes an earlier acceptance pass and is kept as its record. Three
> statements in it are superseded and corrected here rather than rewritten:
>
> 1. **E-P4 is withdrawn.** The 17px/18px question was resolved by
>    screen-specific semantic styles (§3 of [`decision-sheet.md`](decision-sheet.md));
>    the tables below that list it as open are historical.
> 2. **Coverage is no longer "96 of 113 not compared."** All 113 inventory
>    rows are mapped and the differ's full working list has been classified —
>    see [`visual-differences.md`](visual-differences.md) §6.
> 3. **C-1 is no longer blocked.** `images.unsplash.com` is reachable from the
>    current review environment, and the E-P3 evidence renders both sides with
>    the real baseline photographs. The stand-in geometry studies remain
>    valid, labelled, for provenance.
>
> Two exceptions were also added after this report — **E-P5** (B-02 console
> placement) and **E-P6** (B-07 listing thumbnails) — in
> [`exceptions.md`](exceptions.md). Both were subsequently **reclassified by
> the owner as corrections to match the approved baseline** and are **closed**:
> B-02 is restored to the approved standalone light page and B-07 to the
> approved image-bearing cards, at the implementation commit named on the
> decision sheet. The current state of every item lives in
> [`decision-sheet.md`](decision-sheet.md).

---

## 1. The five categories

Four categories conflated two different things: "we cannot check this here"
was filed next to "somebody else owns this", and a missing photograph next to
a missing API. They are separated now.

| | Category | Count | Whose it is | What it blocks |
|---|---|---|---|---|
| **A** | Frontend implementation defects | **0 open** | This repository | Acceptance |
| **B** | Frontend verification pending on tooling or environment | **5 open** | This repository, when the tooling exists | Nothing today; each is named |
| **C** | Asset dependencies | **2 open** | Whoever supplies the assets | Photographic fidelity only |
| **D** | Backend / API dependencies | **9** | kkl-backend | Launch, not frontend acceptance |
| **E** | Client decisions and proposed deviations | **16 + 3** | The client, or the designer | Six block launch |

**Screen-reader, forced-colors and voice-control checks are in B, not D.** They
are frontend verification this repository owns and cannot run here. Filing them
under a backend heading would have implied somebody else was going to do them.

### A · Frontend implementation defects

Work this repository owns, where the implementation departs from the approved
design or behaves wrongly. **This category is now empty.**

| # | Item | State | Evidence |
|---|---|---|---|
| A-1 | B-15 unsaved-changes: mark, dialog, save/discard/keep, reload warning | Closed | `verify-builder-flow.mjs` 27–41 |
| A-2 | B-15 browser Back/Forward loses edits | Closed | `verify-b15-navigation.mjs` 1–8 |
| A-3 | Card overrides ignored by the base surface | Closed — every coloured panel rendered white | `verify-visual-baseline.mjs` |
| A-4 | Three colour tokens and nine literals absent from the baseline | Closed | `verify-design-tokens.mjs` |
| A-5 | Card headings at the screen-heading step (26px vs 17px) | Closed | §3 |
| A-6 | Admin rail at the Seller's density; 20 items did not fit | Closed | §3 |
| A-7 | Form controls using the card hairline, not the control border | Closed | §3 |
| A-8 | Reflow failures at 320 CSS px on two screens | Closed | `verify-zoom.mjs` |
| A-9 | P-03 gallery sized by ratio, not the approved fixed heights | Closed | §3 |
| A-10 | Public container 64px narrow on every page (border-box vs content-box) | Closed | §3 |
| A-11 | Deployment guard compared the server against itself, not the bundle | Closed | `verify-sample-mode-guard.sh` 10/10 |
| A-12 | **Admin rail rendered brand-deep, not ink** — the operations console looked like a seller's | Closed | §3, `verify-visual-baseline.mjs` |
| A-13 | **Buttons at 8px radius, weight 600, 15px** against the baseline's 6px / 700 / 16px | Closed | §3 |
| A-14 | **Console rail items at 16px** against the approved 15px | Closed | §3 |
| A-15 | **Rail wordmark at the 20px header size** against the consoles' 17px | Closed | §3 |
| A-16 | **Homepage section headings demoted to 17px** by an earlier pass's own fix; the baseline draws them at 26px | Closed | §3 |
| A-17 | **Console header title and subtitle truncated with an ellipsis at 390**, where the baseline fits the title and wraps the subtitle | Closed | §3 |

A-12 to A-15 are shared components, so each was one change across every screen
that uses it. All were found by the geometry differ and verified against the
approved source before anything was touched.

**A-16 is a regression this project introduced and then found.** An earlier
pass read C-02's "Card and section title — Archivo 700 · 17px" and moved every
section heading to that step. The rendered baseline draws P-01's section
headings at **26px/700**, so the fix flattened the homepage's hierarchy while
reporting itself as a correction. Restored for the public sections; see E-P4
for the part that is not mine to decide.

**A-17 was found by looking at a screenshot**, not by the differ — truncation
does not change any computed property the tool reads. It is the clearest
argument in this report for why the pairs exist.

**The B-15 dialog on browser Back is not in this category.** It is a proposed
deviation from the approved interaction, E-P1, and it needs a decision rather
than a fix. §2 states exactly what happens and what the alternative costs.

### B · Frontend verification pending on tooling or environment

This repository's work to check, blocked on something this environment does not
have. **None of these is somebody else's job.**

| # | Check | Why it is pending | What would unblock it |
|---|---|---|---|
| B-1 | Screen-reader behaviour (NVDA, JAWS, VoiceOver) | No assistive technology available in a headless Linux container | A machine with a screen reader, and an hour per journey |
| B-2 | Forced-colors / Windows High Contrast | Needs Windows; Chromium's emulation is not the same thing | A Windows host |
| B-3 | Voice control (Dragon, Voice Access) | Same — no platform here | A Windows or macOS host |
| B-4 | Firefox's own text-only zoom | `verify-zoom.mjs` simulates it by scaling the root font size, which is the closest Chromium gets | Firefox in the harness |
| B-5 | Real-device rendering (iOS Safari, Android Chrome) | Emulated viewports only | Devices or a device cloud |

Everything else in verification is done and listed in §5 with its evidence path.

### C · Asset dependencies

Not code, and not a backend. Somebody has to supply a file.

| # | Asset | State | Consequence today |
|---|---|---|---|
| C-1 | **The baseline's seven review photographs** | Blocked — this environment's policy denies `images.unsplash.com` (proxy rejects CONNECT) | Slot geometry is compared with generated stand-ins; photographic fidelity is not compared |
| C-2 | **Licensed project photography** | Not supplied. The baseline states every image must be replaced before launch | Every media slot ships its designed no-image fallback |

C-1 unblocks by allowing the host; C-2 unblocks by delivering the photography,
which has to happen anyway.

### D · Backend / API dependencies — *not unfinished frontend work*

These are listed so nobody counts them against the frontend. Every one is a
capability kkl-backend owns and has not published. **The frontend work for each
is complete**: a typed interface exists, a sample implementation behaves, and
the screen states are built and verified.

| # | Capability | Frontend state |
|---|---|---|
| D-1 | Authentication and sessions (Buyer OTP, Seller/Builder, staff) | Screens and states built; no session exists |
| D-2 | Authorization and staff roles | Not modelled — nothing here is separated by permission |
| D-3 | KYC document storage, scanning, retention | Upload fields built; no byte is stored |
| D-4 | Media storage for listings | Editor records a count; no byte is stored |
| D-5 | Payment capture and reconciliation | Three designed outcomes built; no gateway |
| D-6 | Lead intake pipeline | A-10, A-11 built over fixtures |
| D-7 | Voice qualification (kkl-voice) | A-24, A-25 built over fixtures |
| D-8 | WhatsApp journey | A-26 built over fixtures |
| D-9 | Notification delivery and suppression enforcement | A-27, A-28 built over fixtures |

**None of these is a frontend defect, and none blocks frontend acceptance.**
The contract each needs is in `docs/phase-2/service-contract.md`.

### E · Client decisions, and deviations proposed for approval

#### E-D · The sixteen open decisions

Unchanged since Phase 1 and listed in full in `docs/phase-2/decisions.md`. Six
**block launch**. They are not frontend work either — but unlike category D
they have a visible consequence, because several screens are deliberately inert
rather than unfinished:

- **D-01** no subscription amount appears on A-21 or B-03.
- **D-03** A-14's price fields are disabled placeholders.
- **D-06** A-20 records a refund decision and writes no ledger entry.
- **D-10** A-08 and A-09 have no approve action.
- **D-02** nothing hides a live listing when a subscription lapses.
- **D-05** both contact-access alternatives are built; a switch chooses.

A reviewer seeing an inert control on one of those screens is seeing the
decision, not a bug.

#### E-P · Deviations proposed for approval

Three places where the implementation departs from the approved design on
purpose, each needing somebody to say yes or no. **None is a defect and none
is fixed by more frontend work.**

| # | Deviation | Proposed because | If rejected |
|---|---|---|---|
| **E-P1** | **B-15's three-way dialog does not appear on browser Back.** Edits are retained and restored; the dialog is not shown | Back is not cancellable, and every way of faking it misbehaves — see §2 | The only remaining option is Next 16 Cache Components, which is an architectural change with four named costs (§2) |
| **E-P2** | The focus ring and control border stay at the baseline's own values, which fail WCAG 2.2 AA 1.4.11 | Changing either alters the approved appearance, and the correction is a design decision | §4 gives the exact smallest correction for each; both are one-line token changes once approved |
| **E-P3** | Review imagery draws an attribution band on every card; the approved homepage draws one on project cards but not property cards | Dropping attribution from a third party's photograph is not a layout decision | Remove the band on property cards once licensed photography replaces the stand-ins |
| **E-P4** | **Card titles stay at 17px.** C-02 declares "Card and section title — Archivo 700 · 17px"; the four console documents draw their panel headings and card titles at **18px**, and nothing in them renders at 17px | The approved package contradicts itself, and 152 call sites is not a change to make on a reading | Set the card-title step to 18px, one line in `globals.css`, once the designer says which is right |

**E-P1, E-P2 and E-P3 stay open until they are explicitly accepted.** They are
listed here rather than in category A because no amount of frontend work
closes them — somebody has to choose.

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

## 2. B-15 — exactly what happens on Back, then Forward

Reproduced and asserted by `scripts/verify-b15-navigation.mjs`, **9/9**, each
term of the question checked separately rather than summarised.

```bash
PLAYWRIGHT=… BASE_URL=http://127.0.0.1:3811 node scripts/verify-b15-navigation.mjs
```

### The four answers

| Question | Answer | How it is known |
|---|---|---|
| Are edits **retained**? | **Yes.** Forward puts the edited value back in the field | Check 4 — `#title` reads the edited text after Back then Forward |
| Are they **saved**? | **No.** Nothing is written to the listing | Checks 3 and 6 — the properties list still shows the server value, and a **second browser context** with its own storage reads the server value too |
| Are they **lost**? | **No.** Nothing is discarded by Back | Checks 3, 4 — and Discard remains an explicit action, check 7 |
| What does the user **see**? | The editor says **"Unsaved work restored."** and keeps the **"Unsaved changes"** mark | Check 5 — both asserted present, so restored work is never mistaken for saved work |

Check 6 is the one that matters most. A draft that quietly became a save would
be a worse defect than a lost edit, because the Builder's listing would change
without them asking. It opens an independent context — a different tab, its own
`sessionStorage` — and asserts the server still renders the original title.

### And it depends on how the editor was reached

This was not previously recorded, and it changes the answer.

| Arrival | Back does | Check |
|---|---|---|
| **Clicked** from the properties list (client-side history entry) | Leaves the editor silently. Forward restores the draft with its notice | 2 |
| **Loaded directly** — typed URL, reload, a link from outside (document history entry) | Raises **the browser's own leave warning** first. Dismissing it cancels the navigation and keeps the Builder in the editor | 2b |

So a Builder who typed the URL *is* warned before leaving, by the browser. A
Builder who clicked through is not warned, and loses nothing.

### The remaining difference, stated exactly

**The approved three-way dialog — Save and close / Discard / Keep editing —
does not appear on browser Back.** That is the whole of it. It appears on every
in-app navigation (check 7), and the edit survives Back either way.

This is **E-P1** in category E: a deviation proposed for approval, not a defect
to fix. It stays open until somebody accepts it.

### Each interaction, checked separately

| Interaction | Behaviour | Check |
|---|---|---|
| Save draft | Saves, clears the mark, settles the label | builder 35, 44 |
| Save draft and close | Saves **and** lands where the Builder was going | builder 33 |
| Discard changes | Leaves without saving; not undone by the restore | builder 32, 45; b15 7 |
| Keep editing | Stays, preserves the typing, mark still up | builder 31 |
| Section navigation | Intercepted — dialog, not silent loss | builder 37, 38 |
| Console navigation (rail) | Intercepted | builder 36 |
| **Browser Back**, clicked arrival | Leaves silently; edit retained, not saved | b15 2, 3 |
| **Browser Back**, loaded arrival | Browser's own leave warning | b15 2b |
| **Browser Forward** | Returns to the work, with a notice | b15 4, 5 |
| Reload / tab close | Browser warning armed while dirty, disarmed after save | builder 40, 41; b15 8 |
| Without JavaScript | No mark, no dialog, no warning — stated on screen | no-js L3 |

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

### What was built instead

The editor does not try to stop Back. It removes the reason to: the section's
unsaved values are held **per tab** as they are typed and put back when the
section is opened again, with a notice saying so.

`sessionStorage`, not `localStorage` — a draft outliving the tab would be a
surprise, one shared between tabs would fight itself. Every access is wrapped,
because private windows, blocked site data and quota all make these calls
throw, and a failure there must cost nothing but the restoration. It is **not
storage of record**: nothing reads it but this form, and a save clears it
(check 8).

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
  CAPTURE_SUFFIX=-photos ONLY=P-01,P-02,P-03 \
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

### Screens compared — all of them

**Every one of the 113 inventory rows is mapped in
[`coverage.md`](coverage.md)**, which is generated by
`scripts/build-coverage-matrix.mjs` from the screen map and the approved
inventory, so it cannot drift from what the rig captures:

| Kind | Rows | Evidence |
|---|---|---|
| Screens captured as pairs | **97** | `visual/<ID>-<width>-baseline.png` / `-implementation.png`, at **1440 and 390** |
| Nested states | **4** | P-21, S-10, B-14, A-07 — each named against the parent screen that carries its layout and the suite that carries its behaviour |
| Library rows | **12** | C-01..C-12 — component evidence, judged in the screen contexts named |

Six of those screens do not exist until they are earned — an enquiry
confirmation, a purchase result, a purchased lead, a payment outcome, a
subscription payment, a dirty editor — and the rig performs the steps rather
than opening the URL, because opening it directly is refused and should be.

### Capturing is not comparing

195 screenshots prove 195 screenshots were taken. `scripts/verify-screen-geometry.mjs`
matches elements across the two unrelated DOMs **by their rendered text**,
compares computed font size, weight, colour and family plus control and button
geometry, and ranks every screen by divergence. A person then looks at what it
puts at the top.

Its own first run is worth recording: it reported 92 of 93 screens diverging,
which was the tool scraping **the prototype's own reviewer chrome** — the
screen picker and width tabs — rather than the screen. Scoped to the emulated
frame, and with text-transform differences that cannot change rendered text
excluded, it reports what is actually there.

**A zero score is not a pass.** It means the measured properties of matched
text and controls agree. Spacing, alignment, shadow and imagery are outside it.

### Differences found, and fixed

Twelve, none of which any token or computed-style check could have seen:

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

7. **The Admin rail was brand-deep, not ink.** A-02 declares
   `background:#12182B` with muted text `#9AA3BE` and a 256px width, against
   the other consoles' `#0F2478`, `#B9C3EC`/`#8A9AD8` and 264px. The operations
   console was rendering as a seller's. `approved-baseline.md` had said so in
   its own colour table all along — "Ink #12182B — headings, **admin rail**,
   primary text" — and `verify-visual-baseline.mjs` was asserting the
   implementation's value, so it passed while the defect was live.
8. **Buttons were `rounded-[8px] font-semibold` at 15px.** The baseline
   declares 6px radius (64 occurrences across the four console documents
   against 4 at 8px), weight 700, and 16px with 14px/22px padding. Every button
   in the application.
9. **Console rail items were 16px**; the approved Seller and Builder rails
   declare 15px. The Admin rail's 14px was already right.
10. **The rail wordmark was the 20px public-header treatment**; the consoles
    declare a 28px tile at 5px radius with 17px text. Added as a third size
    rather than shrinking the header's.

11. **Homepage section headings had been demoted to 17px** by this project's
    own earlier fix. C-02 declares "Card and section title — Archivo 700 ·
    17px" and that fix applied it to every section heading; the rendered P-01
    draws "Featured properties", "Featured projects" and "Browse by locality"
    at **26px/700**. Restored.
12. **The console header truncated its title and subtitle with an ellipsis at
    390** — "Operations dash…" — where the approved A-02 fits the title and
    wraps the subtitle onto two lines.

Findings 7 to 10 are shared components, so each was one change across every
screen that uses it.

### What the differ says now, and what it does not

Adding `div` changed the measurement basis, so the before-and-after figures
from the earlier run are not comparable to these. The current state, on the
committed captures:

| | 1440 | 390 |
|---|---|---|
| Screens compared | 93 | 93 |
| Elements matched by text | 2,314 | 1,115 |
| Matched elements that differ | **655 (28.3%)** | **612 (54.9%)** |
| Structural differences | 163 | 223 |
| Divergence score — min / median / max | 5 / 23 / 84 | 5 / 24 / 92 |

**That is not a finished number and this report does not present it as one.**
The systematic offenders are fixed; what remains is per-screen and includes a
large share of the 17px-against-18px question (E-P4), which cannot be resolved
here. `weight 700->600` still appears 93 times at 1440, and
`#2A3250 -> #12182B` 83 times — both worth a pass once E-P4 is decided, since
the same elements are implicated.

Anyone reading this should treat the ranked JSON as the working list, not as a
clean bill.

**Finding 11 came from a blind spot in the differ itself.** Its element list
did not include `div`, and the approved prototypes render every heading as a
styled `div` — there is not one `h1` or `h2` inside the console frames. So a
tool built to catch a heading at the wrong step could not see a single
prototype heading. With `div` added it found 11 immediately, along with the
18px-against-17px question now recorded as **E-P4**.

**Finding 12 came from looking at a screenshot.** Truncation changes no
computed property the differ reads, so no amount of measuring would have found
it. That is what the pairs are for.

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

### Two contrast failures, with the exact corrections proposed

**E-P2 in category E.** Both values are the approved baseline's own. That
explains how they got here; **it does not close them.** A contrast failure
inherited from a design is still a contrast failure. What follows is what each
one is, where it applies, and the smallest change that fixes it — for review,
not applied.

Measured by `scripts/verify-contrast.mjs`, which now prints the component list
and the proposed correction with the numbers, so this table is not a
transcription.

#### E-P2a · Focus indicator on light surfaces

| | |
|---|---|
| **Criterion** | WCAG 2.2 AA · 1.4.11 Non-text Contrast (needs 3:1) |
| **Colour pair** | `#F2A20C` saffron on `#FFFFFF` white — **2.11:1** |
| | `#F2A20C` on `#F4F6FB` page surface — **1.95:1** |
| **Where declared** | `src/app/globals.css`, `:focus-visible { outline: 3px solid var(--color-saffron); outline-offset: 2px }` |
| **Components affected** | **Every focusable element in the application** — buttons, links, inputs, selects, textareas, chips, table-row controls — wherever it sits on a white card, a dialog, a table row, or the page surface |
| **Not affected** | The dark rails. Saffron on `#0F2478` is 6.44:1 and on `#1B3BB3` is 4.28:1, both pass |

**Smallest correction, keeping saffron exactly:** keep the 3px saffron outline
and add a **1px ink `#12182B` box-shadow immediately inside it**. The indicator
then presents a **17.63:1** edge against white and **16.30:1** against the page
surface, and saffron reads **8.35:1** against its own companion, so the ring
still reads as saffron. No declared token changes.

**Alternative, if a single colour is required:** darken to **`#C1810A`** —
**3.03:1** on the page surface, **3.28:1** on white, same hue. This changes a
declared brand token, which is why it is second.

#### E-P2b · Control border on light surfaces

| | |
|---|---|
| **Criterion** | WCAG 2.2 AA · 1.4.11 Non-text Contrast (needs 3:1) |
| **Colour pair** | `#C6CCE0` on `#FFFFFF` white — **1.60:1** |
| | `#C6CCE0` on `#F4F6FB` page surface — **1.48:1** |
| **Where declared** | `--color-control-border` in `globals.css`; applied in `src/components/ui/field.tsx` at three call sites |
| **Components affected** | **Every text field, number field, textarea and select** in all four journeys — the border is what identifies the control |
| **Not affected** | The card hairline `#E1E4EE`. It groups visible content rather than identifying a component, and is out of scope for 1.4.11 |
| **Not affected** | The invalid state. `border-danger` is measured in the passing table above |

**Smallest correction:** darken the token to **`#8A8E9C`** — **3.27:1** on
white, **3.02:1** on the page surface, same hue family, one line. A filled
control surface would also work and changes the approved appearance
considerably more.

**Context worth keeping.** These controls were using the card hairline at
**1.27:1** until an earlier pass. Moving them to `#C6CCE0` improved the number
without reaching the threshold, and reporting that as fixed would have been
wrong.

**Neither is claimed as passing, and neither was changed unilaterally.** Both
await a decision on E-P2.

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

## 6. Status — acceptance is not requested yet

### Where this stands

Every one of the **113 inventory rows** is now mapped to evidence, and the
mapping is in `coverage.md`, generated from the screen map rather than written
by hand: **97 screens captured as side-by-side pairs at 1440 and 390**, 4
nested states named against the parent that carries them, and the 12 library
rows against the screens they are judged in.

**Category A is empty.** Every frontend implementation defect found across this
and the previous pass is closed, including four shared-component deviations
this pass found and fixed.

**Acceptance is still not requested**, because three exceptions are open and
none of them is mine to close:

| | Exception | Owner | What is needed |
|---|---|---|---|
| **E-P1** | B-15's approved dialog does not appear on browser Back. Edits are retained and restored; §2 states all four answers with evidence | The client, or the designer | Accept the alternative behaviour, or fund the Cache Components route with its four named costs |
| **E-P2** | Two WCAG 2.2 AA 1.4.11 failures at the baseline's own values — focus indicator 2.11:1, control border 1.60:1 | The designer | Approve one of the two corrections in §4. Both are one line |
| **E-P4** | Card titles at 17px (C-02) against 18px (the four consoles) — the approved package disagrees with itself | The designer | One line, once resolved |
| **E-P3** | Review imagery attributes every card; the approved homepage attributes only project cards | The designer | Confirm, or drop the band on property cards |

And two dependencies that are nobody's frontend work:

| | Dependency | Owner |
|---|---|---|
| **C-1, C-2** | The baseline's photographs (host denied here) and the licensed project photography the baseline says must replace them | Whoever supplies the assets |
| **D-1 … D-9** | Nine backend capabilities. The frontend for each is complete — interface, sample implementation, built and verified states | kkl-backend |
| **E-D** | Sixteen client decisions, six of which block launch | The client |

### Still pending verification, and named

Five checks this repository owns and cannot run here — screen readers,
forced-colors, voice control, Firefox text-only zoom, real devices — listed
with what would unblock each in §1 category B. **None is delegated to anyone
else.**

### What would make this ready to request

1. **E-P1, E-P2, E-P3 accepted or redirected** by their owners.
2. The five category-B checks run on hardware that has the tooling.

Nothing else on this list is a frontend deliverable, and nothing on it is
waiting on more frontend work.

### On counting

This report does not offer an aggregate pass count as coverage, and
`coverage.md` does not either. A suite that runs 224 route renders proves 224
routes render; it proves nothing about whether they match the design, which is
why the geometry differ reports per-screen divergence and why the pairs exist
for a person to look at. Two of the defects fixed in this pass had a passing
check sitting on top of them — `verify-visual-baseline.mjs` asserted the Admin
rail was brand-deep, and the deployment-guard suite reported 8/8 from a test
that could not fail.

### The boundaries this pass maintained

No live services, no public deployment, no payments, no authentication, no
calls, no messaging. kkl-design is unmodified at `5bc3512`, verified by the
setup script on every run. The sample-mode guard still refuses to serve a
production deployment running sample services, and was not weakened — see §5
and `verification.md`.
