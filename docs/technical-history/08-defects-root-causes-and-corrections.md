# 8. Defects, root causes and corrections

Sixteen material defects, each with what it looked like, what actually caused it,
how it was reproduced, and what it changed about the method. Several were found
by driving a browser rather than by reading code; that is the pattern worth
extracting, and §8.17 does.

## 8.1 Enquiry writes were not idempotent, and PII travelled in a URL

**Symptom.** A repeated submission created a second enquiry. Separately, personal
information appeared in a confirmation URL.

**Cause.** No idempotency key on the write path; the confirmation route carried
identifying data as a parameter.

**Reproduced** by submitting twice and by reading the address bar — PRM-006 asked
for exactly these cases.

**Fix.** `95e59c7`. The form mints a key, the service treats it as an idempotency
key, and the confirmation is addressed by an opaque id.

**Regression.** `verify-enquiry-flow.mjs` covers repeat submission, two tabs and
two sessions; `tests/idempotency.test.mjs` covers the rule over combinations.

## 8.2 OTP behaved differently with and without JavaScript

**Symptom.** The OTP step behaved acceptably in a browser and differently with
scripting off.

**Cause.** Client-side behaviour that the server path did not reproduce.

**Fix.** Part of the enquiry hardening at `95e59c7`/`9b9bdaf`; the no-JavaScript
suite was extended to drive the path rather than assume it.

**Limitation, still true.** OTP is simulated. `verify-no-javascript.mjs` proves
the *form* works unhydrated; it proves nothing about delivery, and L1 in chapter
07 says so.

## 8.3 Account and owner screens were statically rendered

**Symptom, first occurrence.** Buyer account screens showed stale data.

**Cause.** Next collected them as static pages; per-account data was frozen at
build time.

**Fix.** `9b9bdaf` made the account screens dynamic.

**Second occurrence, 28 September.** `/owner/listings` had the same shape. It
*appeared* correct because every write calls `revalidatePath`, so nobody noticed
— until a production-mode build failed outright: the data source is resolved at
render time and there is no API client to resolve it to. Fixed at `5ecea35` with
`export const dynamic = "force-dynamic"` and a comment recording that per-account
data is not static data.

**What it taught.** A page can be wrong in a way that only shows up under a
different build mode. Passing suites in review mode did not catch it; attempting
an unrelated production build did.

## 8.4 Sample state split across bundles

**Symptom.** A review route set a Seller's balance to zero and returned 200, and
every page went on rendering the old balance.

**Cause.** Module-scope `let` is not per-process in Next. Route handlers, pages
and server actions are bundled separately, and each bundle instantiated its own
copy of the store module.

**Fix.** `2f5627e`. State moved onto `globalThis` under
`Symbol.for("kkl.sample.state")` via `processState()`.

**What it does not fix,** and the module says so: it is still one process. Two
instances, or a serverless deployment, do not share `globalThis`.

## 8.5 Incomplete reset, and a wallet that did not reconcile

**Symptom.** `resetForReview` restored the balance and cleared purchases while
retaining ledger entries, invoices, support threads and counters. Separately, the
seed ledger totalled 3,180 credits while the wallet opened at 4,200.

**Cause.** Two initialisation paths that had drifted, and a `balanceCredits`
field maintained *beside* the ledger the documentation said it was derived from.

**Reproduced** by the user, from the code, and stated with the two numbers
(PRM-008).

**Fix.** `9b6ffa9`. One fresh-state factory for both initialisation and reset;
the balance derived from the ledger so the invariant holds by construction; a
reconcile endpoint so a test can assert it rather than trust a comment.

**Regression.** `tests/ledger.test.mjs`; the flow suite run twice against one
server.

**What it taught.** A second copy of a derived value will drift. This is why a
lead order is derived from its purchase and ledger entry rather than stored
(chapter 06 §6.3).

## 8.6 Internal/public reply mode and decision controls resetting

**Symptom.** After a *refused* submission, a staff form came back with the
toggle reset and the typed text gone. In the CR02 decision form the `<select>`
reverted to its first option while the component's own state still held the
staff member's choice — so the next press recorded a decision nobody chose.

**Cause.** React 19 resets a form's DOM once its action completes. Correct for a
successful submission; wrong for a refused one. Where the mode lived in a hidden
input mirroring client state, the highlighted control and the submitted value
could disagree.

**Why it mattered more than it looked.** A staff member who selected "Internal
note", hit a validation error, retyped and pressed again would have **sent their
note to the user**. The same shape existed in the support console and CR03's
form — already-reviewed code — and in the credit adjustment, where it could have
moved money in a direction nobody picked.

**Reproduced** by driving the CR02 decision form: submit with a blank reason,
observe the refusal, then read back the select value and textarea.

**Fix.** `f74deb2`. The mode now rides on the submit button (`name="mode"`), so
the submitted value is what the pressed button said in the same render as its
label. The adjustment form's radio group became the submitted field rather than
a mirror. Owner forms echo submitted values back and re-sync from the echo.

**Regression.** `verify-owner-posting-flow.mjs` checks 25–29; CR03 and Admin
suites re-run.

## 8.7 Environment variables, and a guard test that could not fail

**Symptom.** A server started with only `KKL_ENV` refused a bundle that in fact
matched it; a server that set all four variables compared each value against
itself and could never disagree.

**Cause.** Both sides of the comparison were read through the same helper. Only
a *literal* `process.env.NEXT_PUBLIC_X` member access is substituted at build
time — a computed `process.env[name]` lookup reads the live process instead. The
build-time side was being read computed, so it was not build-time at all.

**Fix.** `66286c6`. The inlined values are read as literals and documented as
required to stay literal.

