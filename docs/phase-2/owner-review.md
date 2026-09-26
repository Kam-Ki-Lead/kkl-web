# Phase 2 — owner review

One page for the review. What is open, what each decision needs, and the
evidence for it. The full record behind every line here is the
[decision sheet](decision-sheet.md); this page links rather than repeats.

**Implementation:** `5c3a658` on `claude/phase-2-frontend` (kkl-web)
**Approved design:** kkl-design `5bc3512`, unmodified
**Not requested:** acceptance, deployment, or any exception marked accepted —
acceptance is a person saying yes.

---

## 1 · The four open exceptions, with their evidence

| # | What it is | Evidence | Decision needed | Owner |
|---|---|---|---|---|
| **E-P1** | Browser **Back leaves the listing editor without the custom dialog**. Forward restores unsaved edits with an "Unsaved work restored." notice; **nothing is ever silently saved** — a second tab reads the server value | [Video](evidence/e-p1/e-p1-back-forward-b95e81e.webm) · [labelled frame strip](evidence/e-p1/e-p1-frame-strip-b95e81e.png) · [raw frames](evidence/e-p1/raw/) — captured at `b95e81e`; behaviour identical at `5c3a658` (B-15 suite green) | Accept the behaviour, or fund the Next 16 Cache Components route and its four named costs | Client, or the designer who specified B-15 |
| **E-P2a** | Focus indicator gains a 1px ink companion edge inside the unchanged saffron ring (2.11:1 → 17.63:1 on white) | [Comparison sheet](evidence/e-p2/e-p2-prototype-vs-corrected-b9e7e53.png) — **approved prototype versus accessibility-corrected implementation**, current at `b9e7e53`; [raw crops](evidence/e-p2/raw/) | Keep it, or name another remedy | Designer |
| **E-P2b** | Control border darkened `#C6CCE0` → `#8A8E9C` (1.60:1 → 3.27:1 on white) | Same sheet | Keep it, or name another remedy | Designer |
| **E-P3** | Review imagery draws the attribution band on **every** card; the approved P-01 draws it on the project cards and not the property cards. On P-03 and B-07 the band is approved and both sides carry it | [Attribution sheet, four screens](evidence/e-p3/e-p3-attribution-b9e7e53.png) — real baseline photographs, both sides, now including B-07's restored thumbnails and the approved "No photos yet" state. The earlier [three-screen sheet](evidence/e-p3/e-p3-attribution-b95e81e.png) is kept, labelled with its original commit `b95e81e`, for provenance | Confirm the proposed treatment (keep the band now; remove it from property cards when licensed photography lands), or ask for it dropped now | Designer |

Both E-P2 corrections are **applied and reversible in one line**; what is open
is sign-off, not code. E-P1 has not been worked around with a history trap,
and will not be.

**Closed, not on the acceptance path:** E-P5 and E-P6 were reclassified by the
owner as corrections to the approved baseline and are closed at `b9e7e53`
(B-02 restored to the approved standalone light page; B-07 restored to the
approved image-bearing cards). E-P4 is withdrawn — the screens answered it.

## 2 · The D-20 harness fault, and what it changed

The geometry differ's 390px runs had never switched the prototype to its 390
frame — a whitespace-sensitive selector, silently swallowed. Closed out:

- **Superseded:** `visual/geometry-390.json` as committed at `dfb0165`,
  `969ae3d`, `1591aa0` — every "390" measurement in those revisions is the
  desktop frame. Marker in [`visual/README.md`](visual/README.md); corrected
  regeneration first committed at `7afe140`. No other artifact was affected.
- **Never swallowed again:** all four prototype-driving scripts now assert the
  frame's rendered width and fail the run (`scripts/proto-width.mjs`);
  negative-tested with a width the prototype does not offer.
