# Phase 2 frontend — acceptance decision sheet

**Implementation commit:** `b9e7e53` on `claude/phase-2-frontend` (kkl-web)
**Approved design:** kkl-design `5bc3512`, unmodified — verified on every run
of `scripts/setup-prototype-review.sh`

One page. Everything on it is either done, or waiting on a named person.
For the review itself, [`owner-review.md`](owner-review.md) is the concise
entry point — this sheet is the full record behind it.

> Commit hygiene: `707d77b` on this branch was a **harness-only** change
> (verification scripts and evidence tooling — no application code). The
> application change for this pass is `b9e7e53`: the E-P5/E-P6 baseline
> corrections and the shared console-title step. Documentation, harness and
> evidence follow in their own commit.

---

## 1 · Remaining confirmed frontend defects

**None.**

Not "none found" — none remaining that this pass could confirm against the
approved source. §5 lists what is still measured and how each row is
classified, and that is not the same as clean.

Defects were closed over three acceptance passes. The earlier passes closed
D-1 to D-9: the typography ladder, the field-label colour, the rail footer
token, mobile header truncation, the section headings an earlier fix had
demoted, and two accessibility defects found by checks written that pass
(forced-colors chip boundaries; the 2.5.3 shortlist name).

**This pass closed the differ's entire remaining working list** — every row
taken back to the rendered baseline and either fixed or classified. The
defects, grouped (full table in
[`visual-differences.md`](visual-differences.md) §1, D-8 to D-17):

| # | Defect | Screens |
|---|---|---|
| D-8 | Flow-page titles at 34px against the approved **30px/800** — the differ had paired the wrong element; found by direct measurement | 16 flow pages, three consoles |
| D-9 | Admin rail "Leads" rendered **inactive on its own detail pages** | A-13, all `/admin/leads/*` |
| D-10 | Chips at 600 weight against **700**; admin table chips 13px against **12px**; danger foreground `#B3261E` against **`#7A2119`** | Every chip, all journeys |
| D-11 | Reference identifiers in mono where the approved screens use **Public Sans**, at wrong sizes | A-05, A-13, A-16, A-21, A-23, A-27, A-28 |
| D-12 | Listing rows and enquiry filters not the approved card: pill filters, Archivo titles, the approved four-action set | B-07, B-16 |
| D-13 | Buttons drawn at two sizes where the baseline draws **four** — form submissions 17px, console actions 15px | Every form and console action |
| D-14 | Toast in brand-deep against the approved **ink with saffron chip** | B-18 |
| D-15 | Preview card measures (price 23px/800, possession `#8A4A08`, amenity tiles) | B-13 |
| D-16 | P-11's filled action inverted; P-13's waiting chip in the wrong tone; P-04/P-05 submit size and OTP note | P-04, P-05, P-11, P-13 |
| D-17 | Per-screen size/weight/tone corrections, each measured against the approved screen | 30 screens across the consoles |

**And the latest pass closed the two owner-reclassified corrections plus one
shared step** (full table in `visual-differences.md` §1, D-18 to D-20):

