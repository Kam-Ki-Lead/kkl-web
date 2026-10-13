# The review sign-in: four accounts, no code

> **There is now a real way in.** An email address and a password opens a
> genuine kkl-backend session, works on any deployment wired to the API —
> staging included — and shows that deployment's real records. See
> `docs/demo-runbook.md` and `kkl-backend/docs/password-sign-in.md`.
>
> What follows is the frontend shortcut: a cookie, for a laptop with no API.
> It is still the quickest way to walk the four consoles on a sample build,
> and it still opens nothing on a deployment that reads from the API.


Four synthetic accounts sign in with one click and no one-time code, each
landing on its own console.

| Account | Number | Lands on | Identity on screen |
|---|---|---|---|
| Buyer | **8971741611** | `/account` | Priya Sen |
| Broker | 9830044182 | `/seller` | Sujata Pal · Sen Properties |
| Builder | 9830072210 | `/builder` | Sandeep Barua · Sample Builders Pvt Ltd |
| Admin | 9830000004 | `/admin` | A. Dutta · Operations |

8971741611 is the number that was asked for; it is the Buyer's, and it is the
one the page shows. The Buyer fixture's own number, 9830041288, also reaches
the Buyer, because the Buyer screens are rendered from that fixture and
somebody reading the sample data will try it. The Admin fixture carries no
number of its own — the sample Admin screens have no sign-in and render as a
constant staff identity — so 9830000004 is a number chosen for this list, and
`demo-access.ts` says so where it is defined rather than passing it off as
fixture data.

Each number is typed into the normal form, or clicked in the "Review accounts"
panel below it. Both go through the same server action; the button is a faster
way to type the number, not a second way in.

## Why it exists

A review or a demo needs to walk the four consoles, and neither server a
reviewer can reach will let anybody in.

- A **sample build** authenticates nobody. It accepts any six digits and then
  writes no session at all, so the header still said "Sign in" after a
  "successful" sign-in.
- **Staging** signs in through kkl-backend, which has no one-time-code delivery
  provider configured, so it cannot send a code to anybody.

## Where it works, and where it does not

It is available only where it can actually open the console it signs in to.
Both halves of that are checked on every request, in `demoSignInWorks()`:

1. **`demoSignInAllowed()`** — the gate. Production refuses it
   unconditionally. Below production it exists on a sample build that is not
   doing real sign-in (where there is nothing to bypass: that build already
   accepts any six digits), or where `KKL_DEMO_SIGNIN` turns it on
   deliberately.
2. **`demoConsolesWork()`** — reachability. False as soon as `KKL_AUTH=backend`
   or any domain switch is `backend`, because those screens read from
   kkl-backend *as the account* and a review session carries no token for that
   read.

| `KKL_ENV` | `KKL_DATA_SOURCE` | `KKL_AUTH` | domain switches | `KKL_DEMO_SIGNIN` | Shortcut |
|---|---|---|---|---|---|
| `production` | anything | anything | anything | anything | **No** |
| not production | `sample` | unset | all unset | unset | **Yes** |
| not production | `sample` | unset | all unset | `on` | **Yes** |
| not production | anything | `backend` | anything | anything | No |
| not production | anything | unset | any `backend` | anything | No |

Production's refusal is a single early return in `demoSignInIsAllowed()`
rather than a term in a boolean expression, so a later change cannot bury it
in an `||`. `tests/demo-session.test.mjs` walks all sixteen combinations of the
gate's four inputs and names every one that may sign in; a changed operator
moves a row and fails there.

### Staging is the fourth row

Staging sets `KKL_AUTH=backend` and every domain switch to `backend` (see
`DEPLOYMENT.md`), so **the shortcut is not available on staging**, with or
without the opt-in. Where the opt-in is set and the consoles are unreachable,
the sign-in page says so in a panel instead of offering buttons that lead
nowhere.

That is a limit of the architecture, not a bug in kkl-web. A review session
holds no backend token, so every console shell's first read — the signed-in
profile — is refused. Three attempts at hiding that produced, in order:

- a redirect to `/auth?next=%2Faccount` that rendered blank;
- a redirect loop on *every* page, when the demo cookie was briefly allowed to
  pass `hasBrowserSession()` (see below);
- a sign-in that landed on the public homepage with the header still saying
  "Sign in" — a button that signs you in to nothing.

There is no honest fourth option, so the shortcut is simply not there on such
a server. Opening the consoles on a backend-wired deployment needs a **real**
session, which only kkl-backend can issue: a test account whose code is fixed,
or a one-time-code provider configured for that environment. Both are
kkl-backend decisions and neither has been made.

### The configuration the demo runs on

A build serving sample fixtures, with no domain switch set:

```
NEXT_PUBLIC_KKL_ENV=development   # or review / staging; must match KKL_ENV
NEXT_PUBLIC_KKL_DATA_SOURCE=sample
KKL_ENV=development
KKL_DATA_SOURCE=sample
# KKL_AUTH unset, and every KKL_<domain> switch unset
```

