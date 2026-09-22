# Running kkl-web for review

The only configuration this repository supports for reviewing screens is a
**production build served by `next start`**. Not the dev server.

## Why not the dev server

The dev server in the sandbox this was built in does not hydrate: client
components render their server HTML and never become interactive, so forms,
drawers and filters appear broken. The dev server's HMR websocket is also
blocked in that sandbox.

**The causal link between those two facts is not established.** The correlation
was observed; no experiment isolated the websocket as the cause. Do not repeat
"the dev server cannot hydrate because HMR is blocked" as a finding — the honest
statement is that hydration does not happen there and the reason is unresolved.
It may behave differently on a normal machine. The practical consequence stands
either way: every client-side check in this project was run against
`next build` + `next start`, and that is the configuration to review in.

## The documented review configuration

```bash
npm install
npx next build
NEXT_PUBLIC_KKL_ENV=review \
NEXT_PUBLIC_KKL_DATA_SOURCE=sample \
KKL_ENV=review \
KKL_DATA_SOURCE=sample \
npx next start -p 3811
```

Then open <http://127.0.0.1:3811>.

Set all four. The `NEXT_PUBLIC_*` pair is frozen into the bundle at build time;
the unprefixed pair is read from the process on every request. The guard refuses
to serve when they disagree, because a bundle built for one environment and
deployed as another is not the bundle that environment asked for.

### With the baseline's review photography

```bash
NEXT_PUBLIC_KKL_REVIEW_IMAGERY=on npx next build
```

then start as above. This hotlinks seven Unsplash photographs referenced by the
approved baseline, with their credits drawn over the images. It is off by
default, is not tied to sample mode, and has never been seen rendered from this
repository — the build environment blocks `images.unsplash.com`. See
`src/lib/services/sample/review-imagery.ts`.

## What sample mode is not

Sample mode simulates sign-in, OTP, payment and contact reveal. Nothing is sent,
charged, verified or stored. It exists so the journeys can be reviewed end to
end before kkl-backend exists.

It must never serve real users, and two guards enforce that:

| Guard | Where | Catches |
| --- | --- | --- |
| Build-time | `src/lib/config/runtime.ts`, at module load | `NEXT_PUBLIC_KKL_ENV=production` built together with `NEXT_PUBLIC_KKL_DATA_SOURCE=sample`. The build fails. |
| Run-time | `src/proxy.ts`, ahead of every request | `KKL_ENV=production` on a server whose bundle was built for review or development. Every request returns 503 with the reason. |

The second guard exists because the first cannot see the likelier accident. A
review build deployed to production with `NEXT_PUBLIC_KKL_ENV=production` set on
the server still has `"review"` inlined in its bundle, so the build-time check
stays quiet and simulated authentication serves real users. **That was verified
to happen** before the run-time guard was added.

Verify both directions with:

```bash
./scripts/verify-sample-mode-guard.sh
```

## Verifying the enquiry flow

```bash
PLAYWRIGHT=/path/to/playwright/index.mjs node scripts/verify-enquiry-flow.mjs
```

Twenty checks covering reload, direct access, replay, two tabs, two independent
browser sessions, expired and missing drafts, and personal data in URLs. Three
of them assert a limitation rather than a guarantee — see the file header.
