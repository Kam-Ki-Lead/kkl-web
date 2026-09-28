# 10. Environments and reproducibility

Exact commands to reproduce the build and the suites, with build-time and
run-time variables kept apart because conflating them was a real defect
(chapter 08 §8.7).

## 10.1 Prerequisites

| Requirement | Version used | Note |
|---|---|---|
| Node.js | 22.22.2 | `package.json` pins `engines.node: "22.x"` |
| npm | 10.9.7 | |
| Playwright Chromium | — | Only the browser suites need it. Firefox is **not** installed, so `verify-firefox-text-zoom.mjs` cannot run |
| PostgreSQL | 16.13 | **Only** for the CR03 backend and its persistence suite |

`kkl-web` needs no database. Nothing in the frontend talks to PostgreSQL.

## 10.2 The two kinds of variable

This distinction is the one to get right.

**Build-time — frozen into the bundle.** Must be on the `next build` line. Only a
literal `process.env.NEXT_PUBLIC_X` member access is substituted.

| Variable | Values | Purpose |
|---|---|---|
| `NEXT_PUBLIC_KKL_ENV` | `development` \| `review` \| `production` | What this bundle was built as |
| `NEXT_PUBLIC_KKL_DATA_SOURCE` | `sample` \| `api` | Which services the bundle expects |
| `NEXT_PUBLIC_KKL_API_BASE_URL` | URL | Required when the data source is `api` |
| `NEXT_PUBLIC_KKL_IMAGE_ORIGIN` | URL | Optional; review photography |

**Run-time — read from the process on every request.** Deliberately *without*
the prefix, so they are not frozen.

| Variable | Values | Purpose |
|---|---|---|
| `KKL_ENV` | same three | What the server says it is; compared against the bundle |
| `KKL_DATA_SOURCE` | `sample` \| `api` | Same, compared against the bundle |
| `KKL_LEAD_REQUESTS` | `backend` \| unset | CR03 store selection |
| `KKL_LEAD_REQUESTS_BASE_URL` | URL | Where kkl-backend is |
| `KKL_LEAD_REQUESTS_DEV_SECRET` | secret | Shared secret for the development authenticator. **Server-side only — must never be given a `NEXT_PUBLIC_` prefix** |
| `KKL_LEAD_REQUESTS_SELLER_REF` / `_STAFF_REF` | string | Stable external account handles; default to `kkl-web:sample-seller` / `kkl-web:sample-staff` |

A served build (`NODE_ENV=production`) that sets neither `KKL_ENV` nor
`KKL_DATA_SOURCE` **refuses to serve**. That is intentional: "nobody configured
this" must be visible, not a silent fallback.

No credentials appear in this repository. Variable *names* are documented; values
are not, and the `kkl_app` database role is created without a password so local
development uses the cluster's own trust rule and a deployment provisions one
out of band.

## 10.3 Review build (the documented configuration)

```sh
cd kkl-web
npm ci

NEXT_PUBLIC_KKL_ENV=review \
NEXT_PUBLIC_KKL_DATA_SOURCE=sample \
npx next build

KKL_ENV=review KKL_DATA_SOURCE=sample \
npx next start -p 3811
```

**Not `next dev`.** Every browser suite expects a production build served by
`next start`; the dev server behaves differently for static/dynamic rendering,
which is exactly where two defects lived.

Reset to a clean state at any point:
`http://127.0.0.1:3811/seller/review-state?reset=1&to=/seller`

## 10.4 CR03 with durable storage

```sh
# 1. PostgreSQL 16, a database, and the pgcrypto extension.
createdb kkl
psql -d kkl -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto'

# 2. Migrations run as an owner/superuser role. The API never does.
cd kkl-backend                       # branch claude/cr03-lead-requests
npm ci
MIGRATE_DATABASE_URL='postgres://<owner>@127.0.0.1:5432/kkl' npm run migrate

# 3. The API connects as kkl_app — not the table owner, NOBYPASSRLS.
DATABASE_URL='postgres://kkl_app@127.0.0.1:5432/kkl' \
KKL_DEV_AUTH_SECRET='<local-only-secret>' \
PORT=4010 npm start
```

Then serve `kkl-web` with three extra run-time variables:

```sh
KKL_ENV=review KKL_DATA_SOURCE=sample \
KKL_LEAD_REQUESTS=backend \
KKL_LEAD_REQUESTS_BASE_URL=http://127.0.0.1:4010 \
KKL_LEAD_REQUESTS_DEV_SECRET='<same-local-only-secret>' \
npx next start -p 3811
```

The build is unchanged — this is a server-side switch, so the same bundle serves
both stores.

`GET /health` reports `devAuth: true` when the development authenticator is
enabled. **A deployment must leave `KKL_DEV_AUTH_SECRET` unset**, which makes the
route return 404; a deployment checklist should assert `devAuth: false`.

## 10.5 Running the suites

```sh
# Unit tests — no browser, no server.
cd kkl-web && npm test                      # node --test "tests/*.test.mjs"
npx tsc --noEmit && npm run lint

# Browser suites — need the review build above already serving on 3811.
PLAYWRIGHT=/path/to/playwright/index.mjs node scripts/verify-route-sweep.mjs
PLAYWRIGHT=… node scripts/verify-owner-posting-flow.mjs
PLAYWRIGHT=… node scripts/verify-lead-order-flow.mjs
PLAYWRIGHT=… node scripts/verify-verification-policy.mjs
PLAYWRIGHT=… node scripts/verify-labels-and-locations.mjs
PLAYWRIGHT=… node scripts/verify-seller-flow.mjs        # and builder / admin / enquiry

# CR03 persistence — restarts kkl-backend mid-run, so it needs its directory.
BACKEND_DIR=/path/to/kkl-backend BACKEND_URL=http://127.0.0.1:4010 \
KKL_DEV_AUTH_SECRET='<same-secret>' PLAYWRIGHT=… \
node scripts/verify-lead-request-persistence.mjs

# Backend suite.
cd kkl-backend
DATABASE_URL='postgres://kkl_app@127.0.0.1:5432/kkl' npm test
```

**Run them one at a time.** They share one review-state endpoint and one
process; concurrent runs reset each other's data and produce defects that are
not there (chapter 08 §8.14).

## 10.6 Platform and environment notes

| Item | Note |
|---|---|
| Windows | `verify-sample-mode-guard.sh` was made hermetic and Windows-runnable at `707d77b`. The `.mjs` suites are platform-independent given Node 22 and Chromium |
| Firefox | Not installed here; `verify-firefox-text-zoom.mjs` is pending, not failing |
| Docker | Not available in the environment these results were recorded in; PostgreSQL was run from native binaries |
| Network | `unpkg.com` and `images.unsplash.com` were unreachable; review photography is therefore behind a flag and the imagery dependency (E-P3) is recorded rather than resolved |
| Ports | 3811 for `kkl-web`, 4010 for `kkl-backend`, 5432 (or 5433) for PostgreSQL. `next start -p` and `PORT` select them |

## 10.7 What cannot be reproduced from this repository

- **An `api`-mode production build.** `getServices()` throws for `dataSource=api`
  because the kkl-backend API client does not exist. This is why the CR07
  production guard cannot fire.
- **Any live service.** No OTP, payment, notification or verification provider is
  contacted anywhere.
- **The Phase 1 design session.** `kkl-design` holds the export; the process that
  produced it is not reproducible from any repository.