**The second half.** The deployment-guard suite "reported 8/8 from a test that
could not fail". It was replaced with a 72-combination truth table
(`tests/deployment-guard.test.mjs`) plus a shell script that builds and serves
real scenarios — the script proves the guard is *wired in*, the table proves it
is *right*.

**What it taught.** A green suite is evidence only if it can go red. Both the
implementation and its test were wrong in the same direction, which is the
failure mode that survives review.

## 8.8 Prototype width selection failed silently

**Symptom.** "Mobile" evidence that looked plausible and was captured at desktop
width.

**Cause.** `proto-width.mjs` clicked the width tab but never confirmed the stage
took it.

**Fix.** The script now measures the stage frame and **throws** if the width is
not the one requested. Affected captures were re-taken; superseded ones are
labelled rather than deleted. Closed at `4f125ec` (D-20).

## 8.9 The differ scraped the reviewer chrome

**Symptom.** Geometry differences everywhere, concentrated in page furniture.

**Cause.** The prototypes carry a round label, width tabs and a review panel. The
differ measured them as content.

**Fix.** Scoped to the emulated stage frame.

## 8.10 The differ could not see prototype headings

**Symptom.** Headings reported as agreeing when they had not been compared.

**Cause.** The element list omitted `div`, and the prototypes render headings as
styled `div`s. Every prototype heading was invisible to the tool.

**Fix.** `div` added to the element list; the affected screens re-measured.

**What it taught.** A tool reporting agreement may be reporting that it looked at
nothing. Both §8.9 and §8.10 produced *plausible* output.

## 8.11 Content-box versus border-box

**Symptom.** Systematic width differences between prototype and implementation.

**Cause.** Differing box-sizing between the exported prototype's styles and the
application's reset.

**Fix.** Normalised in the comparison and, where it was a genuine implementation
deviation, in the styles. Part of `7687105` — "Compare every screen, and fix four
shared deviations it found".

## 8.12 Shared styles overriding status-panel colours, and typography over-applying

**Symptom (a).** Status panels rendered with the wrong surface colours.
**Cause.** A shared style won over the panel's own.
**Fix.** `7687105`.

**Symptom (b).** A typography correction changed screens it should not have.
**Cause.** The correction was applied at the token level, across all call sites.
**Fix.** `b95e81e` resolved type **per context** — public section heading,
console panel heading, card title, page title — after PRM-012 warned against "a
blanket replacement across 152 call sites". The first attempt did exactly that
and was narrowed.

## 8.13 Locality search ranked the wrong match first

**Symptom.** Typing "New Town" and pressing Enter selected **Action Area I**.

**Cause.** Area labels read `"<area>, <parent>"`, so "New Town" substring-matched
its three Action Areas as well as itself. Matches were unordered, so the first
Action Area was highlighted.

**Reproduced** in a browser while verifying CR05 — the parent/child rule was
being checked, and this surfaced instead.

**Fix.** `c2ec702`. Ranked: exact label, then labels the query *starts*, then
labels that merely contain it.

**Regression.** `verify-labels-and-locations.mjs` checks 11–12, including that
choosing a parent locality replaces the child rather than keeping both.

## 8.14 Simultaneous suites resetting shared state

**Symptom.** During the 27 September audit, a submitted lead request appeared
missing from both the Admin queue and the Seller list, and a reference looked
reused.

**Cause — and this one was nearly filed as a defect that did not exist.**
`verify-lead-request-flow.mjs` was running in the background, and its `resetAll`
step (`/seller/review-state?reset=1`) had cleared the store mid-probe.

**Resolution.** Re-run in isolation, the request was visible cross-context. The
audit reported the near-miss explicitly rather than quietly dropping it.

**Standing risk.** The suites share one review-state endpoint and one process.
They must not run concurrently. This is a recommendation in chapter 04 §4.14,
not a solved problem.

## 8.15 A price typed as words vanished

**Symptom.** An owner typed "seven lakh"; the field saved blank with no message.

**Cause.** The money parser stripped non-digits, so the input became an empty
string and was stored as "not set".

**Fix.** `f74deb2`. Non-numeric input now returns `NaN` and the caller raises a
field error: "Enter the amount in figures — for example 7200000."

**What it taught.** Silently discarding input is worse than refusing it. The
person moves on believing the value is in.

## 8.16 Validation errors that rendered nothing

**Symptom.** A rejected CR03 submission looked like a submission that did
nothing — no error anywhere.

**Cause.** The backend client filed field errors under the backend's names
(`areaIds`) while the form looked up `errors.areas`.

**Fix.** `1940f11`. Names are mapped at the boundary, with a comment explaining
that the two must agree or a refusal is invisible.

## 8.17 Two withdrawn claims, and what the failures taught

Documentation was corrected twice when a claim proved unsupported:

- `748915f` — "retract an unproven cause". A record had asserted a cause the
  evidence did not support.
- `3a8645a` — "Record the Admin journey, B-15, and **the claims that were
  wrong**".
- A two-person financial approval workflow had been added without an approved
  source, and was removed under PRM-010.

Across these sixteen entries, three lessons recur and are worth stating plainly:

1. **Several defects made the product look correct.** Static rendering (§8.3),
   the split store (§8.4), the incomplete reset (§8.5) and the silent width
   failure (§8.8) all produced plausible output. Suites that assert *behaviour*
   found them; suites that assert *rendering* did not.
2. **Tests failed in the same direction as the code more than once** (§8.7,
   §8.9, §8.10). A passing check is worth what its ability to fail is worth, and
   three of this project's checks were rewritten after being found unable to.
3. **The browser found what reading did not** (§8.6, §8.13, §8.15, §8.16). Every
   one of those is invisible in a diff and obvious within thirty seconds of
   driving the screen.
