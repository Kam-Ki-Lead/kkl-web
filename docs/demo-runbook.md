# Running the demo

Two demos: the four accounts, and the calling agent. Both run locally, both
use synthetic fixtures, and neither touches a deployed environment, a
database or a provider.

## 1. The four accounts

### Build and serve

```
cd kkl-web
npm ci
npm run build
KKL_ENV=development KKL_DATA_SOURCE=sample npx next start -p 3000
```

Nothing else. **Do not set `KKL_AUTH` or any `KKL_<domain>` switch**: each one
moves a domain to kkl-backend, and a review session carries no API token, so
the console that reads it would open to a header, a footer and an empty
middle. The sign-in page hides the review accounts on a server configured that
way and says why, rather than offering a button that leads nowhere.

### Sign in

Open `/auth`. Under the normal form, "Review accounts" lists four. One click
each, or type the number into the form — same path either way, no code step.

| Account | Number | Lands on |
|---|---|---|
| Buyer | **8971741611** | `/account` |
| Broker | 9830044182 | `/seller` |
| Builder | 9830072210 | `/builder` |
| Admin | 9830000004 | `/admin` |

Each lands on its own console and the header names the account that is signed
in. Sign out from the console, or clear the `kkl_demo_session` cookie, to swap
accounts.

### What to walk

- **Buyer** — `/account`, shortlist, enquiries, profile, notifications.
- **Broker** — `/seller`, leads, purchased, requests, billing, orders, KYC,
  verification, support, profile.
- **Builder** — `/builder`, properties, enquiries, profile.
- **Admin** — `/admin`, leads, intake, voice, WhatsApp, orders, verification,
  KYC, properties, users, wallets, suppressions, notifications, support,
  audit, reports, pricing, system.

37 screens in all. `scripts/verify-demo-walkthrough.mjs` opens every one of
them and fails on a non-200, a redirect away, or an empty `<main>` — run it
before a demo:

```
KKL_BASE_URL=http://127.0.0.1:3000 \
PLAYWRIGHT=./node_modules/playwright-core node scripts/verify-demo-walkthrough.mjs
```

### What the screens are honest about

Every screen renders labelled sample fixtures, and the ones waiting on a
decision or a provider say so on the screen rather than showing a plausible
number. Lead prices are not set (D-03), no payment credentials exist, no
one-time-code or WhatsApp provider is configured, and no call has been placed.
Those sentences are the delivered state, not placeholders to apologise for.

Nothing in the demo is a real person. Do not describe a property card as a
lead, or a fixture as a customer.

### Why not on staging

Staging sets `KKL_AUTH=backend` and every domain switch to `backend` (see
`DEPLOYMENT.md`), so its account screens read from kkl-backend as the signed-in
account. kkl-backend has no one-time-code provider configured, so it cannot
sign anybody in, and a frontend-only review session has no token for those
reads. The review accounts are therefore unavailable there by design;
`docs/review-sign-in.md` has the full rule and the three failed attempts at
hiding it.

Opening the consoles on a backend-wired deployment needs a real session, which
only kkl-backend can issue: a test account whose code is fixed, or a
one-time-code provider for that environment. Both are open decisions.

## 2. The calling agent

```
cd kkl-voice
npm run demo
```

Prints a simulated call as a transcript: four questions asked and answered,
the caller talking over a prompt and the agent clearing its queued audio, the
configured opt-out word ending the call with nothing granted, a dropped line
stored as interrupted rather than complete, and the same socket refused
outright on a publicly reachable deployment. Five scenes; it exits non-zero if
any of them misbehaves.

The socket, the Exotel framing, the turn-taking and the barge-in are the real
code paths. Nothing else is live: no number is dialled, Exotel and Sarvam are
not called, no account with either exists, and kkl-backend is scripted inside
the process, so it needs no API, no database and no network.

The prompts are labelled synthetic in their own text because the client has
not supplied the qualification questionnaire, and no qualification level is
produced from them — the service sends evidence and kkl-backend decides.

The Admin console's `/admin/voice` and `/admin/whatsapp` screens are the staff
side of the same capability, and in the demo above they say on the screen that
their volumes are fixtures and that no call has been placed.

## Before a demo, in one go

```
# kkl-web, against the server started above
KKL_BASE_URL=http://127.0.0.1:3000 PLAYWRIGHT=./node_modules/playwright-core sh -c '
  node scripts/verify-demo-accounts.mjs &&
  node scripts/verify-demo-walkthrough.mjs &&
  node scripts/verify-no-session-loop.mjs'
npm test

# kkl-voice
cd ../kkl-voice && npm run demo && npm test
```
