# Phase 2 — exceptions awaiting a decision

Six things the implementation does differently from the approved design, or
in addition to it. **None is closed by more frontend work.** Each names what
happens, why, what the alternative costs, and who decides.

Nothing here is marked accepted. Acceptance is a person saying yes.

---

## E-P1 · The unsaved-changes dialog does not appear on browser Back

### In plain language

> You are editing a listing. You have typed something and not saved it.
>
> - If you click anything **inside Kam Ki Lead** — a section link, "Close
>   editor", the console rail, the logo — you get the approved dialog:
>   **Save draft and close · Discard changes · Keep editing.**
> - If you press the browser's **Back** button, that dialog does **not**
>   appear. The browser goes back.
> - **Your edit is not lost.** Press **Forward** and the editor opens with your
>   text still in the field, above a line that says **"Unsaved work
>   restored."**, and it is still marked **"Unsaved changes"**.
> - **Your edit is not saved either.** Nothing was written to the listing.
>   Anyone else looking at it — including you in another tab — sees the
>   listing as it stands on the server. Nothing was published.
> - If you arrived at the editor by **typing the address or reloading**, Back
>   *does* warn you: the browser's own "Leave site?" prompt. Dismissing it
>   keeps you in the editor.

So: **Back may leave without the custom dialog. Forward restores unsaved
edits. Edits are never silently saved.**

### Why it is not simply fixed

A click can be cancelled; **browser Back cannot**. By the time `popstate`
fires the navigation has already happened, so any "guard" has to undo it. The
usual trick — push a duplicate history entry, re-push on every `popstate` —
breaks Forward, grows the history stack, escapes on a fast double press, and
competes with the App Router for the same events. **It reports a pass and
behaves badly, and it is not in this repository.**

### The one real alternative, and its cost

Next 16 Cache Components uses React's `<Activity>` to preserve component state
across client navigation, and its documentation names form drafts as the case.
It was trialled, not dismissed. It costs:

- every route-segment `dynamic` export becomes illegal (4 layouts);
- the build then fails on per-visit `randomUUID` in the idempotency tokens,
  which must move behind `connection()` or into client components;
- Partial Prerendering becomes the default for the whole application;
- `<Activity>` preserves **at most 3 routes** — beyond that the oldest is
  evicted and the draft is lost anyway.

That is an architectural decision for the team, not an acceptance-pass change.
The trial was reverted.

### Evidence

`scripts/verify-b15-navigation.mjs` — 9/9. Check 6 opens an independent
browser context and asserts the server still renders the original title, which
is the check that "retained" has not quietly become "saved".

For review rather than reproduction, captured at implementation commit
`b95e81e`:

- `evidence/e-p1/e-p1-back-forward-b95e81e.webm` — the whole sequence: edit →
  Back (no dialog) → Forward → edits restored with the notice.
- `evidence/e-p1/e-p1-frame-strip-b95e81e.png` — the same sequence as six
  labelled frames, for reading without a video player.
- `evidence/e-p1/raw/` — the unlabelled frames, including the independent
  second-context view showing the server value unchanged and the in-app
  navigation still raising the approved dialog.

The earlier `…-011bade` set shows the previous implementation commit and is
kept for provenance; the behaviour is identical.

### Decision needed

**Accept the behaviour above as the B-15 experience**, or **fund the Cache
Components route**. Owner: the client, or the designer who specified B-15.

**Status: open.** Not accepted, not worked around.

---

## E-P2 · Two contrast corrections to the approved baseline

Both are **applied** in the implementation and verified as rendered
(`scripts/verify-contrast-corrections.mjs`, 12/12). Both are **reversible in
one line**. What is open is the design's sign-off, not the code.

Before/after crops at implementation commit `b95e81e`:
`evidence/e-p2/e-p2-before-after-b95e81e.png`, with the unlabelled crops in
`evidence/e-p2/raw/`. The "before" side is the **approved prototype** (P-04),
so it does not change between commits; the label identifies the
implementation side. The earlier `…-011bade` set is kept for provenance.

### E-P2a · Focus indicator

