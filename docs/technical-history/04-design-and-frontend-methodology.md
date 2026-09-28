# 4. Design and frontend methodology

How the work was actually done, with the examples that produced each practice.
§4.14 separates what was *done* from what is *recommended*.

## 4.1 Requirement extraction and ambiguity tracking

Two PDFs and a demo went in; requirements, an access matrix and a **decision
register** came out. The register is the load-bearing part: eighteen decisions
(D-01…D-18) that nobody had made, recorded as open rather than guessed.

PRM-002 set the rule — "Do not bake unconfirmed subscription prices, credit
expiry rules, contact unlock rules, or verification promises into the design
brief as facts" — and it was made structural rather than editorial.
`src/lib/config/business-rules.ts` holds the pending copy; screens *render* it.
So an unresolved rule appears on screen as unresolved, and a reviewer seeing a
disabled control or a missing figure is seeing a decision, not a bug.

Worked example: D-01 (subscription price) means `BuilderSubscription.priceInr`
is typed `number | null` and is null everywhere. There is no figure to show
because none was agreed, and the type makes inventing one awkward.

## 4.2 Mapping requirements to screens and states

Every screen has an inventory ID — `P-` public/Buyer, `S-` Seller, `B-` Builder,
`A-` Admin, `C-` shared components, and later `CR02-`, `CR04-`, `CR07-`. Each
row carries its **states**, not just its route:

> `P-01 · Homepage · / · Default, guest, signed-in, mobile menu open`

This is why an inventory row is not a route, and why the counts differ (§5.8).
`build-coverage-matrix.mjs` generates `coverage.md` from the screen map and the
baseline, so coverage is derived rather than asserted.

## 4.3 Preserving an approved baseline

`kkl-design` is a separate repository at a fixed commit, never modified. Every
deviation is an **exception with an ID** (E-P1, E-P2a, E-P2b, E-P3), each stating
what changed, why, the evidence, and who decides. Two accessibility corrections
sit in that list rather than being applied silently:

- **E-P2a** focus indicator gains a 1 px ink companion edge inside the unchanged
  saffron ring: 2.11:1 → 17.63:1 on white.
- **E-P2b** control border darkened `#C6CCE0` → `#8A8E9C`: 1.60:1 → 3.27:1.

Both are applied and reversible in one line. What is open is sign-off, not code.
E-P5 and E-P6 went the other way — the owner reclassified them as corrections
*to* the baseline, and B-02 and B-07 were restored to the approved design at
`b9e7e53`.

## 4.4 Translating exported prototypes into application code

The `.dc.html` exports were read as *source*, not as pictures. Colour values,
type sizes, weights and spacing were extracted from the markup and became tokens
— which is what allows `verify-design-tokens.mjs` to compare the implementation
against the design's own values rather than a second hand-written list.

Two traps, both hit:

1. **Reviewer chrome is not the design.** The prototypes carry a round label,
   width tabs and a review-notes panel. The first geometry differ scraped them as
   though they were content; it was scoped to the emulated stage frame.
2. **Prototypes render headings as styled `div`s.** The differ's element list
   omitted `div`, so every prototype heading was invisible to it and the tool
   reported agreement it had not checked.

Both are in chapter 08. Both were found by inspecting output that looked fine.

## 4.5 Reuse without flattening role-specific behaviour

`ConsoleShell` serves all three consoles by parameter. `OrderList`/`OrderDetail`
serve both marketplaces, with paths injected (`SELLER_ORDER_PATHS`,
`BUILDER_ORDER_PATHS`) so a Builder screen cannot link a Seller into the wrong
console.

Where reuse would have asserted something false, it was refused. CR02's
`OwnerListing` is its own type rather than the Builder's `ListingDraft`, because
that type is a *project* — total units, RERA registration, a price range — and
reusing it would have made an individual owner a subscriber in the data whatever
the screens said. The type also has no `published` state, because whether an
owner's listing ever publishes is undecided and the state would have settled it
by implication.

The owner journey does reuse the Builder editor's unsaved-changes machinery
(`UnsavedChangesProvider`, `SaveDraftButton`, `UnsavedBadge`) — generic
behaviour the client has already reviewed once, imported rather than rebuilt.

## 4.6 Typed service boundaries and deterministic fixtures

`src/lib/services/contracts.ts` defines every service. `getServices()` resolves
one implementation from configuration, **with no fallback**:

> "There is no fallback. If the deployment asks for the real API, it gets the
> real API or it fails — sample data never stands in for an unreachable backend,
> because a simulated purchase or contact reveal presented as real is worse than
> an outage."

Fixtures are deterministic and seeded, so a suite asserting "this record was not
here before" works on its second run. Masking is **absence, not concealment**:
`MarketplaceLeadDetail` has no contact fields at all; only `PurchasedLead` does.
A CSS blur can be removed by a reader; a missing field cannot.