- **Rerun, classified — and now corrected:** the corrected sweep surfaced a
  recorded class — the approved screens step display type down at mobile
  (titles 26/30/34, flow titles 24/27/30, section headings 21/24/26, and four
  more) while the implementation held the desktop step — plus five flat-size
  rows. You authorised the bounded correction; **it landed at `5c3a658`**.
  Every row was verified against the approved sources, corrected with the
  semantic style that owns the role at the approved 620/1060 breakpoints, and
  re-measured at 390, 768 and 1440. The tablet sweep is new this pass, and it
  caught four console-chrome rows the extreme widths cannot pair (the Builder
  header subscription chip at 14px, both rail-footer value steps, and the
  Seller header balance as the approved pill button) — all fixed. The two
  pairing suspects were real and are fixed: B-18's specimen is rebuilt to the
  approved composition, and B-24's aside is rebuilt to the approved
  account-status tile panel. Row by row:
  [`visual-differences.md`](visual-differences.md) §6; representative screens
  at all three widths: [`evidence/responsive-type/`](evidence/responsive-type/).

## 3 · Manual verification — open, listed separately

None of these has been claimed. Detail per check in
[`pending-verification.md`](pending-verification.md).

| Check | Needs | Who | Effort |
|---|---|---|---|
| Screen-reader behaviour | NVDA (free) on Windows, or VoiceOver on macOS | Accessibility tester | Half a day |
| Windows High Contrast themes | A Windows machine | Anyone | An hour |
| Voice control | Windows Voice Access or macOS Voice Control — both built in | Anyone | An hour |
| Firefox text-only zoom | A real desktop Firefox — Playwright's build does not engage text zoom (attempted; probe in `scripts/verify-firefox-text-zoom.mjs`) | Anyone with desktop Firefox | Twenty minutes |
| Real devices | Two handsets, or a device cloud | QA | Two hours |

## 4 · Backend dependencies — open, listed separately

Nine capabilities kkl-backend owns and has not published. **The frontend for
each is complete** — typed interface, sample implementation, built and
verified states. Contracts in [`service-contract.md`](service-contract.md) are
**proposed, not agreed**.

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

Plus **sixteen open client decisions**, six blocking launch, in
[`decisions.md`](decisions.md). Several screens are deliberately inert because
of them — an inert control on A-14, A-20 or A-21 is the decision showing, not
a bug.

## 5 · Verification at this commit

All green at `5c3a658` under the review configuration in
[`local-review.md`](local-review.md): typecheck/lint clean · unit 27/27 ·
tokens 30/30 + 43/43 · contrast 24/24 + corrections 12/12 · visual values
24/24 · typography 11/11 · zoom 32/32 · accessibility 22/22 · names 24/24 ·
forced-colors 13/13 · route sweep 224/224 · no-JavaScript 51/51 ·
enquiry/Seller/Builder/Admin 17/26/48/36 · B-15 9/9 · deployment guard 10/10
(+2 pending a backend) · coverage 113/113.

Geometry differ, re-run on the new build: full sweeps at 1440 and 390
(`visual/geometry-1440.json`, `visual/geometry-390.json`) plus a targeted
tablet sweep at 768 over the 38 affected screens (`visual/geometry-768.json`).
Every corrected row closes at all three widths; what remains is the recorded
set in [`visual-differences.md`](visual-differences.md) §6 — the P-02/P-10
baseline-internal inconsistencies and the A-17 shell-title wording. No
horizontal overflow on the 18 representative pages at any of the three widths.

One evidence fault found and fixed this pass: `visual/index.json` as committed
at `4f125ec` had been truncated to the two E-P3 screens by an ONLY-filtered
capture run, which made the coverage generator report 95 uncovered rows. The
full index is restored from `b9e7e53` with the 38 affected screens' rows
refreshed from the new build; the generator again reports 97 pairs, 4 nested,
12 library, 0 uncovered.

A count is not coverage — five defects across these passes had a passing check
sitting on top of them, D-20 included. The list is on the
[decision sheet](decision-sheet.md) §9.

**Boundaries maintained:** no live services, no public deployment, no
payments, no authentication, no calls, no messaging. kkl-design unmodified.
The sample-mode guard still refuses a production deployment on sample
services, and was not weakened.