| | |
|---|---|
| Criterion | WCAG 2.2 AA · 1.4.11 Non-text Contrast, needs 3:1 |
| Approved value | `#F2A20C` saffron — **2.11:1** on white, **1.95:1** on the page surface |
| Applies to | Every focusable element: buttons, links, inputs, selects, textareas, chips, table-row controls, on white cards, dialogs, table rows and the page surface |
| Not affected | The dark rails. Saffron is 6.44:1 on `#0F2478` and 4.28:1 on `#1B3BB3` |
| **Correction applied** | The 3px saffron outline at 2px offset is **unchanged**. A **1px ink `#12182B` companion** is painted immediately inside it, as a `box-shadow` |
| Result | The indicator presents **17.63:1** against white and **16.30:1** against the page surface; saffron reads **8.35:1** against its own companion, so the ring still reads saffron |
| Layout | Verified: focusing moves nothing, resizes nothing, reflows nothing, and no control sits within 6px of an overflow-hidden edge |

C-01 names the focus ring as one of saffron's three permitted uses, so saffron
was kept. The alternative — darkening to `#C1810A` — changes a declared brand
token and is recorded but not applied.

### E-P2b · Control border

| | |
|---|---|
| Criterion | WCAG 2.2 AA · 1.4.11, needs 3:1 |
| Approved value | `#C6CCE0` — **1.60:1** on white, **1.48:1** on the page surface |
| Applies to | `src/components/ui/field.tsx` — Input, Textarea, Select: every text field, number field, textarea and select in all four journeys |
| **Correction applied** | `--color-control-border` → **`#8A8E9C`** — **3.27:1** on white, **3.02:1** on the page surface, same hue family |
| Not affected | The card hairline `#E1E4EE`. It groups visible content rather than identifying a component, so 1.4.11 does not apply and darkening it would change the approved appearance for no gain |
| Not affected | The invalid state, which keeps `border-danger` and is measured in the passing table |
| Not affected | **Disabled controls.** 1.4.11 reads "except for inactive components", and A-14's disabled price fields deliberately render in the card hairline on a tint so a reader can see they cannot be typed into |

The approved value is kept as `--color-control-border-baseline` so the change
reads as a correction and can be reverted in one line.

### Decision needed

Keep both corrections, or name a different remedy. Owner: the designer.

**Status: open.** Applied, verified, not signed off.

---

## E-P3 · Attribution on review imagery

### The exact difference

With review imagery on, **the implementation draws a dark attribution band in
the bottom-left corner of every image slot.** The approved homepage draws that
band on the **Featured projects** cards and **not** on the **Featured
properties** cards.

| | Approved P-01 | This implementation |
|---|---|---|
| Featured *projects* cards (Orchid Grove, Riverside Commons) | Band present — "Photo by Anton Ryazanov on Unsplash" | Band present |
| Featured *properties* cards (Greenview, Lakeshore, Sundew) | **No band** | **Band present** |
| P-03 gallery | Band present | Band present |

Evidence: `evidence/e-p3/e-p3-attribution-b95e81e.png` — all three affected
screens, both sides, captured with the **real baseline photographs** (the
capture script refuses to publish if any image did not load). Unlabelled
per-screen captures in `evidence/e-p3/raw/`. The `…-011bade` set shows the
same treatment on stand-in geometry images and is kept for provenance.

### Affected assets and screens

Seven photographs, referenced by URL in the baseline and credited per slot:

| Slot | Photograph | Credit the baseline gives |
|---|---|---|
| hero | `photo-1750762367188-2f884520d63d` | Photo by Bohdan Loik on Unsplash |
| a | `photo-1759882611054-fa61e7fa3099` | Photo by Felicia Montenegro on Unsplash |
| b | `photo-1755103114153-eb0a66e3725a` | Photo by Haberdoedas on Unsplash |
| c | `photo-1757970326337-95d7cca56fa1` | Photo by Sebastian Schuster on Unsplash |
| d | `photo-1758193431351-68538bf55ec3` | Photo by Aalo Lens on Unsplash |
| e | `photo-1762344692227-f6496e80d7bf` | Photo by Zulfugar Karimov on Unsplash |
| f | `photo-1755735340764-3b077cab0c5c` | Photo by Anton Ryazanov on Unsplash |

