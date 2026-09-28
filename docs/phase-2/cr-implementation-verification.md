# CR01–CR07 implementation pass — what was checked, and how

Run 27 September 2026 against the commits listed below, on a **production build
served by `next start`** — not the dev server — with the documented
configuration. Every figure here came from a command whose output is reproducible
by running it again.

## The build under test

```sh
# kkl-web
NEXT_PUBLIC_KKL_ENV=review NEXT_PUBLIC_KKL_DATA_SOURCE=sample npx next build
KKL_ENV=review KKL_DATA_SOURCE=sample npx next start -p 3811

# and, for the CR03 persistence run, kkl-backend underneath it
DATABASE_URL='postgres://kkl_app@127.0.0.1:5433/kkl' \
KKL_DEV_AUTH_SECRET=local-review-secret PORT=4010 npm start
# with kkl-web additionally given
#   KKL_LEAD_REQUESTS=backend
#   KKL_LEAD_REQUESTS_BASE_URL=http://127.0.0.1:4010
#   KKL_LEAD_REQUESTS_DEV_SECRET=local-review-secret
```

## Results

| Suite | Result | What it establishes |
|---|---|---|
| `verify-labels-and-locations.mjs` | **23/23** | CR01's three-way label distinction by where each label links; CR05 on all six location surfaces, record ids in URLs, parent replacing child, ranked locality search, unmatched locality honest |
| `verify-owner-posting-flow.mjs` | **31/31** | CR02 end to end: start, partial save, refused bad value, locality, photographs disclosed as not stored, preview, single submission, confirmation that claims a review and not a publication, not-editable state, Admin queue, internal-note boundary in the markup, decision with reason, re-edit, cleared ≠ published, nothing reaching the portal, 404 on an unknown id |
| `verify-lead-order-flow.mjs` | **20/20** | CR04: masking before purchase (no phone-shaped string in the HTML), review, wallet checkout with no gateway named, result, a genuine replay of one idempotency key across two tabs reported as a repeat and filing no second order, My purchases, order detail, ledger reference, invoice state, no refund control, cross-pool 404 |
| `verify-verification-policy.mjs` | **22/22** | CR07: not-required ≠ verified, no case from registering, split queue, provider outage producing a review case and no pass, failed ≠ approved, reason-gated decision in history and audit, purchase restriction retained, outcomes unchanged by suspension. Since 28 September also: the lead-request decision renders as a product decision with its attribution, every mention of law or compliance on the screen is a disclaimer rather than a claim, and no other action moved |
| `verify-lead-request-persistence.mjs` | **9/9** | CR03 is actually stored: a request filed through the browser survives kkl-backend being killed and restarted, with its status and history; a second account gets 404 by id and nothing in its list; no session at all gets 401 |
| `verify-lead-request-flow.mjs` | **15/15** | CR03's journey, run against **both** stores |
| `kkl-backend` `npm test` | **19/19** | REST surface, RLS enforced past the handlers, identity not leaking across a pooled connection, durability across a `SIGKILL` |
| `verify-seller-flow.mjs` | **26/26** + 2 documented limitations | Seller regression |
| `verify-builder-flow.mjs` | **48/48** + 3 documented limitations | Builder regression |
| `verify-admin-flow.mjs` | **36/36** + 3 documented limitations | Admin regression |
| `verify-enquiry-flow.mjs` | **17/17** | Buyer enquiry regression |
| `verify-route-sweep.mjs` | **268/268** (134 routes × 2 widths) | Every route including the 19 new CR screens, at 1440px and 390px: 200, no page error, no console error, no failed sub-resource, no horizontal overflow |
| `node --test "tests/*.test.mjs"` | **27/27** | Rules over every combination, not only the walked paths |
| `tsc --noEmit`, `eslint` | clean | — |

Desktop and mobile usability for the new screens is covered by the route
sweep's second width: 390px with a horizontal-overflow assertion, which is the
responsive failure a fixed-width screenshot hides.

## Defects found by these runs and fixed in this pass

Each of these was found by driving a browser, not by reading code.

1. **A staff note could have been sent to the user.** React 19 resets a form's
   DOM once its action completes. Where the internal/public mode lived in a
   hidden input mirroring client state, a refused submission left the
   highlighted toggle and the submitted value able to disagree — so a staff
   member who chose "Internal note", hit a validation error, retyped and pressed
   again would have posted their note publicly. This affected the support
   console's reply form and CR03's as well as CR02's. The mode now rides on the
   submit button, so the value submitted is what the pressed button said in the
   same render as its label.
2. **A decision nobody chose could be recorded.** The same reset returned a
   `<select>` to its first option while the component's state still held the
   staff member's choice. Found on CR02's decision form; the affected forms now
   re-sync from the action's echo, and the credit adjustment's radio group is the
   submitted field rather than a mirror, so a refusal cannot move money in a
   direction nobody picked.
3. **A locality search selected the wrong area.** Labels read "&lt;area&gt;,
   &lt;parent&gt;", so "New Town" matched its three Action Areas as well as
   itself, unordered — typing a locality's own name and pressing Enter selected
   Action Area I. Matches are now ranked.
4. **A price typed as words vanished silently.** The owner form stripped
   non-digits, so "seven lakh" became blank and saved. It is now refused with a
   field message.
5. **A concurrent-query deprecation in kkl-backend.** The list read issued two
   queries per row against one `pg` client, which is deprecated and stops
   working in pg 9. It is now two queries per page.
6. **A stale cross-reference.** The sample lead-request store cited
   `service-contract.md` §2.11 (Locations) for its own §2.12.

## Two things I nearly filed as defects and did not

Recorded because a wrong defect costs as much as a missed one.

- **Two `name="area"` fields on the marketplace.** The second belongs to the
  sort form, which carries the filters forward so sorting does not lose them.
  Correct, and deliberate.
- **The seeded owner listing's step pages are not editable.** That listing is
  with the review team, and refusing to edit it is the intended behaviour — the
  page says so and offers withdraw.

## What a green run here does not establish

- **Client acceptance.** Four decisions were given in writing and are recorded
  in `decisions-received.md`; they authorize specific workflows and nothing
  wider. A green suite is not acceptance of anything.
- **Durability for anything but CR03.** Owner listings, orders and verification
  cases are process memory and are labelled as such on screen.
- **Authentication.** CR03's persistence and RLS runs establish that a *given*
  identity is confined correctly and durably. They say nothing about how that
  identity was obtained — today a development authenticator issues one on
  request. See `cr03-authentication-boundary.md`.
- **Any compliance position.** No verification provider is selected, no identity
  document is collected, and no check here is claimed to satisfy a legal
  requirement.
- **Visual approval of the new CR screens.** They are in `inventory.json` with
  their states, and the route sweep proves they render cleanly at both widths.
  Nobody has approved how they look.
