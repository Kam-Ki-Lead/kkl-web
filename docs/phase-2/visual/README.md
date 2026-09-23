# Visual comparison evidence

Side-by-side captures of the approved prototype and the implementation, at
matching states and widths.

## Two states, captured separately

| Files | State |
|---|---|
| `<screen>-<width>-baseline.png` / `-implementation.png` | **Missing media.** No photography on either side — what the application ships by default |
| `<screen>-<width>-photos-baseline.png` / `-photos-implementation.png` | **Image present.** Stand-in photography wired into both sides |

`index.json` and `index-photos.json` list every pair with the route and the
prototype screen id it came from. **Neither state stands in for the other**, and
the missing-media set is not evidence about the image-present one.

Both sides of a pair are always in the same state. The missing-media set is
captured against a second prototype copy built with `KKL_REVIEW_PHOTOS=off`,
so the prototype is missing its media too — otherwise the pair would be a
prototype with photographs set against an application without them.

## These are for a person to look at

No pass is claimed from capture alone, and the harness says so in its own
output. What the captures are *for* is the class of difference that every
automated check in this repository misses. Six such differences have now been
found this way while a route sweep of 224 renders, a token check and a
computed-style check were all passing:

- Card headings at the screen-heading step (26px where the design says 17px).
- The Credits figure at 34px where the approved card declares 30px.
- The Admin rail at the Seller's step, so twenty items did not fit.
- Form controls using the card hairline instead of the control border.
- **The P-03 gallery sized by aspect ratio** where the approved screen declares
  fixed heights — 802×551 against the design's 843×400 at 1440.
- **The public container 64px too narrow on every page**, because
  `max-w-[1280px]` was read as a border-box width where the baseline's 1280px
  is content.

The last two were invisible until photography was wired in: an empty slot
collapses to a box that resembles the design closely enough to pass a glance.

## How they were produced

The prototypes load React, ReactDOM and Babel from `unpkg.com`, fonts from
Google Fonts, and photography from `images.unsplash.com`. Where a network
policy denies those, they render as unexpanded `{{ template }}` placeholders
and comparison is impossible.

`scripts/setup-prototype-review.sh` builds a **separate local review copy**
using the same pinned versions from the npm registry and the same font families
from `@fontsource`. **kkl-design is never modified** — the script verifies the
baseline is byte-identical before it finishes, and aborts if not.

`scripts/capture-visual-comparison.mjs` then drives the copy through its **own
screen picker and width tabs**, so the prototype reflows the way it is designed
to. A browser viewport alone does not make it do that. The implementation is
captured full page, after scrolling to the bottom to trigger anything lazy.

Commands are in `../local-review.md`.

## About the stand-in photography

`scripts/make-review-photos.mjs` generates seven deterministic images under the
photo ids the baseline names. **They are not the baseline photographs and are
not presented as them** — each one says `STAND-IN · not the baseline
photograph` on its face, and carries corner marks so a crop is obvious.

They exist because this environment's egress policy denies
`images.unsplash.com` (re-confirmed: the proxy rejects CONNECT), so the real
photographs cannot be fetched here at all. Both sides receive the identical
file, which means **photographic fidelity is not being tested and cannot be**.
What the image-present state tests is slot geometry: aspect ratio, crop
behaviour, rounding, overlay and caption placement.

Two things to know when reading those captures:

- The prototype's credit overlays still read "Photo by … on Unsplash" over an
  image that is not theirs. The overlay text is baseline content; the image
  underneath announces what it is.
- The implementation draws an attribution band on every card with review
  imagery; the approved homepage draws one on the project cards but not the
  property cards. This exists only on the review-imagery path, which is off by
  default, and goes away when licensed project photography replaces it.

To compare the real photographs, run the capture in an environment that allows
`images.unsplash.com` and omit `NEXT_PUBLIC_KKL_IMAGE_ORIGIN`.

## What is in them, and what is not

**17 screens of 113 inventory rows**, at 1440 and 390. The set was chosen by
the priority list in the acceptance pass: public portal, Seller
dashboard/marketplace/purchase result/billing, Builder
dashboard/editor/enquiries/restrictions, Admin dashboard/KYC review/wallet
adjustment/support/audit, and the shared mobile navigation.

The image-present state covers the three public screens that carry photography
(P-01, P-02, P-03). The consoles render none, so there is nothing there for it
to show.

The differences that remain — deliberate departures, and the ones still open —
are enumerated in `../acceptance.md` §3.
