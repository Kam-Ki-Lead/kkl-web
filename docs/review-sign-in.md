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
or the backend call, writes a cookie, and redirects. There is no code step.

The cookie (`kkl_demo_session`) is **not an access token**:

- it carries no credential — its value is the number it stands for;
- it is `httpOnly`, `sameSite=lax`, and expires after 8 hours;
- it is never sent to kkl-backend;
- `hasDemoSession()` re-checks the gate on every read, so a cookie set on a
  server that allows the shortcut and carried to one that does not is ignored.

It makes `hasBrowserSession()` true, which is what the public header reads to
decide whether to say "Sign in" or "My account", and where "Buy leads" points.
It is not authorisation: kkl-backend still authorises every request, and a
demo session holds no token to send, so anything that genuinely calls the
backend as an account will refuse it.

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
