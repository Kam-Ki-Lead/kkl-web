# Authorised brand revision — 2 October 2026

Frontend `af0579c`. The frozen design baseline stays `kkl-design` at `5bc3512`.
This file does not replace it.

The logo file supplied with the 2 October instruction is stored unchanged at
`public/brand/kkl-logo.jpg`. It is a JPEG, 2440×2373, with a white background.
It is not a vector and it is not transparent. On a dark rail the white
rectangle is the file’s own background. The mark is not cropped or redrawn.

These samples are measurements of that JPEG. They are not an official hex-code
brand guide.

| Role | Sample | Use |
| --- | --- | --- |
| Main brand | `#643681` | Links, primary buttons, the word “Lead” |
| Deep purple | `#4B2973` | Rails, footer, primary hover |
| Orange accent | `#F3942A` | Badges and the focus ring, with ink text on the badge |
| Ribbon orange | `#EF6729` | Accent hover, and one end of the highlight |
| Yellow | `#F8D424` | Inside the logo and the single homepage highlight strip |

Yellow is not used for text. `#F8D424` on white is 1.45:1. `#F3942A` on white
is 2.31:1, so the focus ring keeps the 1px ink companion. Orange on the purple
rail is 4.87:1. White on `#643681` is 8.80:1. White on `#4B2973` is 11.27:1.
Ink on `#F3942A` is 7.62:1. Rail text `#EDE4F5` on `#4B2973` is 9.13:1. Neutral
chip text `#643681` on `#F6F1FB` is 7.92:1. Success, warning, and error colours
are unchanged. Control borders stay `#8A8E9C`.

`node scripts/verify-contrast.mjs` reported 24 of 24 declared pairs meeting
WCAG 2.2 AA. `node scripts/verify-design-tokens.mjs ../kkl-design` reported
33 of 33 tokens accounted for, with the new values explained as this revision
rather than as baseline colours.

The before shots in `evidence/brand-revision/before/` are the previous build,
frontend `32c133c`, process 29296. The after shots in `after/` are process
31536, started at 17:17 local, which includes `af0579c`. The browser panel was
narrow, so these are the header, the hero, and the pricing screen rather than
a full 1440 frame. Public home, the search controls on that page, and the
admin pricing screen were opened. Seller and Builder consoles share the same
rail, footer, button, and chip tokens.

The homepage hero carries one gradient strip. Buttons and form controls do not.
