# Product Overview & Audiences

## What Kam Ki Lead is

Two connected products under one brand:

**1. A public property portal.** Homebuyers search projects in Kolkata — primarily New Town and
surrounding areas — filter by location, property type, configuration and budget, view project
detail pages, and submit enquiries or site-visit requests. Free, no KYC, mobile-OTP account.

**2. A lead marketplace.** Verified brokers ("Sellers") and builders buy qualified buyer leads
using platform credits. Leads arrive from marketing channels, are qualified (increasingly by an
automated voice/WhatsApp layer), scored for intent, and listed with contact details masked until
purchase. One lead sells to exactly one purchaser.

Builders sit across both: they list projects on the public portal and receive enquiries on their
own listings, and they can additionally buy marketplace leads with the same credit system Sellers
use.

An AI voice-qualification layer (Exotel telephony + Sarvam speech + an LLM conversation) calls
incoming leads, runs a structured qualification conversation, captures consent, and scores intent.
**This is backend and voice-service work with no consumer-facing screens** — it surfaces in the
design only as admin monitoring views and as the quality signals (intent score, qualification
fields) shown on marketplace lead cards.

## Audiences

### Homebuyer ("Buyer") — the primary consumer audience

Someone searching for a flat in Kolkata, most often on a phone, often comparing several projects
over weeks. Registers free with a mobile number and OTP. May never log in at all before enquiring.

- Needs: fast, trustworthy discovery; real photos; honest pricing and possession dates; a low-
  friction way to enquire; a place to see what they've already enquired about.
- Emotional context: this is the largest purchase of their life and the category is full of
  brokers they don't trust. The design has to earn credibility quickly.
- **Never sees the lead marketplace or any seller data.** This is a hard permission boundary.

### Seller / broker — the paying marketplace audience

An independent property broker or small agency. Completes PAN + Aadhaar KYC, waits for admin
approval, then browses masked leads, recharges credits, buys leads, and downloads contact details.

- Needs: to judge a lead's worth *before* paying — location, budget band, configuration, intent
  quality, freshness; clear credit balance and spend history; fast repeat purchasing.
- Works in volume. Density and speed matter more than whitespace here.
- Lives on desktop more than the buyer does, but mobile access matters for acting on a lead fast.

### Builder / developer — lists projects and buys leads

A developer with one or more projects. Same KYC as a Seller, plus a monthly subscription that
activates property listing. Manages listings and media, receives enquiries on their own projects,
and optionally buys marketplace leads.

- Needs: to present projects well on the public portal (this is their shopfront), to manage
  listing media and status, and to act on incoming enquiries quickly.
- The property-management screens are the most content-heavy authoring surface in the product.

### Administrator — internal operations

KKL staff. Accounts are created internally; there is no public admin signup. Approves or rejects
Seller/Builder KYC, moderates properties, manages leads and pricing, handles billing, refunds and
support, and reviews audit logs.

- Needs: throughput. A queue-driven, information-dense console. This is the one surface where
  consumer polish matters least and clarity under volume matters most.
- Handles sensitive identity documents, so the design must make the seriousness of that
  visible — this is not a casual screen.

## Where the brand has to work

The same identity needs to hold up across:

- A consumer property search anyone in Kolkata might land on from an ad.
- A commercial dashboard where a broker spends money.
- An internal ops console reviewing government ID documents.

That range is the central design challenge. A single flat template across all three is what the
rejected prototype did, and it is why the public side reads as an internal tool.
