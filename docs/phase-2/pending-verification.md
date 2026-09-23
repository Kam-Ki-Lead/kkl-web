# Phase 2 — verification still pending

Five checks were previously listed as blocked. **Two of them were not**, and
this pass wrote and ran them. What is left is stated per check: the tool, the
steps, the expected outcome, whether software could enable it elsewhere, and
who does it.

**The constraint is not "hardware" in every case, and saying so would have
kept work parked that could be done.**

---

## Closed in this pass — the constraint was a missing script, not a platform

### ✅ Forced-colors mode

Recorded as "needs Windows". **Chromium emulates forced-colors and Playwright
exposes it as a context option**, so the `forced-colors` media query, system
colour substitution and the discarding of author backgrounds are all
exercisable here.

`scripts/verify-forced-colors.mjs` — 6 screens, all passing. It **found a real
defect**: status chips carry their meaning in a tinted fill, and forced-colors
discards author backgrounds, so every chip lost its boundary and became
ordinary text. Corrected with a `@media (forced-colors: active)` rule that
gives chips a `currentColor` border — scoped to the media query, so the
approved appearance is untouched everywhere else.

**Still open:** Windows' own High Contrast themes and their specific palettes.
Emulation catches failures caused by the application's CSS, which is most of
them; it does not reproduce a particular theme's colours.

### ✅ Accessible names, roles and landmarks

Recorded under "screen-reader behaviour — no assistive technology available".
Half of that is true. The other half — the **platform accessibility tree that
those tools read from** — is exposed by Chromium's DevTools protocol and
surfaced by Playwright as `page.accessibility.snapshot()`.

`scripts/verify-accessible-names.mjs` — 6 screens, 4 checks each, all passing:
every interactive node has an accessible name; visible text appears inside the
accessible name (**WCAG 2.5.3 Label in Name**); exactly one `main` and one
`h1`; every navigation landmark is named.

It **found one real 2.5.3 failure**: the shortlist control read "Shortlist (0)"
on screen and announced "Shortlist, 0 saved", so a voice-control user saying
"click Shortlist (0)" would match nothing. Corrected.

**Still open:** how the tools *behave* — see below.

---

## Genuinely still pending

### 1 · Screen-reader behaviour

| | |
|---|---|
| **Needs** | NVDA (free, Windows) or JAWS (licensed, Windows) or VoiceOver (built into macOS) — plus a person who uses one |
| **Steps** | Per journey: browse by headings through the screen; enter the main form and tab to submit; submit with an error and confirm the message is announced; open the B-15 dialog, confirm focus moves in and the dialog is named, close it with Escape and confirm focus returns; navigate a results table by row and column |
| **Expected** | Every control announces a meaningful name and role; the validation message is announced on submit without moving focus; the dialog is announced as a dialog and traps focus; table headers are announced with their cells |
| **Software setup elsewhere?** | **Partly.** NVDA is free and installs on any Windows machine, including a Windows VM. Orca is free on a Linux desktop but needs a real desktop session, which this container does not have. No install makes a screen reader usable in a headless container |
| **Who** | An accessibility tester, or any team member on Windows or macOS. Half a day for all four journeys |
| **Already covered** | Names, roles, landmark structure and 2.5.3 — by `verify-accessible-names.mjs`. What remains is behaviour, not structure |

### 2 · Windows High Contrast themes

| | |
|---|---|
| **Needs** | Windows 10 or 11 with High Contrast enabled, in the Black, White and a custom theme |
| **Steps** | Turn on each theme; open one screen per journey; confirm chips, buttons, focus rings, table borders and the console rail all remain distinguishable |
| **Expected** | Nothing carries meaning through a colour the theme replaces without also carrying a border or text |
| **Software setup elsewhere?** | **No** for the themes themselves. Chromium's emulation is already run here and covers the CSS-level failures |
| **Who** | Anyone with a Windows machine. An hour |

### 3 · Voice control

| | |
|---|---|
| **Needs** | Dragon NaturallySpeaking (Windows), Windows Voice Access, or macOS Voice Control |
| **Steps** | Say the visible label of each primary action on P-04, S-15, B-08 and A-19 and confirm it activates |
| **Expected** | Every visible label is speakable and matches its control |
| **Software setup elsewhere?** | **Partly.** Windows Voice Access and macOS Voice Control are built in — no purchase needed. Neither runs headless |
| **Who** | Any team member on Windows or macOS. An hour |
| **Already covered** | 2.5.3 Label in Name, the mechanical precondition, by `verify-accessible-names.mjs` |

### 4 · Firefox's own text-only zoom

| | |
|---|---|
| **Needs** | Firefox, with "Zoom text only" enabled |
| **Steps** | Set text-only zoom to 200% on the 16 screens `verify-zoom.mjs` covers; confirm no clipping, no overlap, no lost controls |
| **Expected** | The same result `verify-zoom.mjs` reports under its simulation |
| **Software setup elsewhere?** | **Yes, probably.** Playwright ships a Firefox build and this environment reaches the npm registry; only Chromium is installed here, and the browser download host has not been tested. On any developer machine `npx playwright install firefox` is one command |
| **Who** | Any developer. Twenty minutes. **This is the cheapest of the five** |
| **Already covered** | `verify-zoom.mjs` simulates it by doubling the root font size — the closest Chromium gets, and stated as a simulation wherever it is reported |

### 5 · Real-device rendering

| | |
|---|---|
| **Needs** | A physical iPhone and Android handset, or a device cloud (BrowserStack, Sauce Labs) |
| **Steps** | Open P-01, P-02, P-03 and one console screen per journey on iOS Safari and Android Chrome; check the mobile navigation, the B-15 editor and one form |
| **Expected** | What the 390px captures show, plus correct behaviour for on-screen keyboards, safe-area insets and momentum scrolling — none of which an emulated viewport reproduces |
| **Software setup elsewhere?** | **No.** A device cloud is a paid service; emulation is already what is being done here |
| **Who** | QA, or anyone with the two handsets. Two hours |

---

## Summary

| Check | Was | Is now |
|---|---|---|
| Forced-colors | "needs Windows" | **Run here.** Found and fixed a chip defect. Windows themes still open |
| Accessible names / 2.5.3 | "needs a screen reader" | **Run here.** Found and fixed a 2.5.3 failure. Behaviour still open |
| Screen-reader behaviour | needs AT | Still open — needs Windows or macOS and a person |
| Voice control | needs AT | Still open — built into Windows and macOS, no purchase |
| Firefox text zoom | needs Firefox | Still open — **one install command on any dev machine** |
| Real devices | needs devices | Still open — devices or a device cloud |

Three of the six need nothing but a Windows or macOS machine somebody already
owns. Only real-device testing needs something to be acquired.