Screens affected: **P-01** (hero, 3 property cards, 2 project cards), **P-02**
(results list), **P-03** (gallery). Only on the review-imagery path, which is
**off by default**.

### Why the band is there — and what is actually required

Stated precisely, because an earlier draft of this section overstated it:

- **The Unsplash licence does not require attribution.** It grants use
  without permission and says credit is appreciated. (Using the Unsplash
  *API* would be different — the API terms do require a credit — but the
  baseline references `images.unsplash.com` files directly, not through the
  API.)
- **The baseline's own `image-slot.js` does require it**: an Unsplash source
  with no credit renders an error tile instead of the photograph. That is the
  design's own rule, not the licence's.
- The approved homepage then puts uncredited Unsplash photographs on the
  property cards anyway — so the approved package contradicts its own loader.

**So the band on every slot is a voluntary, conservative choice, not a
licensing obligation.** The implementation attributes every slot because
attributing some and not others contradicts the design's own loader rule, and
because while third-party photographs are showing at all, a visible credit is
the defensible default.

### Proposed treatment

1. **Now:** keep the band on every slot. It only appears when review imagery
   is switched on, and while third-party photographs are showing it is the
   defensible default — the design's own loader rule, applied consistently.
2. **Before launch:** the baseline states every image must be replaced with
   licensed project photography. When that lands, **remove the band from the
   property cards** so P-01 matches the approved composition — licensed
   project photography carries no third-party attribution consideration.

### Separate, and not the same question

**Photographic fidelity is a different question from attribution**, and this
exception says nothing about it. The current evidence set
(`evidence/e-p3/…-b95e81e.png`) was captured with the **real baseline
photographs** — `images.unsplash.com` is reachable from the network this
capture was run on — so the treatment is shown on the actual images, not on
stand-ins. The earlier stand-in set (`evidence/e-p3/…-011bade.png`, labelled
"STAND-IN · not the baseline photograph") established slot **geometry** only
and is kept for provenance. See `visual/README.md`.

### Decision needed

Confirm step 2, or ask for the band dropped from the property cards now.
Owner: the designer.

**Status: open.**

---

## E-P5 · B-02 renders inside the Builder console shell

### The exact difference

The approved **B-02** ("Company verification") is a **standalone light page**:
the 20px ink wordmark at the top, a 30px/800 Archivo title, and
document-upload cards on the page surface — the same pre-console treatment as
the registration screens. The implementation renders B-02 **inside the
Builder console shell**: dark rail, console header at 22px/700, the content
in a panel.

This was found by the differ (the wordmark and title rows it could not pair)
and confirmed by direct measurement of the prototype. It is a **structural**
difference, not a style one: which chrome the screen lives inside.

### Why it was not simply restructured

The implementation's choice is defensible — a verification-status screen
reachable from the console arguably belongs in the console — and the approved
choice is defensible too: verification is a pre-activation gate, and the
approved flow draws it outside the console the applicant does not yet have.
**That is a product decision, and it was not taken unilaterally.**

### Decision needed

Keep B-02 inside the console shell, or rebuild it as the approved standalone
page. Owner: the designer.

**Status: open.**

---

## E-P6 · B-07's listing cards have no photograph thumbnail

### The exact difference

The approved **B-07** listing rows are **cards with a left-hand image slot** —
a photograph thumbnail beside the listing title. The implementation's rows
are text-only: title, chips, locality, meta, actions.

This is not a data gap: the sample listings carry `media: PropertyMedia[]`
with URLs, and the public cards (P-01, P-02) already render image slots from
the same data. It is a layout difference on one screen.

### Why it was not simply added

Adding an image column changes the approved row's height and density, and
where the approved card puts the image relative to the chips and the enquiry
count is a composition call. Recorded for a decision rather than guessed.

### Decision needed

Add the thumbnail to the B-07 rows per the approved card, or confirm the
text-only row. Owner: the designer.

**Status: open.**
