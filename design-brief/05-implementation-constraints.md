# Implementation Constraints

What the agreed architecture means for the design. These are constraints on the *design*, not a
handover spec — the full architecture lives in the `kkl-backend` repository
(`docs/architecture.md`).

## Three repositories

| Repository | Role |
|---|---|
| **kkl-web** | Next.js, React, TypeScript, Tailwind. The public portal plus Buyer, Seller, Builder and Admin interfaces. Shared components and design tokens live here. No database access, no authoritative business logic. |
| **kkl-backend** | Node.js/TypeScript REST API, PostgreSQL/Supabase, Redis workers. Owns all business state and every third-party integration. |
| **kkl-voice** | Persistent voice/media service for the AI qualification calls. No consumer-facing screens. |

The design only needs to produce work for **kkl-web**. But the split has real design consequences,
below.

## 1. Every screen is server-data-dependent

kkl-web holds no data of its own. Every list, card, balance and status is fetched from the backend
over the network.

- **Loading, empty and error states are not edge cases — they are part of every screen.** Design
  them as first-class states in the system, not as a separate page of examples.
- Skeletons should match the shape of the content they replace, since layouts shift otherwise.
- Nothing can be optimistically shown as true before the server confirms it — particularly
  anything involving money or lead ownership.

## 2. Authorization is enforced server-side, and the UI must show it

Hiding a nav link is not access control. The backend will reject an unauthorized request
regardless of what the UI offers, and users *will* land on URLs they cannot access — from an old
bookmark, a shared link, a lapsed subscription, or a pending KYC.

**Designed access-denied states are required**, at minimum for:

- A Buyer reaching any marketplace URL — the hard product boundary.
- A Seller/Builder whose KYC is still pending or was rejected.
- A Builder whose subscription is inactive reaching listing management.
- A suspended account.

These should be helpful and route the user somewhere useful, not dead-end error pages.

## 3. Masked data arrives already masked

Pre-purchase lead contact details are **not sent to the browser at all** — the server omits them.

- ❌ Do not design masking as a CSS blur or overlay on real text. That implies the data is present
  and merely hidden, which is both a security-theatre pattern and an inaccurate representation.
- ✅ Design the masked state as its own content treatment — a placeholder shape, a lock affordance,
  a partial value the server actually sends (e.g. a city without a phone number).
- The same applies to the unresolved builder enquiry reveal (see `04-confirmed-vs-unresolved.md`
  §B4) — masked and revealed are two server-side states, not one state with a filter over it.

## 4. One token system, two visual registers

All five surfaces (public portal, Buyer, Seller, Builder, Admin) are built from one shared
component library and one set of design tokens in kkl-web. The system must therefore be able to
express both an open, editorial consumer experience and a dense, efficient dashboard **without
forking into two design systems**. Density, type scale and spacing tokens are the likely levers.

## 5. Tailwind-expressible

The implementation is Tailwind CSS. A design system defined as tokens — colour scales, a spacing
scale, a type scale, radii, shadows — ports cleanly. Bespoke per-screen values and one-off
treatments do not, and tend to be dropped in build.

## 6. Builder-uploaded media is uncontrolled

Project images and videos are uploaded by builders. Expect inconsistent aspect ratios, poor
lighting, watermarks, portrait phone photos, and listings with no image at all.

- Define aspect-ratio handling and cropping rules for cards and galleries.
- Design a genuine no-image fallback — the public portal must not look broken when a builder
  uploads nothing.
- The property detail gallery needs to survive both one image and twenty.

## 7. Payments are gateway-hosted

Card details are never collected in KKL's own UI — payment happens in the Razorpay flow. Design
the *approach* and *return* moments (initiating a recharge, pending confirmation, success,
failure), not a card form.

Payment confirmation is server-verified: a design must not imply credits are available the instant
the browser returns from the gateway. A pending/confirming state is needed.

## 8. Out of scope — do not design

360° property walkthroughs · native mobile apps · the BDRPL bulk-allocation corporate portal.

## 9. Accessibility

Baseline accessibility is a contractual requirement: sufficient colour contrast, visible focus
states, real form labels, and touch targets sized for mobile. Worth setting in the token system
from the start rather than retrofitting.