## 4.7 Progressive enhancement

`verify-no-javascript.mjs` (500 lines) drives the product with scripting off.
Every form posts to a server action and works unhydrated. Where behaviour
genuinely requires JavaScript — the B-15 exit dialog, the reload warning, the
dirty badge — the screens say so in a `<noscript>` rather than implying
otherwise:

> "Without JavaScript there is no unsaved-changes warning. Moving between
> sections with the buttons above saves as you go."

The CR02 photographs step does the same: with scripting off the file picker
cannot list what was chosen, so a `<noscript>` textarea collects the names and
explains why.

## 4.8 Validation and preserving what someone typed

Validation errors are returned as field-keyed maps and rendered beside the
field. Two rules learned the hard way:

**Field names must match the form's.** The CR03 backend client filed errors
under its own names (`areaIds`) while the form looked up `errors.areas`. A
rejected submission rendered *nothing at all* — it looked like a submission that
did nothing. Found in a browser, fixed by mapping names at the boundary.

**Absence is allowed; a wrong value is not.** An owner can save a step with most
of it empty, because filling in what you know first is the normal case. But a
price typed as words used to be stripped to nothing and saved as blank — quieter
than refusing it, and worse. It is now a field error.

React 19 resets a form's DOM after an action completes. That is right for a
successful submission and wrong for a refused one, so refused actions echo the
submitted values back and the controls re-sync from the echo (chapter 08 §8.6).

## 4.9 Idempotency

Every write that could be replayed carries a key minted by the page that renders
the form: enquiries, lead purchases, lead requests, owner drafts and owner
submissions. Replay returns what the first call produced.

The distinction that matters: **two visits to a form are two intentions, not a
replay.** A second deliberate purchase of the same lead is refused because the
lead is sold, not because a key matched. Testing this honestly meant copying one
tab's key into a second tab — two visits would have minted two keys and proved
nothing.

CR04 added the missing half: a replay now *says* it was a replay. The guarantee
was already working; the buyer just had no way to know they had not been charged
twice.

## 4.10 Cross-role consistency

Sample stores are wired to each other where the product joins them: a Buyer
enquiry appears in the Builder's console; a Seller's lead request appears in the
Admin queue; an Admin decision appears on the Seller's own view.

Review resets are correspondingly transitive. `sampleReviewControls.reset()`
resets Seller, Admin, lead requests, owner listings and verification together,
because resetting one and not the other leaves two views disagreeing — which is
exactly what the Admin console exists to make impossible.

## 4.11 Responsive styling and typography

Two widths in every sweep: 1440 px and 390 px, with a horizontal-overflow
assertion at both — the responsive failure a fixed-width screenshot hides.

Typography was resolved **per context**, not per token. Where an approved screen
renders a different size from the generic library, the screen wins, and the
precedence is documented as semantic styles: public section heading, console
panel heading, card title, page title. PRM-012 warned against "a blanket
replacement across 152 call sites"; the first attempt over-applied anyway and had
to be narrowed (chapter 08 §8.12).

## 4.12 Visual capture, comparison, and evidence versioning

The rule that keeps chapter 07 honest: **every capture is labelled with the
commit it was taken at, and a refresh does not silently replace an older
capture** — the older is kept and labelled. `e-p3-attribution-b95e81e.png` still
exists beside `e-p3-attribution-b9e7e53.png` for exactly that reason.

Comparison evolved under pressure. Screenshot pairs alone let a differ report
agreement it had not checked, so `verify-screen-geometry.mjs` measures both
DOMs; and `proto-width.mjs` was made to *assert* that the prototype's stage took
the requested width, after a silent failure produced desktop-width "mobile"
evidence (D-20, chapter 08 §8.11).

## 4.13 Focused commits and branch continuity

Commit messages state the problem, not the patch. The pattern across 57 commits
is implement → verify → record, with the record commit often naming what was
wrong: *"Record the Admin journey, B-15, and the claims that were wrong"*,
*"Correct the Phase 2 records: separate the status dimensions, retract an
unproven cause"*.

Branch continuity held across the agent handover: one branch,
`claude/phase-2-frontend`, fetched and verified rather than assumed (PRM-014).
The backend slice took its own branch, `claude/cr03-lead-requests`, because it
is a different repository and a different review.

## 4.14 Recorded methodology versus recommendations

Everything above was *done*. The following are **recommendations**, not practice,
and nothing in this package claims otherwise:

- Generate `inventory.json` from the design export rather than maintaining it
  alongside, so the count cannot drift from the screens.
- Run the browser suites in CI on a fixed Chromium, with the reset endpoint
  forced serial — the concurrency fault in chapter 08 §8.14 is a standing risk.
- Move the four sample stores that are not CR03 behind the same durable pattern
  when their backend domains exist, rather than one at a time.
- Replace the development authenticator with the OTP flow before any deployment
  that is not a review build.
