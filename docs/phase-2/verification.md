# Verification Record

What has actually been checked in kkl-web, and what has not. Carries forward the outstanding
items from C-11 of the approved baseline, which design approval did **not** discharge.

A check is only recorded here once it has been performed. "It renders" is not verification.

## How these checks are run

Against a **production build** (`next build` + `next start`), not the dev server. That matters:
the dev server in this sandbox cannot open its HMR WebSocket, and the page does not hydrate as a
result — client behaviour appears broken when it is not, and a genuine prerender error stayed
hidden until the first production build. Dev-server observations are not evidence.

## Automated checks

| Check | Command | Result |
|---|---|---|
| Type check | `npx tsc --noEmit` | Pass, 0 errors |
| Lint | `npx eslint .` | Pass, 0 errors, 0 warnings |
| Production build | `npx next build` | Pass — 19 routes compiled, 8 prerendered |
| Unit / integration tests | — | **None written. No test runner is configured.** |

The ESLint flat config was broken on arrival (`FlatCompat` threw "Converting circular structure
to JSON"); lint could not run at all until it was repaired. Any earlier claim of a lint pass in
this repository predates a working config.

## Route sweep

All 18 implemented routes, at 1440px and 390px: **HTTP 200, no console errors, no page errors,
no failed sub-resources, no horizontal overflow.**

`/` · `/search` · `/property/:slug` · `/property/:slug/enquiry` · `/property/:slug/site-visit` ·
`/auth` · `/find-my-match` · `/find-my-match/review` · `/matches` · `/account` ·
`/account/enquiries` · `/account/enquiries/:id` · `/account/shortlist` · `/builders` ·
`/brokers` · `/support` · `/legal/:slug` · `/enquiry/expired`

## Journey walkthrough (driven in a browser, production build)

Homepage → hero search → search results → property detail → enquiry form → validation failure →
OTP → invalid code → valid code → confirmation → enquiry tracking → enquiry detail → back.

| Behaviour | Result |
|---|---|
| Hero search produces a correct filtered URL | ✅ `/search?locality=new-town` |
| Invalid enquiry shows field-level errors | ✅ both name and mobile, with the reason |
| Entered values survive a failed submit | ✅ message text preserved verbatim |
| Draft survives the OTP step | ✅ held server-side, not in client storage |
| `000000` shows the invalid-OTP state | ✅ error rendered and announced |
| Valid code reaches confirmation with a reference | ✅ `e-18902` |
| Reloading the confirmation is safe | ✅ no second enquiry |
| Re-visiting the confirm step | ✅ lands on the expired state, does not duplicate |
| Browser Back through the journey | ✅ no lost state |
| Unknown property | ✅ 404 |
| Over-narrow filters | ✅ empty state naming the filters and offering to clear |

## Accessibility — checked

| Check | Result |
|---|---|
| Focus ring on every interactive element | ✅ 3px saffron at 2px offset, verified under real keyboard focus |
| Focus ring is immediate | ✅ after a fix — see below |
| Tab order through the enquiry journey | ✅ header → breadcrumb → fields → submit, no traps, nothing skipped |
| Form controls have associated labels | ✅ zero unlabelled controls on the enquiry form, search filters, requirement capture, auth |
| One `h1` per page, sensible heading order | ✅ checked on homepage, search, property detail, enquiries |
| Mobile drawer | ✅ toggles, `aria-expanded` and `aria-controls` correct, dismisses |
| Minimum target size | ✅ 44px enforced in the control components (48px where a thumb is likely) |

**Focus-ring defect found and fixed.** Controls carrying Tailwind's `transition-colors` also
transition `outline-color`, so the focus indicator faded in from `currentColor` over 150ms —
effectively invisible on filled buttons at the moment focus lands. The transition now names its
properties explicitly and excludes `outline-color`. A base-layer override was tried first and
does not work: a utility class outranks it.

## Accessibility — NOT checked

Carried forward from C-11. None of these may be reported as passed without being performed.

1. **Screen-reader testing.** None performed, on the baseline or the application.
2. **Individual status-chip contrast.** Not measured chip by chip.
3. **Native browser zoom and Firefox text-only zoom.** Unverified. The baseline checked only a
   *simulated* 200% text enlargement, on one screen at one width, and recorded it **Partial**.
   Nothing here improves on that.

## Visual comparison against the approved baseline

Method: baseline prototype and application screenshotted at matching widths and compared. The
baseline's own width tabs are used to obtain its true responsive layouts — a browser viewport
alone does not reflow it.

| Screen | Widths | Result |
|---|---|---|
| P-01 Homepage | 1440, 768, 390 | Structure, order, type scale, colour and copy match, including the distinct mobile layout |
| P-02 Search results | 1440 | Filter row, possession chips, applied-filter bar, sort set, card grid and count line match |
| P-03 Property detail | 1440 | Gallery split, spec grid, pricing table, amenities, location, possession panel and sidebar match |

Deliberate differences, recorded in `approved-baseline.md` §5: no stock photography (fallback
slots render instead), and listing counts derived from fixtures rather than the baseline's
illustrative 244/128.

Defects found by comparison and fixed: hero fallback caption colliding with hero copy; project
card image overlapping its content; "1 listings"; three nav items marking themselves active at
once; carpet-area unit dropped from the first pricing row.

## Console output

The application's console is checked on every sweep, separately from the baseline's own console
state. **Clean on all 18 routes at both widths.** The baseline's unresolved homepage console
defect is not inherited — see `approved-baseline.md` §6.

## Not claimed

- No screen is connected to a real service. Everything renders from sample fixtures.
- No accessibility conformance claim at any level.
- No performance or load testing.
- No cross-browser testing; all checks ran in Chromium.
- No test suite exists. The journey and sweep above are scripted browser checks run by hand this
  session, not committed regression tests.
