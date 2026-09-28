# CR03 — the authentication boundary

CR03's records are durable and account-isolated, and both were demonstrated.
Neither demonstration says anything about **authentication**, and this document
exists so that nobody reads one as the other.

> **The short version.** *Authorization* — what an identity may reach — is real,
> enforced by PostgreSQL, and tested past the application code. *Authentication*
> — establishing that a caller is who they claim — is **not built**. Today an
> identity is handed out by a development authenticator on request. That is fine
> for review and unacceptable in production, and nothing in the persistence or
> RLS evidence changes that.

---

## 1. How an identity is established today

```
kkl-web (server-side only)
   │  POST /v1/dev/sessions  { externalRef, displayName, role }
   │  header: x-kkl-dev-secret: <KKL_LEAD_REQUESTS_DEV_SECRET>
   ▼
kkl-backend  src/http/sessions.mjs → issueDevSession()
   │  • route returns 404 unless KKL_DEV_AUTH_SECRET is set
   │  • shared secret must match exactly, else 401
   │  • resolves or creates the account for that externalRef
   │  • the role travels with the ACCOUNT ROW, never with the request:
   │    asking for a role the account does not hold is a 409
   │  • inserts a sessions row: token, account_id, expires_at
   ▼
returns { token, accountId, role }   ← a bearer token
```

kkl-web holds two of these, server-side, for the two sample identities it
renders: `kkl-web:sample-seller` and `kkl-web:sample-staff`. The tokens are
cached per process and never reach a browser.

**What this establishes: nothing about the person.** No password, no OTP, no
possession of a phone number, no device. The development authenticator hands a
session to whoever holds the shared secret. It is an identity *issuer*, not an
identity *verifier*.

**What it is NOT:** it is not "weak authentication" that could be hardened by a
longer secret. There is no authentication step to harden. The production design
— mobile OTP for buyers, OTP plus password plus KYC for Seller/Builder, internal
provisioning for Admin with no public signup route — is specified in
`kkl-backend/docs/architecture.md` §4 and is **unbuilt**. This programme is under
a no-live-services boundary, so no OTP is sent and none is verified.

## 2. How that identity reaches the database

Every request that touches user data runs inside `withIdentity()`
(`kkl-backend/src/db/pool.mjs`):

```js
BEGIN
SELECT set_config('app.user_id',   $accountId, true)   -- true = transaction-scoped
SELECT set_config('app.user_role', $role,      true)
  … the handler's queries …
COMMIT
```

The policies in `migrations/001_lead_requests.sql` read those through
`app_user_id()` and `app_user_role()`. Four properties make this real rather
than decorative:

1. **The values come from the session row, not the request.** `resolveIdentity()`
   looks the bearer token up and reads `accounts.role` on every request, so a
   role change or a revocation takes effect immediately. A body carrying
   `accountId` or `role` is ignored; there is a test for exactly that.
2. **`SET LOCAL` is transaction-scoped**, so a pooled connection cannot carry one
   request's identity into the next. Tested by interleaving two identities
   across a pool smaller than the number of reads.
3. **The connecting role cannot bypass the policies.** `kkl_app` does not own the
   tables, is not a superuser, and has `NOBYPASSRLS`; the tables have
   `FORCE ROW LEVEL SECURITY`. `architecture.md` §5 names the demo's mistake —
   RLS enabled with no policies, reached through a role that bypasses it — and
   `tests/rls.test.mjs` asserts each of those three facts directly.
4. **Authorization is written twice.** Each handler checks role and ownership,
   and the database enforces the same rule underneath. The RLS tests bypass the
   handlers entirely: if the application checks were the only thing separating
   two accounts, every assertion in that file would fail.

## 3. What the evidence does and does not cover

| Evidence | Establishes | Does **not** establish |
|---|---|---|
| `verify-lead-request-persistence.mjs` 9/9 | A request survives the service being killed and restarted, with status and history | That the caller was who they said they were |
| `tests/rls.test.mjs` | The database refuses one identity the rows of another, and identity does not leak across pooled connections | How that identity was obtained |
| `tests/lead-requests.test.mjs` | The REST surface refuses an unauthenticated caller, a revoked session, a forged role in the body, and a cross-account read by id | That a session was issued to the right person |
| `tests/durability.test.mjs` | Storage rather than memory | — |

Read together: **given** a correct identity, the system confines it correctly and
durably. Establishing that the identity is correct is the unbuilt part.

## 4. What production requires before this is authentication

Nothing below is built. Each is a kkl-backend item, not a frontend one.

1. **A real authenticator.** Mobile OTP delivery and verification (§4.1–4.2),
   with rate limiting and attempt lockout. Requires a live SMS/WhatsApp
   integration, which the no-live-services boundary currently forbids.
2. **Retire the development authenticator.** `POST /v1/dev/sessions` must not
   exist in a deployed environment. It already returns 404 unless
   `KKL_DEV_AUTH_SECRET` is set; a deployment must leave it unset, and the
   deployment checklist should assert `devAuth: false` on `GET /health`.
3. **Session transport.** kkl-web holds bearer tokens server-side today because
   there is one sample identity and no sign-in. Real sessions are httpOnly,
   secure, sameSite cookies per §4.4, with a short-lived access token and a
   refresh mechanism.
4. **Per-request identity from the signed-in user**, not from a process-level
   cache. The cache in `src/lib/services/backend/lead-requests.ts` exists only
   because there is exactly one Seller and one staff member; it must not survive
   the arrival of sign-in.
5. **Admin identity.** `SAMPLE_STAFF` is a constant. Real staff need accounts,
   sign-in, roles and an audit trail tied to a person — D-16, open.
6. **Secret handling.** `KKL_LEAD_REQUESTS_DEV_SECRET` is a review-time shared
   secret passed between two local processes. Production credentials belong in a
   secret store, never in a repository or a bundle.

## 5. The sentence to use when describing CR03

> Lead requests are stored durably in PostgreSQL and isolated per account by
> row-level security the application role cannot bypass, verified by restarting
> the service and by querying past the application code. Authentication is not
> built: identities are issued by a development authenticator for review, and a
> production authenticator (mobile OTP, session cookies, real staff accounts) is
> an outstanding kkl-backend dependency.

Anything shorter than that overstates it.
