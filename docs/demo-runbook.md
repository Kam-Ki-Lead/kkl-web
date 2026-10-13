# Running the demo

Two demos: the four consoles, and the calling agent.

There are two ways to open the consoles, and they are not equivalent.

| | Email and password | The review shortcut |
|---|---|---|
| What it is | A real session issued by kkl-backend | A cookie kkl-web sets |
| Where it works | Any deployment wired to the API, **staging included** | Only a build serving sample fixtures |
| What you see | The real records in that deployment's database | Labelled sample fixtures |
| Set-up | Four accounts seeded once, by an operator | None |

**Use email and password.** It is the one that works on a URL you can send
somebody, and it shows real data. The shortcut is for a laptop with no API.

## 1. The four consoles, with email and password

### Once, per deployment: seed the accounts

In kkl-backend, against that deployment's database. Choose the four passwords
yourself and keep them where your other deployment secrets live — they are not
defaulted and are not in any repository.

```bash
cd kkl-backend
KKL_REVIEW_EMAIL_DOMAIN=review.example.com \
KKL_REVIEW_BUYER_PASSWORD='…'   \
KKL_REVIEW_SELLER_PASSWORD='…'  \
KKL_REVIEW_BUILDER_PASSWORD='…' \
KKL_REVIEW_ADMIN_PASSWORD='…'   \
DATABASE_URL='<that deployment's database>' \
  npm run seed:review-accounts -- --reason "client demo, <date>"
```

Idempotent: running it again updates the same four and resets their passwords.
It writes four accounts and nothing else — no leads, no listings, no wallet.

| Account | Address | Role | Lands on |
|---|---|---|---|
| Buyer | `buyer@<domain>` | buyer | `/account` |
| Broker | `broker@<domain>` | seller | `/seller` |
| Builder | `builder@<domain>` | builder | `/builder` |
| Admin | `admin@<domain>` | **staff** | `/admin` |

The Admin row creates a **staff** account. That is the point of it and it is
the one thing here worth being deliberate about: whoever holds that password
can open the Admin console. Rotate it when the review is over —
`node src/bin/set-password.mjs --email admin@<domain>`.

The migration that adds the password table runs automatically on deploy
(`railway.json` → `preDeployCommand`), so the only manual step is the seed
above.

### Then: sign in

Open `/auth`. Under the mobile-code form is **"Or use an email address and
password"**. Each account lands in its own console, and the screens show that
deployment's real records.

Nothing is emailed. This path sends no message, so it needs no provider — which
is the whole reason it exists, because no one-time-code provider is configured
(Q-7) and `sendEmail()` refuses to send from staging at all.

### What the screens are honest about

Lead prices are not set (D-03), no payment credentials exist, no one-time-code
or WhatsApp provider is configured, and no call has been placed. Those
sentences are the delivered state, not placeholders to apologise for.

Nothing in the demo is a real person. Do not describe a property card as a
lead, or a fixture as a customer.

### If a sign-in stops working mid-demo

Five attempts per address per fifteen minutes, and twenty from one caller. The
ceiling applies to a correct password too, so a run of typos locks the address
for a few minutes. `docs/password-sign-in.md` in kkl-backend has the variables
if a demo needs them raised.

## 2. The same four, on a laptop with no API

A build serving sample fixtures, with no domain switch set:

```
cd kkl-web
npm ci && npm run build
KKL_ENV=development KKL_DATA_SOURCE=sample npx next start -p 3000
```

**Do not set `KKL_AUTH` or any `KKL_<domain>` switch.** Each one moves a domain
to kkl-backend, and the review shortcut carries no API token, so a console that
reads one would open to a header, a footer and an empty middle. The sign-in
page hides the shortcut on a server configured that way and says why.

Open `/auth`; "Review accounts" lists four, one click each. Numbers: Buyer
**8971741611**, Broker 9830044182, Builder 9830072210, Admin 9830000004.
`docs/review-sign-in.md` has the full rule.

### What to walk, either way

- **Buyer** — `/account`, shortlist, enquiries, profile, notifications.
- **Broker** — `/seller`, leads, purchased, requests, billing, orders, KYC,
  verification, support, profile.
- **Builder** — `/builder`, properties, enquiries, profile.
- **Admin** — `/admin`, leads, intake, voice, WhatsApp, orders, verification,
  KYC, properties, users, wallets, suppressions, notifications, support,
  audit, reports, pricing, system.

37 screens. `scripts/verify-demo-walkthrough.mjs` opens every one on a sample
build and fails on a non-200, a redirect away, or an empty `<main>`.

## 3. The calling agent

```
cd kkl-voice
npm run demo
```

Prints a simulated call as a transcript: four questions asked and answered, the
caller talking over a prompt and the agent clearing its queued audio, the
configured opt-out word ending the call with nothing granted, a dropped line
stored as interrupted rather than complete, and the same socket refused
outright on a publicly reachable deployment. Five scenes; it exits non-zero if
any misbehaves.

The socket, the Exotel framing, the turn-taking and the barge-in are the real
code paths. Nothing else is live: no number is dialled, Exotel and Sarvam are
not called, no account with either exists, and kkl-backend is scripted inside
the process, so it needs no API, no database and no network.

The prompts are labelled synthetic in their own text because the client has not
supplied the qualification questionnaire, and no qualification level is
produced from them — the service sends evidence and kkl-backend decides.

`/admin/voice` and `/admin/whatsapp` are the staff side of the same capability.

## Before a demo

```bash
# kkl-web, against whichever server you are demoing
KKL_BASE_URL=<url> PLAYWRIGHT=./node_modules/playwright-core sh -c '
  node scripts/verify-password-sign-in.mjs &&     # the real sign-in
  node scripts/verify-no-session-loop.mjs'
npm test

# on a sample build only
KKL_BASE_URL=<url> PLAYWRIGHT=./node_modules/playwright-core sh -c '
  node scripts/verify-demo-accounts.mjs &&
  node scripts/verify-demo-walkthrough.mjs'

# kkl-voice
cd ../kkl-voice && npm run demo && npm test
```

`verify-password-sign-in.mjs` checks the four landings too when given
`KKL_REVIEW_DOMAIN` and the four passwords.