| # | Correction | Screens |
|---|---|---|
| D-18 | **E-P5.** B-02 restored to the approved standalone light page — the pre-console chrome it shares with B-01, the approved four document cards, and the approved single-submit-line validation | B-02, B-01 |
| D-19 | **E-P6.** B-07 restored to the approved image-bearing listing cards, with the approved "No photos yet" missing-photo state | B-07 (B-13's empty-media preview fixed with it) |
| D-20 | Console header title corrected to the approved responsive steps (19px / 21px / 22px) after a geometry-harness fix revealed the approved 390 frame renders 19px, not the 22px earlier runs had measured | Every console screen |

One check was wrong, not the app: `verify-visual-baseline.mjs` expected a 21px
stat tile on S-06 where the rendered baseline draws **26px/800** — the row now
encodes the measured value. A second harness fault surfaced in the latest
pass: the geometry differ's 390px runs had never actually switched the
prototype to its 390 frame (a whitespace-sensitive selector, silently
swallowed); fixed, every 390 classification re-derived, and the evidence
impact closed out — the affected revisions are marked superseded
(`visual/README.md`), the harness now fails explicitly on a wrong-width frame
(`scripts/proto-width.mjs`, negative-tested), and the rows the corrected sweep
surfaced are classified in `visual-differences.md` §6.

---

## 2 · Visual differences resolved

Full classification in **[`visual-differences.md`](visual-differences.md)**.
Summary of the five groups:

| Group | Count | Disposition |
|---|---|---|
| Implementation defects | 20 | **Fixed** — §1, across the passes |
| Intentional sample-content differences | 6 kinds | **Not defects.** Counts, money, dates, references, relative time, the sample-data banner. Reconciling them would mean inventing data |
| Measurement and matching artefacts | 7 + the structural residue | **Fixed in the tooling, or classified row-by-row** — §5 |
| Conflicts inside the approved baseline | 1 + 3 recorded wobbles | **Resolved by screen precedence** — E-P4 withdrawn, see §3. The 23px/24px price step, P-02's 13px labels and A-19's two-tone notes are recorded baseline inconsistencies, kept as measured |
| Proposed deviations | 4 | **Open** — §4 |

### The conflict, resolved

C-02 declares one step. The screens render five:

| Context | Baseline | Class |
|---|---|---|
| Public page title | 34px / 800 | `.t-title` |
| Flow-page title (register, KYC, payment, confirm) | 30px / 800 | `.t-flow-title` |
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
| **E-P1** | Browser **Back may leave the listing editor without the custom dialog**. **Forward restores unsaved edits**, with an "Unsaved work restored." notice and the unsaved mark still showing. **Edits are never silently saved** — a second tab reads the listing as it stands on the server. **Evidence:** [video](evidence/e-p1/e-p1-back-forward-b95e81e.webm) · [labelled frame strip](evidence/e-p1/e-p1-frame-strip-b95e81e.png) · [raw frames](evidence/e-p1/raw/) | Accept this behaviour, or fund the Next 16 Cache Components route and its four named costs | Client, or the designer who specified B-15 | **Open** |
| **E-P2a** | Focus indicator gains a dark companion edge. **Evidence:** [comparison sheet](evidence/e-p2/e-p2-prototype-vs-corrected-b9e7e53.png) — **approved prototype versus accessibility-corrected implementation** (the left side is the approved prototype, not an earlier revision of this application) | Keep it, or name another remedy | Designer | **Open** (applied) |
| **E-P2b** | Control border darkened to `#8A8E9C`. **Evidence:** same sheet | Keep it, or name another remedy | Designer | **Open** (applied) |
| **E-P3** | Review imagery attributes **every** card; the approved P-01 attributes the project cards and not the property cards. The band is a **voluntary, conservative choice** — the Unsplash licence does not require credit; the design's own image loader does, and the approved homepage contradicts it. Proposed: keep the band now, remove it from property cards when licensed photography lands. Since the E-P6 correction, B-07's restored thumbnails draw the same band from the same component — and the approved B-07 slots carry it too, so that screen is parity. **Evidence:** [all four screens, both sides, real baseline photographs](evidence/e-p3/e-p3-attribution-b9e7e53.png) at `b9e7e53` · [three-screen sheet at `b95e81e`](evidence/e-p3/e-p3-attribution-b95e81e.png) kept for provenance | Confirm, or drop the band from property cards now | Designer | **Open** |

**Closed this pass — reclassified as corrections, not deviations:** E-P5 (B-02
restored to the approved standalone light page) and E-P6 (B-07 restored to the
approved image-bearing cards). The owner ruled both were corrections to match
the approved baseline, so they were implemented and verified rather than held
for approval. See §1 (D-18, D-19) and [`exceptions.md`](exceptions.md).

**No exception is marked accepted.** Acceptance is a person saying yes.

E-P1 has **not** been worked around with a history trap, and will not be.

Every evidence file is labelled with the implementation commit it shows. The
`…-011bade` sets show the first implementation commit and are kept for
provenance; the `…-b95e81e` sets show the previous one; the E-P2 and E-P3
sheets are current at `b9e7e53` (the E-P2 content is chrome-free field crops,
identical across these commits — only the label advances; the E-P3 sheet adds
the B-07 pair, which did not exist before the E-P6 correction).

---

## 5 · Measured and classified — the residue

That working list is now closed. Every row was taken back to the rendered
baseline and either fixed (§1) or classified; the row-by-row record is
[`visual-differences.md`](visual-differences.md) §6. What remains in the
differ output after this pass, and what each row is:

| Row | Classification |
|---|---|
| ~~B-02 wordmark/title geometry~~ | **Closed — E-P5 correction (D-18).** B-02 is the approved standalone light page; the row is gone |
| ~~B-07 listing thumbnails~~ | **Closed — E-P6 correction (D-19).** B-07 carries the approved image-bearing cards; the row is gone |
| Control border `#8A8E9C` (and `#E1E4EE` on disabled fields) | **E-P2b, applied and awaiting the owner (§4)** |
| P-02 filter labels 14px vs a 13px header comment; P-02/P-10 prices 24px vs 23px | **Recorded baseline inconsistencies** — the approved screens' own renders measure 14px and 24px; the implementation follows the render |
| S-06 "₹4,200" ink vs the prototype's unstyled black | **Prototype artefact** — the baseline declares no colour; the implementation applies the approved token |
| B-11 "Covered parking" tone | **Sample-data selection artefact** — the row's state differs, not the style |
| ~~Console titles 20px below 1060px~~ | **Closed (D-20).** A harness fault had the differ measuring the prototype's desktop frame on "390" runs; with that fixed the approved steps measured 19/21/22 and the implementation now renders them |
| Content width 1176px vs the 1440px stage declaration | **Rail arithmetic** — 1440 − 264 rail = 1176; the implementation follows the arithmetic |
| Content width 640px on B-01/B-02 vs the frame-spanning proto container | **Measurement artefact** — the approved centred column is 640px; the differ compared it against the prototype's full-bleed outer wrapper |
| B-02 button radius `[6px \| 8px] -> [6px]` | **Measurement limitation** — the approved 8px upload button is the file input's native chooser (`::file-selector-button`), whose radius the differ cannot read; verified visually in the B-02 pairs |
| Control height 47px vs a 52px header comment | **Recorded, deferred** — the approved sheets' own inputs measure 47px |
| Button radius 6px vs per-screen wobble | **Recorded standardisation** |
| Stat values | **Invisible to the differ** — short numeric strings are not paired; verified separately by `verify-visual-baseline.mjs` |

No row in the residue is an unexamined difference.

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
| Firefox text-only zoom | Open — **attempted this pass** | A real desktop Firefox and a person: Playwright's Firefox build was installed and driven, and it does not apply zoom keystrokes to page content (probe in `scripts/verify-firefox-text-zoom.mjs`). The scripted check reports NOT EXERCISED rather than a false pass | Anyone with desktop Firefox — **twenty minutes** |
| Real devices | Open | Two handsets, or a device cloud | QA — two hours |

**Two of the original five were never blocked** — they needed a script, not a
platform, and writing them found two real defects. A third was attempted this
pass and is genuinely blocked by tooling, not effort: Playwright's Firefox
does not engage text zoom, so that one check still needs a person and a real
browser. Of what remains, three need only a Windows or macOS machine somebody
already owns.

---

## 7 · Asset dependencies

| # | Asset | Consequence today | Owner |
|---|---|---|---|
| **C-1** | The baseline's seven review photographs | **Reachable from the current environment** — the E-P3 evidence (§4) renders both sides with the real baseline photographs. The earlier geometry studies used generated stand-ins that say "STAND-IN · not the baseline photograph" on their face; those remain valid for slot geometry and are kept, labelled, for provenance. Photographic fidelity is now reviewable on the E-P3 sheet; final licensed photography is C-2 | Designer, for the E-P3 decision |
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
| design tokens | 30/30 tokens, 43/43 literals |
| contrast (declared pairs) | 24/24 AA |
| contrast corrections (rendered) | 12/12 |
| visual values | 24/24 |
| typography precedence | 11/11 |
| zoom (reflow 320px, text 200%) | 32/32 across 16 screens |
| accessibility | 22/22 (+3 pending manual) |
| accessible names / 2.5.3 | 24/24 across 6 screens |
| forced-colors | 13/13 across 6 screens |
| route sweep | 224/224 (112 routes × 2 widths) |
| without JavaScript | 51/51 forms |
| enquiry · Seller · Builder · Admin | 17/17 · 26/26 · 48/48 · 36/36 |
| B-15 navigation | 9/9 |
| deployment guard | 10/10 with reasons asserted, 2 pending a backend |
| coverage | 113/113 inventory rows mapped, 0 uncovered |

All run at implementation commit `b9e7e53` under the review configuration in
[`local-review.md`](local-review.md) (`next build` + `next start`, not the
development server). The no-JavaScript count rose 50 → 51: the B-02 checks
were rewritten for the approved validation (one submit-line error; the
file-chooser success path is now exercised too).

**A count is not coverage.** Five defects across these passes had a passing
check sitting on top of them: `verify-visual-baseline.mjs` asserted the Admin
rail was brand-deep, the deployment-guard suite reported 8/8 from a test that
could not fail, forced-colors was filed as blocked rather than written, the
same visual-baseline suite expected a 21px stat tile where the approved
S-06 draws 26px, and the geometry differ's 390px runs measured the
prototype's desktop frame for months because a selector never matched and the
failure was swallowed — found this pass, harness corrected, one long-standing
misclassification (console titles) put right as D-20.

---

## 10 · The decision

**Frontend acceptance is not requested.** Category A is empty and the
verification above is green, but four exceptions are open and none is mine to
close.

Acceptance becomes appropriate when:

1. **E-P1** is accepted or redirected by the client or designer;
2. **E-P2a and E-P2b** are signed off by the designer, or another remedy named;
3. **E-P3** is confirmed;
4. the remaining verification checks are run by the people named in §6.

Nothing on that list is waiting on more frontend work. E-P5 and E-P6 were
reclassified by the owner as corrections to the approved baseline and are
closed at `b9e7e53`; they are not on the acceptance path.

**Boundaries maintained:** no live services, no public deployment, no payments,
no authentication, no calls, no messaging. kkl-design unmodified at `5bc3512`.
The sample-mode guard still refuses to serve a production deployment running
sample services, and was not weakened.
