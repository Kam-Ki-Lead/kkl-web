# Demonstrating the changed journeys

Four walkthroughs, ten to fifteen minutes in total. Each names what to point at
and — just as important — what to say about what is *not* real, so nobody leaves
the room with a wrong impression.

## Before you start

```sh
# One terminal: the frontend, as a production build. Not `next dev`.
cd kkl-web
NEXT_PUBLIC_KKL_ENV=review NEXT_PUBLIC_KKL_DATA_SOURCE=sample npx next build
KKL_ENV=review KKL_DATA_SOURCE=sample npx next start -p 3811
```

Journeys 1, 3 and 4 need nothing else. **Journey 2 needs kkl-backend** if you
want to show that lead requests genuinely persist:

```sh
# Second terminal: PostgreSQL 16 must be running and the database created.
cd kkl-backend   # branch claude/cr03-lead-requests
MIGRATE_DATABASE_URL='postgres://postgres@127.0.0.1:5433/kkl' npm run migrate
DATABASE_URL='postgres://kkl_app@127.0.0.1:5433/kkl' \
KKL_DEV_AUTH_SECRET='local-review-secret' PORT=4010 npm start

# Then restart the frontend with three extra variables:
KKL_ENV=review KKL_DATA_SOURCE=sample \
KKL_LEAD_REQUESTS=backend \
KKL_LEAD_REQUESTS_BASE_URL=http://127.0.0.1:4010 \
KKL_LEAD_REQUESTS_DEV_SECRET=local-review-secret \
npx next start -p 3811
```

To start from a clean slate at any point: open
`http://127.0.0.1:3811/seller/review-state?reset=1&to=/seller`.

---

## 1 · Owner submission → Admin review  *(≈4 min)*

1. **`/post-property`** — "this is the individual owner, not a broker and not a
   builder." Point at *no subscription and nothing to buy*.
2. Press **Start a listing**. You land on step 1 of 6, at its own URL.
3. **Fill only the title and press Save draft.** Point out that it saved while
   the rest is empty — an owner who knows one thing should be able to record it.
4. **Type a price as words** on step 3 ("seven lakh") and save. It is refused
   with a field message. *"Absence is allowed; a wrong value is not."*
5. **Step 4, choose two photographs.** They are listed by name, the first marked
   as cover, each labelled **not stored**. Say it plainly: *"The picker is real;
   the files are not kept. Media storage is a backend dependency that does not
   exist yet, and the screen says so rather than showing you a grey box."*
6. **Step 6, the preview.** The button says **Send for review**, never Publish,
   and the line beneath says nothing publishes and nothing is charged.
7. Send it. The confirmation says **Sent for review**, *not published*, *nothing
   charged*, with the reference.
8. **Go back to `/owner/listings/<id>/basics`.** It refuses to edit and offers
   withdraw — the listing is with the team.
9. **Switch to `/admin/owner-listings`.** Same submission, labelled *individual
   owner*. Point at the standing notice: **there is no publish action here.**
10. Open it. Write a **message to the owner**, then switch the toggle and add an
    **internal note**. Reload the owner's page: the message is there, the note is
    nowhere — *"not hidden; the owner's record has no field that could carry
    it."*
11. Record a decision with an empty reason — refused. Add one; the owner sees the
    outcome and the reason.
12. Choose **Clear it**. A warning appears *before* you record it: clearing does
    not publish. Afterwards the owner's listing reads **"Cleared — not
    published"**, and `/search` does not carry it.

**Say:** drafts live for the session only; publication terms are still open.

## 2 · Seller lead request → Admin response → Seller update  *(≈4 min)*

1. **`/seller/requests/new`** — fill the area with the searchable locality field,
   a configuration, a quantity, and send.
2. You get a **reference** and land on the request. Point at the closing line:
   with the backend running it reads *"Requests are saved by the lead-request
   service and stay available after it restarts."* Without it, the same line
   reads *"kept for the session only."* **The sentence is read from
   configuration, not written into the page.**
3. **`/admin/requests`** — the same request, with the requester.
4. Send a **public reply**, then add an **internal note**. On the Seller's view
   the reply appears and the note does not — in the HTML as well as on screen.
5. **Change the status** with a reason. The Seller sees the new status, the
   reason and the history entry.
6. **The moment worth staging:** in the backend terminal, `Ctrl-C` the service
   and start it again. Reload the Seller's request — it is still there, with its
   status and its history. *"That is the difference between stored and
   remembered."*
7. If asked about isolation: `tests/rls.test.mjs` queries the database directly,
   past the application code, and a second account gets nothing.

**Say:** authentication is not built — identities are issued for review. See
`cr03-authentication-boundary.md`. Do not describe this as a secure login.

## 3 · Lead purchase → order detail  *(≈3 min)*

1. **`/seller/leads`** — the entry is **Buy Leads**. Open a lead: the preview has
   no contact details *in the markup*, not merely hidden.
2. **Buy it.** The review screen shows the price, the balance and the order of
   operations: credits are deducted first, and the lead is released only because
   that succeeded.
3. The result releases the contact details and carries an **order reference** as
   a link.
4. **`/seller/orders`** — My purchases. Open the order.
   - **Payment** names wallet credits and points at the **ledger entry**, so the
     deduction can be traced rather than taken on trust.
   - **Invoice** says there is no separate document *and why* — no download that
     leads nowhere, no invented tax line.
   - There is **no refund or cancel control**, and the page says why.
5. If you want to show duplicate handling: open the confirm screen for another
   lead in two tabs, copy the first tab's hidden `idempotencyKey` into the
   second, and submit both. The second says **"This is the purchase you already
   made"** and files no second order.

**Say:** no payment provider is chosen and none is contacted; a cart and a
gateway alternative are a later addition.

## 4 · Verification cases and the Admin queue  *(≈3 min)*

1. **`/seller/verification`** — read the top banner: **no provider selected**,
   checks run by a labelled sample service, no compliance claimed.
2. Walk the table. Browsing and enquiring read **Not required**, and the sentence
   beside them says *"This is not a verification and no check has been passed."*
   *"Not required is not Verified — that distinction is the whole change."*
3. Point at the **Request leads** row: **Not required**, reading *"You can submit
   a lead request without verification. Verification is required before
   purchasing leads."* Contrast it with **Buy a lead** below, which still
   requires a check — the decision covered requesting and nothing else.
   The customer screen says nothing about who decided that or when, on purpose.
   If somebody asks, the record is on the Admin case detail under **Policy
   record**, and in `decisions-received.md`.
4. **Buy a lead** requires a check and has a **case with a reference** and a
   visible history.
5. **Drive the provider to an outage:**
   `/seller/review-state?provider=unavailable&to=/seller/verification`, then press
   **Send to the sample verification service**. A new history entry appears and
   the case stays with a person. *"An outage is not a pass. That is the failure
   mode this was built to make impossible."*
6. **`/admin/verification`** — two sections: **Needs a person**, and **With the
   service**. *"Routine processing must not bury the cases that need someone, and
   must not look lost either."*
7. Open a case. Try a decision with no reason — refused. Add one: it lands in the
   case history and in `/admin/audit` with before and after.
8. Close with the sentence on the decision form: this decides verification only —
   it does not suspend an account and does not publish or hold a listing.

**Say:** no identity document is collected anywhere in this build.

---

## The four sentences worth rehearsing

- *"Sent for review — not published, nothing charged."* (CR02)
- *"Stored, not remembered — here is the service restarting."* (CR03)
- *"The money is traceable to a ledger entry, not asserted."* (CR04)
- *"Not required is not Verified, and an outage is not a pass."* (CR07)
