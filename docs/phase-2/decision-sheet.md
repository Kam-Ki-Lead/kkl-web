# Phase 2 frontend — acceptance decision sheet

**Implementation commit:** `011bade` on `claude/phase-2-frontend` (kkl-web)
**Approved design:** kkl-design `5bc3512`, unmodified — verified on every run
of `scripts/setup-prototype-review.sh`

One page. Everything on it is either done, or waiting on a named person.

---

## 1 · Remaining confirmed frontend defects

**None.**

Not "none found" — none remaining that this pass could confirm against the
approved source. §5 lists what is measured but unclassified, and that is not
the same as clean.

Fourteen defects were closed over the acceptance passes. The five closed in
this one:

| # | Defect | Screens | Evidence |
|---|---|---|---|
| D-1 | Console header title 26px/800 against the approved 22px/700 | All console screens | `verify-typography.mjs` 4–6 |
| D-2 | Panel headings 17px against 18px/700 | S-06, B-06, A-02 | `verify-typography.mjs` 7–9 |
| D-3 | Listing card titles 17px against 18px/700 | P-01 | `verify-typography.mjs` 10 |
| D-4 | Field labels in ink `#12182B` against body `#2A3250` | 30 screens with forms | `visual/geometry-1440.json` |
| D-5 | Rail footer label `#8A9AD8` against `#B9C3EC` — regressed by the previous pass | 16 console screens | `visual/geometry-1440.json` |

Plus two accessibility defects found by checks that had never been written:

| # | Defect | Found by |
|---|---|---|
| D-8 | Status chips lose every boundary in forced-colors mode — the fill carries the meaning and forced-colors discards it | `verify-forced-colors.mjs` |
| D-9 | WCAG 2.5.3: the shortlist control reads "Shortlist (0)" and announced "Shortlist, 0 saved" | `verify-accessible-names.mjs` |

---

## 2 · Visual differences resolved

Full classification in **[`visual-differences.md`](visual-differences.md)**.
Summary of the five groups:

| Group | Count | Disposition |
|---|---|---|
| Implementation defects | 7 | **Fixed** — table above, plus D-6 mobile header truncation and D-7 demoted section headings from the previous pass |
| Intentional sample-content differences | 6 kinds | **Not defects.** Counts, money, dates, references, relative time, the sample-data banner. Reconciling them would mean inventing data |
| Measurement and matching artefacts | 6 | **Fixed in the tooling.** Header-versus-footer matches, rail-versus-header matches, stage-versus-viewport width, pill radius notation, neutral text-transform, prototype reviewer chrome |
| Conflicts inside the approved baseline | 1 | **Resolved by screen precedence** — E-P4 withdrawn, see §3 |
| Proposed deviations | 3 | **Open** — §4 |

### The conflict, resolved

C-02 declares one step. The screens render five:

| Context | Baseline | Class |
|---|---|---|
| Page title | 34px / 800 | `.t-title` |
| Public section heading | 26px / 700 | `.t-section-title` |
| Console header title | 22px / 700 | `.t-console-title` |
| Console panel heading, listing-card title | 18px / 700 | `.t-panel-title` |
| Card title (compact, stat) | 17px / 700 | `.t-card-title` |

**Precedence, now written into `globals.css`: where an approved screen renders
a size, that size wins over the library's generic label.** Migrated at named
call sites, not across 152; `verify-typography.mjs` checks a representative use
of each context, 11/11.

**E-P4 is withdrawn.** It was raised as a contradiction needing a ruling; the
screens answer it.

---

## 3 · Accessibility corrections applied to the approved baseline

Both **applied and verified as rendered**. Both **reversible in one line**.
Sign-off open.

| | Approved | Corrected to | Result |
|---|---|---|---|
| Focus indicator | `#F2A20C`, 2.11:1 on white | Saffron ring unchanged + 1px ink `#12182B` companion inside it | 17.63:1 white, 16.30:1 page surface; saffron reads 8.35:1 against the companion |
| Control border | `#C6CCE0`, 1.60:1 on white | `#8A8E9C` | 3.27:1 white, 3.02:1 page surface |
| Chips in forced-colors | tinted fill, no border | `currentColor` border inside `@media (forced-colors: active)` | Boundary survives; normal appearance untouched |

Verified resting, invalid, disabled and focused, on real surfaces; focusing
shifts, resizes and reflows nothing; no control sits within 6px of an
overflow-hidden edge. `verify-contrast-corrections.mjs` 12/12.

Not changed: the card hairline `#E1E4EE` (groups content, not a component —
out of scope for 1.4.11); the invalid state; disabled controls (1.4.11 reads
"except for inactive components").

---

## 4 · Exceptions awaiting approval

Full statements in **[`exceptions.md`](exceptions.md)**.

| # | Exception | Decision needed | Owner | Status |
|---|---|---|---|---|
| **E-P1** | Browser **Back may leave the listing editor without the custom dialog**. **Forward restores unsaved edits**, with an "Unsaved work restored." notice and the unsaved mark still showing. **Edits are never silently saved** — a second tab reads the listing as it stands on the server | Accept this behaviour, or fund the Next 16 Cache Components route and its four named costs | Client, or the designer who specified B-15 | **Open** |
| **E-P2a** | Focus indicator gains a dark companion edge | Keep it, or name another remedy | Designer | **Open** (applied) |
| **E-P2b** | Control border darkened to `#8A8E9C` | Keep it, or name another remedy | Designer | **Open** (applied) |
| **E-P3** | Review imagery attributes **every** card; the approved P-01 attributes the project cards and not the property cards. Proposed: keep the band now, remove it from property cards when licensed photography replaces the stand-ins | Confirm, or drop the band from property cards now | Designer | **Open** |

