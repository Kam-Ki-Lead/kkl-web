# The review sign-in shortcut

One mobile number signs in with no one-time code: **8971741611**.

It exists because a reviewer needs a signed-in screen to look at, and the two
servers that reviewers use cannot produce one. A sample build authenticates
nobody — it accepts any six digits and then writes no session at all, so the
header still said "Sign in" after a "successful" sign-in. Staging signs in
through kkl-backend, which has no one-time-code delivery provider configured,
so it cannot send a code to anybody.

## Turning it on

```
KKL_DEMO_SIGNIN=on
```

Read from the process on every request, deliberately **without** a
`NEXT_PUBLIC_` prefix: a value frozen into the bundle at build time would keep
the shortcut alive on a server that had since turned it off.

Only an explicit affirmative counts — `on`, `1`, `true`, `yes`. An empty
string, `0`, `false` or `off` leave it off, because those are what a deployment
dashboard stores when somebody meant to remove the variable.

## When it is available

| `KKL_ENV` | `KKL_DATA_SOURCE` | `KKL_AUTH` | `KKL_DEMO_SIGNIN` | Shortcut |
|---|---|---|---|---|
| `production` | anything | anything | anything | **No** |
| not production | `sample` | unset | unset | Yes |
| not production | `sample` | `backend` | unset | No |
| not production | anything | anything | `on` | Yes |

Production refuses it unconditionally, and that rule is a single early return
in `demoSignInIsAllowed()` rather than a term in a boolean expression, so a
later change cannot bury it in an `||`. `tests/demo-session.test.mjs` walks all
sixteen combinations of the four inputs and names every one that may sign in;
a changed operator moves a row and fails there.

Staging is the fourth row: `KKL_ENV=review`, `KKL_DATA_SOURCE=sample`,
`KKL_AUTH=backend`, plus the opt-in.

## What it actually does

`requestCode` recognises the number before it reaches either the sample branch
or the backend call, writes a cookie, and redirects to the homepage. There is
no code step.

## What it does NOT do, on a server wired to kkl-backend

**It does not open the account screens.** This is the important limit, and it
is not a bug to be fixed in kkl-web.

A demo session holds no backend token, because it is not a credential. Every
screen under `/account` (and the Seller console) reads from kkl-backend *as the
account*; that read is refused, and `redirectForAuth` sends the visitor back to
`/auth`. Landing on `/account` therefore produced an immediate bounce to
`/auth?next=%2Faccount` and the shortcut looked like it had done nothing — which
is why `DEMO_LANDING` is the homepage and not the requested `next`.

So on staging the shortcut gives you **a signed-in public site**: the header
says "My account", "Buy leads" points at the console rather than the brochure,
and anything rendered from sample fixtures works. It does not give you a
working account area.

Getting that needs a real session, which only kkl-backend can issue — a test
account whose code is fixed, or a one-time-code provider configured for the
staging environment. Both are kkl-backend decisions.

On a fully sample server there is no such limit: nothing calls a backend, so
everything renders.

The cookie (`kkl_demo_session`) is **not an access token**:

- it carries no credential — its value is the number it stands for;
- it is `httpOnly`, `sameSite=lax`, and expires after 8 hours;
- it is never sent to kkl-backend;
- `hasDemoSession()` re-checks the gate on every read, so a cookie set on a
  server that allows the shortcut and carried to one that does not is ignored.

It changes **one** thing: the public header's account control, read in
`(public)/layout.tsx`, and only on a server whose account screens are not
backend-gated. Nothing else in the application may consult it.

That restriction is not stylistic. `hasBrowserSession()` is the precondition
callers use before calling kkl-backend *as the account*; a cookie that cannot
authenticate must never pass it. It did, briefly, and the result was a
navigation loop on every page: the header's shortlist read passed the guard,
called the backend with no token, was refused, and `callWithBrowserSession`
turned that refusal into `redirect("/auth…")` — thrown from inside the
**layout**, so every page went to /auth, which renders the same layout, which
went again. Nothing cleared the cookie, so it never ended.

A stale *refresh* cookie does not do this, because `/auth/refresh` clears the
session on its way past. The demo cookie was the only state in the application
that could report a session with neither an access nor a refresh token, which
is why this bug belonged to it alone.

`scripts/verify-no-session-loop.mjs` pins the guard's body and walks the public
pages in a browser under four cookie states, counting navigations. It uses a
browser because the header is inside a Suspense boundary: the response is 200
and the redirect travels in the RSC stream for the client router to perform, so
curl sees a healthy page and no redirect at all.

It is not authorisation: kkl-backend still authorises every request, and a demo
session holds no token to send, so anything that genuinely calls the backend as
an account will refuse it.

Every other number is unaffected — it goes to the code step exactly as before,
and on a sample build is still authenticated against nothing.

## Turning it off

Remove `KKL_DEMO_SIGNIN` and redeploy. Existing cookies stop counting on the
next request; nothing has to be cleared.

## Where it lives

| File | What it holds |
|---|---|
| `src/lib/auth/demo-access.ts` | The rule. Imports nothing, so it is testable directly. |
| `src/lib/auth/demo-session.ts` | The cookie, and the one place that reads this server's configuration. |
| `src/app/actions/auth.ts` | The branch in `requestCode`, and the clear-up in `signOut`. |
| `tests/demo-session.test.mjs` | The gate, exhaustively. |
| `scripts/verify-search-bar-and-demo.mjs` | The sign-in driven end to end in a browser. |
