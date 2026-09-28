# CR06-a — complete · CR06-b — in progress

**Answer received:** project owner, 28 September 2026, as an attached image.

`type-1-reference.jpg` is that image. Its own chrome identifies it: *"ROUND 3 ·
Kam Ki Lead — responsive portal homepage · Prototype · fit to window, 1209px ·
synthetic listings, stock photography"* — the kkl-design prototype viewer.

**So "Type 1" is the homepage that was already approved and already built.**
**CR06-a is complete: no redesign required.** `implemented-homepage-1209.png` is this build
captured at the same 1209px width for comparison.

## What matches

Everything structural, and the copy word for word.

| | Type 1 | This build |
|---|---|---|
| Header | `K Kam Ki Lead ◉ Kolkata ▾ Buy Projects New launches Find my match ♡ Shortlist (0) List a project Sign in` | identical |
| Hero eyebrow / title | FEATURED PROJECT · Ivy Court, Action Area I | identical |
| Hero body | "3 BHK apartments of 1,320–1,690 sq ft, new launch, possession Jun 2029." | identical |
| Hero price / action | ₹1.05Cr – ₹1.6Cr · View project (saffron) | identical |
| Search card | Buy tab with saffron underline; Location, Property type, BHK, Budget; blue search button; "Results update as you change a field" | identical |

The header's right-hand actions are worth one note: they are absent from the
server-rendered HTML and appear once the page hydrates, because the header sits
behind a Suspense boundary (it reads the query string to mark the active nav
item). A `curl` of the page therefore looks as though they are missing. They are
not — the browser capture shows them.

## What differs, and why none of it is a design divergence

| Difference | Type 1 | This build | What it is |
|---|---|---|---|
| Hero and card photography | Stock photographs | Flat gradient, "photograph pending" placeholders | The known imagery dependency (E-P3). The prototype's own chrome says "stock photography"; no licence has been settled, so none is used here |
| Search button count | "Search 128 properties" | "Search 8 properties" | Sample-data volume. The prototype carries 128 synthetic listings, this build carries 8 |
| Review banner | absent | "SAMPLE DATA — synthetic content…" strip above the header | A review-build artifact, correctly absent from a design |

## CR06-b — in progress, awaiting the file

**Colour verification has not started.** It needs the **authoritative logo
file**, which is awaited from the client.

Until it arrives: the **current palette is retained unchanged**, and the
**accessibility corrections are retained** (E-P2a's focus-ring companion edge,
E-P2b's darkened control border). Sampling colours from this screenshot is not a
substitute and will not be done — it is a lossy JPEG of a rendered page, and a
hex value read from it would be a guess presented as a measurement.

## One thing to confirm, not assume — tracked separately from CR06-b

Type 1's search card shows **Location = "New Town, Kolkata"** and **Budget =
"Up to ₹1.5Cr"**. This build shows **"All of Kolkata"** and **"Any budget"**.

**"All of Kolkata" and "Any budget" are preserved and stay that way unless you
instruct otherwise.** I have not changed anything on the strength of that. A screenshot of a
prototype is usually posed — somebody set those values to make the shot show a
result count — and pre-filling a buyer's search with a locality and a budget
they did not choose would be a real product decision, not a styling one. If
those are intended defaults rather than a posed state, say so and they become a
one-line change.
