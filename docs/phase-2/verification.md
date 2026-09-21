# Verification Record

What has actually been checked in kkl-web, and what has not. Carries forward the outstanding
items from C-11 of the approved baseline, which design approval did **not** discharge.

A check is only recorded here once it has been performed. "It renders" is not verification.

## Automated checks

| Check | Command | Result | When |
|---|---|---|---|
| Type check | `npx tsc --noEmit` | Pass, 0 errors | Foundation + P-01 |
| Lint | `npx eslint .` | Pass, 0 errors, 0 warnings | Foundation + P-01 |
| Production build | `npx next build` | Pass — compiled, TypeScript checked, 3 static pages generated | Foundation + P-01 |
| Unit / integration tests | — | **None written yet.** No test runner is configured. | — |

The ESLint flat config was broken on arrival (`FlatCompat` threw "Converting circular structure
to JSON"); lint could not run at all until it was repaired. Any earlier claim of a lint pass in
this repository predates a working config.

## Visual comparison against the approved baseline

Method: the baseline prototype and the application are screenshotted at the same viewport widths
and compared side by side. The baseline's own width tabs are used to obtain its true responsive
layouts — a browser viewport alone does not reflow it.

| Screen | Widths compared | Result |
|---|---|---|
| P-01 Homepage | 1440, 768, 390 | Structure, order, type scale, colour and copy match. Differences are deliberate and recorded in `approved-baseline.md` §5: no stock photography (fallback slots render instead), and listing counts derived from fixtures rather than the baseline's illustrative 244/128. |

Defects found and fixed during that comparison, for the record: the hero's no-image fallback
caption collided with the hero copy; the project card's fixed-width image overlapped its content;
"1 listings" was not singularised.

## Interaction and state checks

| Check | Scope | Result |
|---|---|---|
| Mobile navigation drawer | P-01 at 390 | Opens and closes; `aria-expanded` and `aria-controls` set |
| Search count updates on field change | P-01 | Count is computed by the service on each change, not guessed client-side |
| Loading / empty / error / access-denied | C-08, C-09 components | Built and typed; **not yet exercised on a route** — no screen currently reaches them |
| Keyboard access | — | **Not yet checked** |
| Focus visibility | Token level only | 3px saffron ring at 2px offset is applied globally via `:focus-visible`; **not yet walked screen by screen** |
| Dialog focus trap and Escape | — | **Not applicable yet** — no dialog implemented (C-07 not started) |
| Back behaviour and form-data preservation | — | **Not yet checked** — no multi-step form implemented |

## Console output

The application's console is checked on each screenshot run, separately from the baseline's own
console state.

| Route | Console |
|---|---|
| `/` | Clean, apart from Next.js dev-server HMR WebSocket failures (`ERR_INVALID_HTTP_RESPONSE`). That is this sandbox blocking the dev WebSocket, not application code; it does not occur in `next build` output. |

The baseline's unresolved homepage console defect is **not inherited** — see
`approved-baseline.md` §6.

## Carried forward from C-11 — still outstanding

These were outstanding in the approved baseline and remain outstanding here. None may be
reported as passed without being performed.

1. **Screen-reader testing.** None performed, on either the baseline or the application. Roles,
   labels and live regions are present in the markup but unverified with assistive technology.
2. **Individual status-chip contrast.** Not measured chip by chip. The C-01 contrast rules are
   implemented as tokens, but each chip's foreground-on-background ratio is unverified.
3. **Native browser zoom and Firefox text-only zoom.** Unverified. The baseline checked only a
   *simulated* 200% text enlargement, on one screen at one width, and recorded it as **Partial**.
   Nothing here improves on that.

## Not claimed

- No screen is connected to a real service. Everything renders from sample fixtures.
- No accessibility conformance claim is made at any level.
- No performance or load testing has been done.
- No cross-browser testing has been done; all checks ran in Chromium.
