# Rejected Visual Direction

**Status: REJECTED. Reference only — do not use as a visual starting point.**

The screenshots in `screenshots/` show a prototype built to inventory workflows and prove the
screen set. The client has **not approved it** and has asked for the identity, visual direction
and interaction design to be developed fresh.

## How to use these screenshots

✅ **Use them for:** what content sits on each screen, what a user can do there, what states
exist, and how the journeys connect.

❌ **Do not use them for:** colour, typography, logo, layout, component styling, spacing,
interaction patterns, or copy tone. And do not carry across any of the invented commercial
figures in them — see `04-confirmed-vs-unresolved.md`.

## Why it was rejected

An honest assessment of the work being replaced:

1. **No brand identity.** The "K" square and a green wordmark are a placeholder, not an identity.
   Nothing in the design says *Kam Ki Lead* rather than any other property site. Establishing this
   is the core of the new engagement.
2. **One flat template stretched across five very different surfaces.** The consumer homepage, the
   broker marketplace and the admin queue all use the same card, the same spacing and the same
   register. The result is that the public portal — the primary consumer experience — reads like
   an internal tool.
3. **Property imagery treated as an afterthought.** Grey placeholder blocks labelled "Project
   photo" sit where the emotional core of a property portal should be. Discovery is a visual
   experience and the layout never commits to that. The gallery, card and hero treatments all need
   to be designed around real photography.
4. **Weak hierarchy.** On the property cards, price, project name, location and metadata are
   nearly the same visual weight. Nothing guides the eye. The marketplace lead cards have the same
   problem: a broker cannot assess a lead's worth at a glance, which is the entire job of that
   screen.
5. **Generic, unconsidered colour.** A single mid-green applied uniformly with no supporting
   palette, no accent system, and no semantic colour logic beyond a few status pills.
6. **Masking done as a CSS blur over real text** on the marketplace screen. Besides misrepresenting
   how the system actually works (the server never sends those values — see
   `05-implementation-constraints.md` §3), it looks like a bug rather than a deliberate
   pre-purchase state.
7. **States bolted on rather than designed in.** Loading, empty, error and access-denied live on
   one separate demo page instead of being part of the system.
8. **Mobile is reflow, not design.** Layouts collapse to a single column at breakpoints. The hero
   search with four inputs, the filter panel, and the gallery all need real mobile thinking — this
   is the primary context for Indian property search.
9. **Interaction design is essentially absent.** Every action is a static link to the next page.
   There is no considered thinking about the enquiry conversion moment, the purchase confirmation,
   filter interaction, or the multi-step requirement capture.
10. **Copy is placeholder-grade.** Tone was never designed. For a category where trust is the main
    barrier, voice matters.

## Screenshot index

15 screens, each captured at desktop (1440px) and mobile (390px):
`<screen>--desktop.png` and `<screen>--mobile.png`.

### Public property portal — the primary consumer experience

| File | Screen |
|---|---|
| `index` | Homepage — hero search, featured projects, browse by location |
| `search` | Search results — filter panel, sort, property cards |
| `property-detail` | Property detail — gallery, specs, amenities, enquiry form |
| `requirement-capture` | Buyer requirement capture |
| `matches` | Matched properties |

### Buyer

| File | Screen |
|---|---|
| `buyer-register` | Mobile OTP registration and verification |
| `buyer-account` | My enquiries — tracking |

### Seller

| File | Screen |
|---|---|
| `seller-kyc` | KYC submission and status |
| `seller-marketplace` | Lead marketplace with masked previews |
| `seller-wallet` | Billing and credits |

### Builder

| File | Screen |
|---|---|
| `builder-subscription` | Subscription activation |
| `builder-properties` | Property management and new-listing form |
| `builder-enquiries` | Buyer enquiries on own listings |

### Admin

| File | Screen |
|---|---|
| `admin-kyc` | KYC verification queue |

### System

| File | Screen |
|---|---|
| `states` | Loading, empty, error and access-denied patterns |

## Note on figures visible in the screenshots

Several screens show specific amounts — a monthly subscription price, per-lead prices, credit
balances, recharge denominations, a credit expiry period, and a verification turnaround. **None of
these came from the client.** They were invented to make the prototype navigable.
`04-confirmed-vs-unresolved.md` lists each one and what to do instead.

## Where the original prototype lives

Preserved unchanged in this repository at `docs/design/prototype/` (open `index.html`, or
`screens.html` for the screen index). It is retained as a workflow reference and is not being
edited further.
