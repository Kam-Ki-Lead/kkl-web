# kkl-web

Kaam Ki Lead (KKL) — public property portal plus Buyer, Seller, Builder, and Admin interfaces.
Next.js, React, TypeScript, Tailwind. Shared components and design tokens live here.

**This repository holds no database access and no authoritative wallet/business logic.** Every
data read/write goes through kkl-backend's versioned REST API. See `kkl-backend`'s
`docs/architecture.md` (canonical, cross-service architecture) for why.

## Status

This repository currently contains **design and prototype artifacts only** — no production
frontend code yet. Per the delivery plan, production implementation (Next.js app, live API
integration) begins only after the client approves the prototype in writing. See
`docs/design/` and the top-level `PROTOTYPE.md`.

## What's here

```
docs/
  design/
    sitemap.md       Full site map, public portal prioritized in navigation
    screens.md        Screen inventory: built vs. needed for full sign-off
    journeys.md        Walkthrough scripts through the clickable prototype
    prototype/          Static HTML/CSS clickable prototype (synthetic data, disposable)
```

Canonical requirements, access matrix, demo assessment, architecture, and decisions/open
questions live in `kkl-backend/docs/` and are not duplicated here — see the links below.

## Ownership boundaries

- Owns: UI/UX, component library, design tokens, client-side routing, presentation-layer
  validation (mirroring, never replacing, server-side validation).
- Does not own: authentication/session issuance (consumes it), authorization decisions (defers to
  kkl-backend on every request — a hidden nav link is not access control), business rules
  (pricing, credit ledger, KYC state machine, lead lifecycle), or any direct database/queue/
  third-party-provider access.
- Contract: consumes kkl-backend's versioned OpenAPI spec; generates its TypeScript client types
  from that spec rather than hand-maintaining duplicate types (`kkl-backend/docs/architecture.md`
  §7).

## Contribution guidance

- Production frontend work (Phase 2) does not start until Phase 1's prototype is approved — see
  `kkl-backend/docs/delivery-plan.md`.
- Any screen not yet in `docs/design/screens.md`'s "Built" list needs a design pass before
  frontend implementation, not an implementation-time improvisation.
- Never call a third-party provider (Razorpay, WhatsApp, etc.) directly from this repo — always
  through kkl-backend.
- Never hardcode role-based UI decisions as the only access control — always assume kkl-backend
  will reject an unauthorized request server-side, and design the UI to handle that rejection
  gracefully (see `docs/design/prototype/states.html` for the access-denied pattern).

## Links

- [Requirements matrix](https://github.com/Kam-Ki-Lead/kkl-backend/blob/main/docs/requirements.md)
- [Access matrix](https://github.com/Kam-Ki-Lead/kkl-backend/blob/main/docs/access-matrix.md)
- [Demo assessment](https://github.com/Kam-Ki-Lead/kkl-backend/blob/main/docs/demo-assessment.md)
- [Architecture](https://github.com/Kam-Ki-Lead/kkl-backend/blob/main/docs/architecture.md)
- [Decisions & open questions](https://github.com/Kam-Ki-Lead/kkl-backend/blob/main/docs/decisions-and-open-questions.md)
- [Delivery plan](https://github.com/Kam-Ki-Lead/kkl-backend/blob/main/docs/delivery-plan.md)
- [Acceptance plan](https://github.com/Kam-Ki-Lead/kkl-backend/blob/main/docs/acceptance-plan.md)
