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

## Verification, 2 October 2026

Frontend `eb665fc` is the follow-up to `af0579c`. The same review process was
rebuilt and served on port 3811. The API on port 4010 was left running.

The production stylesheet had dropped the focus shorthand, leaving
`outline-style` and `outline-width` empty. `eb665fc` writes those longhands.
The served rule is `outline-width: 3px`, `outline-style: solid`,
`outline-color: var(--color-saffron)`, `outline-offset: 2px`, and a 1px ink
box-shadow. A scripted `focus()` in this browser did not match
`:focus-visible`, so the painted ring was not captured as a screenshot. The
rule itself was read from the served stylesheet.

Screens opened on that build:

| Screen | What was checked |
| --- | --- |
| Public home, 1440 layout | Logo, purple “Lead”, one orange-to-yellow strip, purple search button. The capture window is narrower than the layout. |
| Public home, 390 layout | Hamburger, the same logo and strip, purple hero. |
| Sign-in | Mobile-number field and the purple “Send code” button. Footer blurb is `#EDE4F5` on `#4B2973`. Sign-in border is `#8A8E9C`. |
| Buyer account | Signed-in account page, purple links. |
| Seller | Purple rail and drawer. Active item is the brand purple with white text. |
| Builder | The staff session is refused. The Builder rail is the same component as the Seller rail. |
| Admin dashboard and orders | Ink rail, purple avatar and “All” filter, orange sample chip, order table. |
| Pricing | Save, apply, and preview stay three separate sections. Version 3 was not changed. |

There is no public dialog. The Seller navigation drawer is the overlay that
was opened. No purchase was submitted.

`node scripts/verify-contrast.mjs` reported 24 of 24 declared pairs meeting
WCAG 2.2 AA. `node scripts/verify-design-tokens.mjs ../kkl-design` reported
33 of 33 tokens and 48 of 48 component literals accounted for. The frozen
baseline is still `kkl-design` at `5bc3512`.

## Implementation complete

The 2 October instruction to take colours from the supplied logo supersedes
the earlier direction to retain the blue and saffron palette. Logo receipt
and this implementation are complete. No other client decision is closed
by that.

A later pass on the same build forced `:focus-visible` on the homepage
search button. The painted ring was orange `rgb(243, 148, 42)`, about 3px,
with a 2px offset and a 1px ink shadow. Hover on that button was
`rgb(75, 41, 115)`. A disabled primary button was `rgb(197, 192, 204)` with
white text. Inactive text is outside the WCAG 1.4.3 contrast requirement.
The Seller rail was `rgb(75, 41, 115)` with item text `rgb(237, 228, 245)`.
The Builder console refused the staff session. A bad pricing amount was
refused without storing a version. No remaining component uses the old
brand blue or saffron as a rendered colour. Those values stay in comments
and in `kkl-design` at `5bc3512`.

A later check used the Tab key in Chrome on the homepage. The first Tab
focused the “Kaam Ki Lead” link, and that link matched `:focus-visible`.
The ring was solid, 3px, `rgb(243, 148, 42)`, with a 2px offset and a 1px
ink shadow `rgb(18, 24, 43)`. Signed in as Review Builder, number ending
0104, `/builder` opened the Dashboard. The navigation was labelled
“Builder console” and listed Dashboard, My properties, Enquiries,
Subscription, Buy Leads, My leads, My purchases, Billing & credits,
Support, and Profile. The rail background was `rgb(75, 41, 115)`. The
staff-session refusal above is a different account.

## The trading name is "Kaam Ki Lead"

The owner corrected the spelling: it is Kaam Ki Lead, not Kam Ki Lead. The
application carried the wrong spelling in 34 places, all of them visible to
somebody — the page title and its template, the wordmark's accessible name,
four more "— home" link labels, the footer copyright line, and body copy on
the property, profile, enquiry and builder-pricing screens. All 34 are
corrected, together with the project's own prose.

Two sets of files keep the old spelling on purpose.

The Phase 1 design-direction prototype under `docs/design/prototype/` is
preserved as the rejected reference artifact. It is what was shown and
turned down; rewriting its text would change a record of that, and it is
already excluded from the application's lint rules for the same reason.

`docs/phase-5/browser-evidence.json` and the other captured evidence files
hold verbatim text read off rendered pages during a verification run.
Editing a capture would make it a claim about a run that did not happen.
They will carry the corrected name the next time those scripts run.

Repository and organisation names (`kkl-web`, `Kam-Ki-Lead`) are unchanged.
Renaming either is not part of this correction.

### What a text search missed

The first pass searched for the contiguous string "Kam Ki Lead" and reported
nothing left. A browser check then showed the old spelling still rendering on
the wordmark, which appears on every page.

Three places split the name in the source, so no search for the whole string
could find them:

- `components/brand/wordmark.tsx` renders it in two spans, "Kam Ki" and
  "Lead", so "Lead" can carry a heavier weight. The rendered name was wrong
  on every page in the application.
- `components/seller/kyc-form.tsx` and
  `app/builder/enquiries/notifications/page.tsx` wrap the name across a line
  break in JSX, which renders as one string.

All three are corrected. The sweep that found them is whitespace-insensitive
(`Kam\s+Ki\s+Lead`) and is the one to use on a JSX codebase. Verified in a
headless browser on the homepage, a 404 route and the Seller verification
screen: the old spelling is absent and the new one present on all three.

### The last three, 6 October 2026

A sweep ahead of a public staging deployment found three remaining
occurrences. None of them was on a rendered page — the whitespace-insensitive
pattern above had caught all of those — but all three were places the name
would eventually be read.

- `app/admin/login/page.tsx` — the staff sign-in screen's work-email
  placeholder read `name@kamkilead.internal`, which is rendered text a staff
  member sees. Corrected to `name@kaamkilead.internal`. `.internal` resolves
  nowhere, so there is no functional change; it is a hint, not an address.
- `scripts/verify-accessible-names.mjs` — the comments explaining the
  accessible-name rules quoted the old spelling while describing what the
  page renders *now*, including the `<span>Kam Ki</span><span>Lead</span>`
  example. A comment that contradicts the code it explains is a defect with a
  long fuse.
- `tests/access-boundaries.test.mjs` — a fixture message carried
  `authorLabel: 'Kam Ki Lead support'`. A fixture label is text a screen
  displays, so it follows the same rule as the screen.

Deliberately **not** changed, because they are historical records and changing
them would make the record wrong:

- `docs/phase-5/browser-evidence.json` — captured page text from a run that
  happened. It is evidence of what was on screen that day.
- `docs/design/prototype/*` — the frozen design-direction prototype. Not
  served by the application, and dated.
- The comment in `components/brand/wordmark.tsx` that quotes the old spelling
  while explaining why a contiguous-string search missed the wordmark. The
  quotation is the point.
- `kkl-backend/docs/audit-2026-10/requirement-implementation.md` R-PUB-11,
  which names the old spelling as the defect it records.

Repository identifiers are unchanged: the GitHub organisation
`Kam-Ki-Lead`, the repository names, the `KKL_*` variable names, the `kkl_*`
database roles and the `/v1/*` API paths all stay as they are. None of them
is customer-facing and renaming any of them would be a functional change for
no benefit.

Verified by serving a production build (`NEXT_PUBLIC_KKL_ENV=staging`) and
fetching 17 routes, including the homepage, search, support, the broker and
builder landing pages, post-property, find-my-match, both dashboards' redirect
responses, the staff sign-in screen, the customer sign-in screen and a 404.
Every page: zero occurrences of `Kam Ki`, zero of `kamkilead`, and
`Kaam Ki Lead` present in the `<title>` and the body.
