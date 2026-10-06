# kkl-web on Vercel — staging

Platform URL only. No custom domain. `vercel.json` carries the build; the
variables below are set in the Vercel project, not here.

## Why there is almost nothing in `vercel.json`

Headers, caching and the per-request deployment guard are in `src/proxy.ts`,
so they hold wherever this runs — a self-hosted `next start` included. A
platform configuration file that duplicated them would be a second place to
forget.

## Variables

`NEXT_PUBLIC_*` is **substituted into the browser bundle at build time**. It is
public: anything placed there is readable by anyone who loads a page, and
changing it on the server afterwards changes nothing. Everything else is read
from the server process per request and never reaches a browser.

Set all of these for the Vercel environment you are deploying (Preview or
Production — the platform's own word for the deployment slot, which is not the
same thing as `KKL_ENV`).

### Build-time, public, in the bundle

| Variable | Staging value | Why |
| --- | --- | --- |
| `NEXT_PUBLIC_KKL_ENV` | `staging` | What this bundle was built for. Compared against the server's `KKL_ENV` on every request. |
| `NEXT_PUBLIC_KKL_DATA_SOURCE` | `sample` | The platform-wide API client does not exist; domains move individually, below. |
| `NEXT_PUBLIC_KKL_API_BASE_URL` | *unset* | Required only when `NEXT_PUBLIC_KKL_DATA_SOURCE=api`. |
| `NEXT_PUBLIC_KKL_REVIEW_IMAGERY` | *unset* | Review-only imagery. Leave unset so no screen implies a photograph exists. |
| `NEXT_PUBLIC_KKL_IMAGE_ORIGIN` | *unset* | Set only when a media host is fixed. `next.config.ts` allows no remote pattern. |

### Runtime, server only, never in the bundle

| Variable | Staging value | Why |
| --- | --- | --- |
| `KKL_ENV` | `staging` | The authoritative declaration. A mismatch with the bundle's value is a 503. |
| `KKL_DATA_SOURCE` | `sample` | Must match the bundle. |
| `KKL_AUTH` | `backend` | **Required on staging.** Without it the sign-in step accepts any six digits. |
| `KKL_BACKEND_BASE_URL` | `https://<service>.up.railway.app` | The one API origin. Every switch below uses it. |
| `KKL_LOCATIONS_LAUNCH_CITY` | the seeded city id | The portal's launch city. Configuration, not a constant. |
| `KKL_LEAD_REQUESTS` | `backend` | |
| `KKL_LOCATIONS` | `backend` | |
| `KKL_PROFILES` | `backend` | |
| `KKL_LISTINGS` | `backend` | |
| `KKL_ENQUIRIES` | `backend` | |
| `KKL_MARKETPLACE` | `backend` | |
| `KKL_BUILDER_ENQUIRIES` | `backend` | |
| `KKL_SUPPORT` | `backend` | |
| `KKL_NOTIFICATIONS` | `backend` | |
| `KKL_VERIFICATION` | `backend` | |
| `KKL_ADMIN_OPERATIONS` | `backend` | |
| `KKL_STAFF_ORDERS` | `backend` | |
| `KKL_INTAKE` | `backend` | |
| `KKL_QUALIFICATION` | `backend` | |

Every switch set to `backend` is a swap, not a fallback: if kkl-backend cannot
be reached the screen reports an error. It does not serve fixtures and call
them real.

### Must not be set

| Variable | Why |
| --- | --- |
| `KKL_DEV_AUTH_SECRET` | The development identity issuer invents an account for a name, with whatever role the caller asks for — "staff" included. |
| `KKL_BACKEND_DEV_SECRET` | The same issuer, by the name the backend adapters use. |
| `KKL_LEAD_REQUESTS_DEV_SECRET` | The same issuer again. Not needed: `KKL_AUTH=backend` authenticates with the browser's own session. |

The guard in `src/lib/config/runtime.ts` refuses to serve if any of the three
is present on a `staging` or `production` deployment, so this is enforced and
not merely requested. `tests/staging-guard.test.mjs` runs that module to prove
it.

## NODE_ENV

Vercel sets `NODE_ENV=production` and it cannot be changed. That is the
platform's word for an optimised build, and it is not the application's
environment classification. `KKL_ENV` is. Under `NODE_ENV=production` the
guard additionally requires `KKL_ENV` and `KKL_DATA_SOURCE` to be set at all,
so an unconfigured deployment fails visibly instead of serving whatever the
bundle happened to contain.

## Node version

`package.json` pins `engines.node` to `22.x`. Vercel reads it; confirm the
project's Node version matches, because a platform default that disagrees is
resolved in the platform's favour.

## What this deployment cannot do

- **Sign anybody in.** `KKL_AUTH=backend` sends the code request to
  kkl-backend, and kkl-backend has no one-time-code provider (Q-7). The screen
  reports that codes cannot be sent. This is the decision that needs an answer
  before a tester can get past the first screen; see
  `../kkl-backend/docs/staging/runbook.md`.
- **Take a payment.** No Razorpay credentials, and the live call is not
  implemented (Q-5).
- **Show a photograph.** `next.config.ts` permits no remote image pattern.
