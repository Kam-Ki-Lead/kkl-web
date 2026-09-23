# Visual comparison evidence

Side-by-side captures of the approved prototype and the implementation, at
matching states and widths.

Each pair is `<screen>-<width>-baseline.png` and
`<screen>-<width>-implementation.png`. `index.json` lists every pair with the
route and the prototype screen id it came from.

## These are for a person to look at

No pass is claimed from capture alone, and the harness says so in its own
output. What the captures are *for* is the class of difference that every
automated check in this repository misses — and four such differences were
found this way while a route sweep of 224 renders, a token check and a
computed-style check were all passing:

- Card headings at the screen-heading step (26px where the design says 17px).
- The Credits figure at 34px where the approved card declares 30px.
- The Admin rail at the Seller's step, so twenty items did not fit.
- Form controls using the card hairline instead of the control border.

## How they were produced

The prototypes load React, ReactDOM and Babel from `unpkg.com` and fonts from
Google Fonts. Where a network policy denies those, they render as unexpanded
`{{ template }}` placeholders and comparison is impossible.

`scripts/setup-prototype-review.sh` builds a **separate local review copy**
using the same pinned versions from the npm registry and the same font families
from `@fontsource`. **kkl-design is never modified** — the script verifies the
baseline is byte-identical before it finishes.

`scripts/capture-visual-comparison.mjs` then drives the copy through its **own
screen picker and width tabs**, so the prototype reflows the way it is designed
to. A browser viewport alone does not make it do that.

Commands are in `../local-review.md`.

## What is in them, and what is not

**17 screens of 113 inventory rows.** The set was chosen by the priority list
in the acceptance pass: public portal, Seller dashboard/marketplace/purchase
result/billing, Builder dashboard/editor/enquiries/restrictions, Admin
dashboard/KYC review/wallet adjustment/support/audit, and the shared mobile
navigation.

**No imagery.** The baseline references seven Unsplash photographs by URL and
this environment's network policy denies `images.unsplash.com`, so the
normal-state comparison is missing its photography. Missing-media fallbacks
appear as their own states and are **not** a substitute.

The differences that remain — deliberate departures, and the ones still open —
are enumerated in `../acceptance.md` §3.
