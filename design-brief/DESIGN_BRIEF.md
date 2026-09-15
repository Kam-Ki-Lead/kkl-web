# Kam Ki Lead — Design Brief

**For:** Claude Design · **Stage:** Phase 1 revision (design not approved) · **Date:** 15 Sep 2026

Kam Ki Lead (KKL) is a Kolkata real-estate platform with two distinct sides: a **public property
portal** where homebuyers discover projects and enquire, and a **lead marketplace** where verified
brokers and builders buy qualified buyer leads with credits. An AI voice-qualification layer feeds
the marketplace. The public portal is the primary consumer experience and the first thing to get
right — it is not a marketing wrapper around the marketplace.

## What we need from this engagement

1. **Brand identity** — name treatment, logo, and a distinct visual identity for "Kam Ki Lead."
   None exists today beyond a placeholder wordmark.
2. **Visual direction** — a clean, light design language that reads as trustworthy and
   consumer-grade, covering a public portal and four authenticated role surfaces as one system.
3. **Revised prototype** — the screens in `03-sitemap-screens-journeys.md`, at a quality that can
   carry a client sign-off.

The workflows, screens, and journeys are settled and documented here. **What is being redesigned
is the identity and visual/interaction quality, not the product logic.**

## The previous attempt was rejected

A first prototype was built to inventory workflows. Its screens and flows are a useful reference;
its visual and interaction design was rejected and **must not be used as a style starting point.**
See `06-rejected-visual-direction.md` for screenshots and a candid list of what failed. Treat it
as a functional spec in visual form, not as a design to polish.

## Reading order

| Document | What it covers |
|---|---|
| `01-product-and-audiences.md` | What KKL is, who uses it, what each audience needs |
| `02-requirements-and-access.md` | Confirmed product requirements and the role/permission matrix |
| `03-sitemap-screens-journeys.md` | Sitemap, screen inventory, and the journeys to prototype |
| `04-confirmed-vs-unresolved.md` | **Read before designing any commercial screen** — what is settled vs. what is still an open client decision |
| `05-implementation-constraints.md` | Three-repository architecture constraints that shape the design |
| `06-rejected-visual-direction.md` | Screenshots of the rejected prototype and why it failed |
| `screenshots/` | 15 screens × desktop and mobile |

## Design principles to work to

- **Consumer-first on the public side.** A homebuyer browsing New Town should meet something that
  feels like a well-made consumer product, not a B2B dashboard with a search bar bolted on.
- **Two products, one identity.** The public portal and the Seller/Builder/Admin surfaces share a
  brand and a token system, but the public side should feel open and editorial while the
  authenticated surfaces feel dense, efficient, and data-forward. They should not look like the
  same template stretched over different content.
- **Clean and light.** This is a requirement from the signed proposal, not a preference.
- **Photography carries the public portal.** Property discovery lives or dies on imagery. Design
  for real project photos of uneven quality and aspect ratio — including the case where a builder
  uploads nothing.
- **99acres is a functional reference only.** Use it for information hierarchy, search patterns,
  and discovery conventions Indian homebuyers already understand. Do not borrow its branding,
  colour, typography, or assets. KKL should not look like a 99acres clone.
- **Mobile is where Indian property search happens.** Treat mobile as a designed experience, not
  a reflow of desktop.

## Hard constraints

- **Do not state unconfirmed commercial rules as fact.** Subscription prices, credit expiry
  periods, contact-unlock rules, and verification turnaround promises are **not settled**. Where
  a screen needs one, use a visible placeholder and flag it. `04-confirmed-vs-unresolved.md` is
  the authority on this and exists specifically to prevent a design decision from silently
  becoming a business commitment.
- **Access control is enforced by the server, not the UI.** Every authenticated surface needs a
  designed access-denied state, not just a hidden nav item.
- **Out of scope:** 360° walkthroughs, native mobile apps, and the BDRPL bulk-allocation corporate
  portal. Do not design for them.

## Deliverables we expect back

- Logo and brand identity (wordmark, mark, colour, type).
- A documented design system: colour, typography, spacing, buttons, cards, forms, states.
- High-fidelity designs for the screens marked **Priority 1** and **Priority 2** in
  `03-sitemap-screens-journeys.md`.
- A navigable prototype covering the six journeys in the same document.
- Mobile layouts for the public portal screens at minimum.