All four consoles open, every screen renders from labelled fixtures, and
nothing calls an API. `scripts/verify-demo-walkthrough.mjs` opens 37 screens
across the four and fails on a non-200, a redirect away, or an empty `<main>`.

## The cookie

`kkl_demo_session` is **not an access token**:

- its value is a role name — `buyer`, `seller`, `builder`, `admin` — and
  nothing else;
- it is `httpOnly`, `sameSite=lax`, and expires after 8 hours;
- it is never sent to kkl-backend;
- `demoSession()` re-checks `demoSignInWorks()` on every read, so a cookie set
  on a server that allows the shortcut and carried to one that does not is
  ignored, as is a value that is not one of the four roles.

The landing page comes from the fixed table in `demo-access.ts`, keyed by that
role — never from a form field or a query parameter. A bypass whose
destination arrives in a request body is a redirect anybody can aim.

It changes **one** thing outside the sign-in itself: the public header's
account control, read in `(public)/layout.tsx`, which points at *that*
account's console. A signed-in Builder sent to the Buyer's `/account` is in the
wrong room.

### Nothing else may consult it

That restriction is not stylistic. `hasBrowserSession()` is the precondition
callers use before calling kkl-backend *as the account*; a cookie that cannot
authenticate must never pass it. It did, briefly, and the result was a
navigation loop on every page: the header's shortlist read passed the guard,
called the backend with no token, was refused, and `callWithBrowserSession`
turned that refusal into `redirect("/auth…")` — thrown from inside the
**layout**, so every page went to `/auth`, which renders the same layout, which
went again. Nothing cleared the cookie, so it never ended.

A stale *refresh* cookie does not do this, because `/auth/refresh` clears the
session on its way past. The demo cookie was the only state in the application
that could report a session with neither an access nor a refresh token, which
is why that bug belonged to it alone.

`scripts/verify-no-session-loop.mjs` pins the guard's body and walks the public
pages in a browser under six cookie states, counting navigations. It uses a
browser because the header is inside a Suspense boundary: the response is 200
and the redirect travels in the RSC stream for the client router to perform, so
curl sees a healthy page and no redirect at all. The first version of that
check was curl-based and passed against the broken build.

## It is not authorisation

kkl-backend still authorises every request, and a review session holds no token
to send, so anything that genuinely calls the backend as an account refuses it.
Every other number is unaffected: it goes to the code step exactly as before,
and on a sample build is still authenticated against nothing.

## Turning it off

Remove `KKL_DEMO_SIGNIN` and redeploy. Existing cookies stop counting on the
next request; nothing has to be cleared. On a sample build with no domain
switches it is on by default, because that build has nothing to bypass.

## Where it lives

| File | What it holds |
|---|---|
| `src/lib/auth/demo-access.ts` | The four accounts and the gate. Imports nothing, so it is testable directly. |
| `src/lib/auth/demo-session.ts` | The cookie, and the one place that reads this server's configuration. |
| `src/app/actions/auth.ts` | The branch in `requestCode`, `demoAccountSignIn`, and the clear-up in `signOut`. |
| `src/components/auth/demo-accounts.tsx` | The four one-click buttons. |
| `tests/demo-session.test.mjs` | The gate, exhaustively, and the account table. |
| `scripts/verify-demo-accounts.mjs` | All four signed in and landed, in a browser. |
| `scripts/verify-demo-signin-gate.mjs` | The three server shapes: refusing, refusing while opted in, and working. |
| `scripts/verify-demo-walkthrough.mjs` | Every screen the demo opens, opening. |
| `scripts/verify-no-session-loop.mjs` | The loop that a looser guard caused. |
| `scripts/verify-search-bar-and-demo.mjs` | The sign-in driven end to end in a browser. |

## Verification record

Against a build of this commit, served locally. Nothing deployed was touched.

| Server | Configuration | Check | Result |
|---|---|---|---|
| 3828 | sample, no switches | `verify-demo-accounts.mjs` | 31/31 |
| 3828 | sample, no switches | `verify-demo-walkthrough.mjs` | 37/37 screens |
| 3828 | sample, no switches | `verify-demo-signin-gate.mjs` (`KKL_EXPECT=on`) | 9/9 |
| 3828 | sample, no switches | `verify-search-bar-and-demo.mjs` | 30/30 |
| 3828 | sample, no switches | `verify-no-session-loop.mjs` | 26/26 |
| 3827 | `KKL_AUTH=backend`, `KKL_DEMO_SIGNIN=on`, backend at a closed port | `verify-demo-signin-gate.mjs` (`KKL_EXPECT=off KKL_OPTED=on`) | 5/5 |
| 3827 | as above | `verify-no-session-loop.mjs` | 26/26 |
| 3826 | `KKL_AUTH=backend`, no opt-in, backend at a closed port | `verify-demo-signin-gate.mjs` (`KKL_EXPECT=off`) | 4/4 |
| 3826 | as above | `verify-no-session-loop.mjs` | 26/26 |

The refusing servers point at `http://127.0.0.1:1`, a closed port. That is the
point: a shortcut that had started depending on the API would hang or error
there instead of refusing cleanly.