**No exception is marked accepted.** Acceptance is a person saying yes.

E-P1 has **not** been worked around with a history trap, and will not be.

---

## 5 · Measured but unclassified

Divergence is not zero and is not claimed to be. After this pass the residue
is dominated by:

- `weight 700->600` and `weight 600->700` on labels and inline emphasis — in
  **both** directions, so no single shared cause
- `family Archivo->Public Sans` on S-07's filter tabs and S-17's ledger
  amounts; `Public Sans->IBM Plex Mono` on reference identifiers, which is a
  choice this project made and never recorded
- 1px differences on secondary text, scattered

**None confirmed as a defect; none claimed clean.** Ranked in
`visual/geometry-{1440,390}.json`. This is the working list for whoever picks
it up.

---

## 6 · Pending verification

Full detail, per check, in **[`pending-verification.md`](pending-verification.md)**.

| Check | Status | Needs | Who |
|---|---|---|---|
| Forced-colors (CSS level) | ✅ **Closed this pass** | — | — |
| Accessible names, roles, landmarks, 2.5.3 | ✅ **Closed this pass** | — | — |
| Screen-reader **behaviour** | Open | NVDA (free) on Windows, or VoiceOver on macOS | Accessibility tester — half a day |
| Windows High Contrast **themes** | Open | A Windows machine | Anyone — an hour |
| Voice control | Open | Windows Voice Access or macOS Voice Control — both built in | Anyone — an hour |
| Firefox text-only zoom | Open | `npx playwright install firefox` on any dev machine | Any developer — **twenty minutes** |
| Real devices | Open | Two handsets, or a device cloud | QA — two hours |

**Two of the original five were never blocked** — they needed a script, not a
platform, and writing them found two real defects. Of what remains, three need
only a Windows or macOS machine somebody already owns.

---

## 7 · Asset dependencies

| # | Asset | Consequence today | Owner |
|---|---|---|---|
| **C-1** | The baseline's seven review photographs | `images.unsplash.com` is denied by this environment's network policy. Slot **geometry** is compared with generated stand-ins that say "STAND-IN · not the baseline photograph" on their face. **Photographic fidelity is not compared** | Whoever can allow the host |
| **C-2** | Licensed project photography | The baseline states every image must be replaced before launch. Every media slot ships its designed no-image fallback | The client |

---

## 8 · Backend dependencies — listed separately, not frontend work

Nine capabilities kkl-backend owns and has not published. **The frontend for
each is complete**: typed interface, sample implementation, built and verified
states. Contracts in `service-contract.md` — **proposed, not agreed**.

| # | Capability |
|---|---|
| D-1 | Authentication and sessions (Buyer OTP, Seller/Builder, staff) |
| D-2 | Authorization and staff roles |
| D-3 | KYC document storage, scanning, retention |
| D-4 | Media storage for listings |
| D-5 | Payment capture and reconciliation |
| D-6 | Lead intake pipeline |
| D-7 | Voice qualification (kkl-voice) |
| D-8 | WhatsApp journey |
| D-9 | Notification delivery and suppression enforcement |

Plus **sixteen open client decisions**, six of which block launch, in
`decisions.md`. Several screens are deliberately inert because of them — a
reviewer seeing an inert control on A-14, A-20 or A-21 is seeing the decision,
not a bug.

---

## 9 · Verification run at this commit

| | Result |
|---|---|
| typecheck, lint | 0 errors, 0 warnings |
| unit tests | 27/27 |
| design tokens | 29/29 tokens, 38/38 literals |
| contrast (declared pairs) | 24/24 AA |
| contrast corrections (rendered) | 12/12 |
| visual values | 24/24 |
| typography precedence | 11/11 |
| zoom (reflow 320px, text 200%) | 32/32 across 16 screens |
| accessibility | 22/22 |
| accessible names / 2.5.3 | 24/24 across 6 screens |
| forced-colors | 13/13 across 6 screens |
| route sweep | 224/224 (112 routes × 2 widths) |
| without JavaScript | 50/50 forms |
| enquiry · Seller · Builder · Admin | 17/17 · 26/26 · 48/48 · 36/36 |
| B-15 navigation | 9/9 |
| deployment guard | 10/10 with reasons asserted, 2 pending a backend |
| coverage | 113/113 inventory rows mapped, 0 uncovered |

**A count is not coverage.** Three defects in these passes had a passing check
sitting on top of them: `verify-visual-baseline.mjs` asserted the Admin rail
was brand-deep, the deployment-guard suite reported 8/8 from a test that could
not fail, and forced-colors was filed as blocked rather than written.

---

## 10 · The decision

**Frontend acceptance is not requested.** Category A is empty and the
verification above is green, but four exceptions are open and none is mine to
close.

Acceptance becomes appropriate when:

1. **E-P1** is accepted or redirected by the client or designer;
2. **E-P2a and E-P2b** are signed off by the designer, or another remedy named;
3. **E-P3** is confirmed;
4. the four remaining verification checks are run by the people named in §6.

Nothing on that list is waiting on more frontend work.

**Boundaries maintained:** no live services, no public deployment, no payments,
no authentication, no calls, no messaging. kkl-design unmodified at `5bc3512`.
The sample-mode guard still refuses to serve a production deployment running
sample services, and was not weakened.
