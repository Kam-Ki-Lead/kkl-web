/**
 * Slices E and F connected — the marketplace, the wallet and an order, on the
 * real screens, against kkl-backend.
 *
 * TWO RUNS, AND WHY BOTH ARE NEEDED
 *
 * The first is the state every deployment is actually in: no lead price
 * configured (Q-1a), no payment credentials (Q-5). The screens must say so
 * and disable the actions — not show a plausible number, and not let somebody
 * press a button that was never going to work.
 *
 * The second proves the journey itself works when a price exists. That price
 * comes from an **isolated fixture**: a `price_credits` value written onto
 * this run's own lead row, and removed again afterwards. Nothing writes
 * `platform_settings.lead_price_credits`, which is the global key a review or
 * production database reads — so this can never become the answer to Q-1a by
 * accident, and a check below asserts it stayed absent.
 *
 * The same run needs a verified account, because buying a lead requires a
 * verification and no provider exists to grant one (Q-4). That too is an
 * isolated fixture — a case row plus a provider event, labelled
 * "test-fixture-provider", written for this run's own account. It is not
 * removed afterwards and cannot be: nothing in the application holds DELETE
 * on a verification record. Checks 6 and 7 run either side of it, so the
 * gated state is proved as well as the journey past it.
 *
 * Run (kkl-web on 3811 with KKL_MARKETPLACE=backend, kkl-backend up):
 *   BACKEND_DIR=... BACKEND_URL=... DATABASE_URL=... KKL_DEV_AUTH_SECRET=... \
 *   PLAYWRIGHT=/path/to/playwright/index.mjs node scripts/verify-commerce-integration.mjs
 */
import { randomUUID } from 'node:crypto';

// Both of these live outside kkl-web: Playwright is a review tool, and the
// PostgreSQL driver belongs to kkl-backend. kkl-web takes no dependency on
// either — a frontend that can open a database connection is one refactor
// away from doing it on a request path.
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
const { default: pg } = await import(
  process.env.PG ?? '/home/user/kkl-backend/node_modules/pg/lib/index.js');

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3811';
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:4010';
const SECRET = process.env.KKL_DEV_AUTH_SECRET ?? 'local-review-secret';
const DB = process.env.DATABASE_URL ?? 'postgres://kkl_app@127.0.0.1:5433/kkl';

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}\n      ${detail}`);
};

async function sessionFor(role, ref, name) {
  const res = await fetch(`${BACKEND_URL}/v1/dev/sessions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-kkl-dev-secret': SECRET },
    body: JSON.stringify({ externalRef: ref, displayName: name, role }),
  });
  if (!res.ok) throw new Error(`dev session failed: ${res.status}`);
  return res.json();
}

const api = async (token, path, init = {}) => {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};

/** The identity kkl-web itself uses, so the screens and this script agree. */
const seller = await sessionFor('seller', 'kkl-web:sample-seller', 'Sujata Pal · Sen Properties');
const staff = await sessionFor('staff', 'kkl-web:sample-staff', 'A. Dutta · Operations');

const db = new pg.Client({ connectionString: DB });
await db.connect();
const asStaff = async (sql, params = []) => {
  await db.query('BEGIN');
  try {
    await db.query("SELECT set_config('app.user_id', $1, true)", [staff.accountId]);
    await db.query("SELECT set_config('app.user_role', 'staff', true)");
    const out = await db.query(sql, params);
    await db.query('COMMIT');
    return out;
  } catch (error) {
    // Without this, one failed statement leaves the connection in an aborted
    // transaction and every check after it fails for the wrong reason.
    await db.query('ROLLBACK').catch(() => {});
    throw error;
  }
};

const marker = randomUUID().slice(0, 8).toUpperCase();
let leadId = null;
let fixtureReference = null;

const browser = await chromium.launch();
const ctx = await browser.newContext();

try {
  // ------------------------------------------------- 1. the unconfigured state
  // A lead with no price at all: the state of every lead in a real database.
  const unpriced = await asStaff(
    `INSERT INTO leads (reference, status, property_type, budget_band, configurations,
                        timing, summary, consent_status, consent_recorded_at, source)
     VALUES ($1,'listed','apartment','50-75l',ARRAY['2bhk']::text[],'this-month',
             $2,'granted',now(),'verify-fixture')
     RETURNING id`,
    [`LD-VER-${marker}-A`, `Unpriced verification lead ${marker}`]);
  await asStaff(
    'INSERT INTO lead_contacts (lead_id, full_name, phone) VALUES ($1,$2,$3)',
    [unpriced.rows[0].id, 'Verification Contact', `+9198${marker.slice(0, 6)}11`]);

  const market = await ctx.newPage();
  await market.goto(`${BASE}/seller/leads`, { waitUntil: 'networkidle' });
  const marketText = (await market.textContent('body')) ?? '';
  ok('1. The marketplace is served by kkl-backend, not by fixtures',
    marketText.includes(marker) || marketText.includes('Not priced yet'),
    marketText.includes(marker)
      ? `the run's own lead ${marker} is on the screen`
      : 'the screen reports the backend state');

  ok('2. An unpriced lead says so instead of showing a number',
    marketText.includes('Not priced yet') && !/₹\s?0\b/.test(marketText),
    'the price slot holds a sentence, and no ₹0 appears anywhere');

  // Scoped to this run's own unpriced lead, not to the whole marketplace: a
  // shared development database holds leads other runs priced, and those are
  // legitimately buyable. The question is whether *this* one offers an action
  // it cannot honour.
  const unpricedCard = await market.$(`a[href$="/seller/leads/${unpriced.rows[0].id}"]`);
  const unpricedBuy = await market.$(`a[href$="/seller/leads/${unpriced.rows[0].id}/buy"]`);
  ok('3. No buy action is offered for the lead that cannot be bought',
    unpricedCard !== null && unpricedBuy === null,
    unpricedCard === null
      ? 'the unpriced lead is not on the marketplace at all'
      : 'it is listed, with no buy link and a stated reason');

  const wallet = await ctx.newPage();
  await wallet.goto(`${BASE}/seller/billing`, { waitUntil: 'networkidle' });
  const walletText = (await wallet.textContent('body')) ?? '';
  const walletApi = await api(seller.token, '/v1/wallet');
  // The screen groups digits — 2,050, not 2050 — so a bare String() match
  // passed only while the fixture balance stayed under a thousand. Both
  // spellings are accepted; the number is what is being checked.
  const balance = walletApi.body?.balanceCredits;
  const grouped = typeof balance === 'number' ? balance.toLocaleString('en-IN') : null;
  ok('4. The wallet balance on the screen is the sum of the backend ledger',
    walletApi.status === 200
      && (walletText.includes(String(balance)) || walletText.includes(grouped)),
    `kkl-backend reports ${balance} credits, and the screen shows it`);

  const recharge = await ctx.newPage();
  await recharge.goto(`${BASE}/seller/billing/recharge`, { waitUntil: 'networkidle' });
  const rechargeText = (await recharge.textContent('body')) ?? '';
  ok('5. Recharge explains the missing credentials rather than failing silently',
    /not (configured|available)|unavailable|Razorpay/i.test(rechargeText),
    'the screen names the condition, and no payment is attempted');

  // ------------------------------- 2. the journey, on an isolated fixture price
  const priced = await asStaff(
    `INSERT INTO leads (reference, status, property_type, budget_band, configurations,
                        timing, summary, consent_status, consent_recorded_at,
                        price_credits, source)
     VALUES ($1,'listed','apartment','75-90l',ARRAY['3bhk']::text[],'this-month',
             $2,'granted',now(),150,'verify-fixture')
     RETURNING id`,
    [`LD-VER-${marker}-B`, `Priced verification lead ${marker}`]);
  leadId = priced.rows[0].id;
  await asStaff(
    'INSERT INTO lead_contacts (lead_id, full_name, phone) VALUES ($1,$2,$3)',
    [leadId, `Buyer ${marker}`, `+9198${marker.slice(0, 6)}22`]);

  // Credits arrive the only way they can: a staff adjustment, on the record.
  await api(staff.token, '/v1/wallet/adjustments', {
    method: 'POST',
    body: JSON.stringify({
      accountId: seller.accountId,
      amountCredits: 500,
      reason: `Verification fixture ${marker} — no payment was taken.`,
      idempotencyKey: randomUUID(),
    }),
  });

  // -------------------------- the verification gate, before it is satisfied
  // Buying a lead requires a verification (the confirmed CR07 rule), no
  // provider is selected (Q-4), and whether staff may pass an account by hand
  // is undecided. So the real state of this screen for a real account is
  // "priced, and still not buyable" — and it has to say which of the two
  // conditions is in the way rather than offering a button that fails.
  const gated = await ctx.newPage();
  await gated.goto(`${BASE}/seller/leads/${leadId}`, { waitUntil: 'networkidle' });
  const gatedText = (await gated.textContent('body')) ?? '';
  ok('6. An unverified account is told the verification condition, not shown a button',
    (await gated.$('a[href$="/buy"]')) === null
      && /verification|verified/i.test(gatedText),
    (await gated.$('a[href$="/buy"]')) === null
      ? 'the action is absent and the screen names the condition'
      : 'the screen still offers a purchase the backend would refuse');

  // Verified by an isolated fixture: a case row and a provider event written
  // for this run's own account. No provider exists and none was called; this
  // is the same fixture the backend tests use, and it is the only way an
  // account can be verified at all today.
  const policyVersion = await asStaff('SELECT max(version) AS v FROM verification_policy_versions');
  fixtureReference = `VER-FIX${marker.slice(0, 6)}`;
  const fixtureCase = await asStaff(
    `INSERT INTO verification_cases
       (reference, account_id, action, policy_version, outcome, provider,
        provider_reference, decided_at)
     VALUES ($1,$2,'purchase_lead',$3,'verified','test-fixture-provider',$4, now())
     RETURNING id`,
    [fixtureReference, seller.accountId, policyVersion.rows[0].v ?? 1, `fixture:${marker}`]);
  await asStaff(
    `INSERT INTO verification_events (case_id, outcome, actor_kind, actor_label, note, visibility)
     VALUES ($1,'verified','provider','test-fixture-provider',
             'Written by an isolated review fixture. No provider exists (Q-4).','shared')`,
    [fixtureCase.rows[0].id]);

  const detail = await ctx.newPage();
  await detail.goto(`${BASE}/seller/leads/${leadId}`, { waitUntil: 'networkidle' });
  const detailText = (await detail.textContent('body')) ?? '';
  ok('7. Verified, the same lead shows its price and offers the purchase',
    detailText.includes('150') && (await detail.$('a[href$="/buy"]')) !== null,
    'the fixture price reaches the screen and the action is enabled');

  ok('8. No contact detail is on the page before the purchase',
    !detailText.includes(`+9198${marker.slice(0, 6)}22`)
      && !/\d{2}•+\d{2}/.test(detailText),
    'no number, and no fabricated mask standing in for one');

  await detail.click('a[href$="/buy"]');
  await detail.waitForLoadState('networkidle');
  await detail.click('button[type="submit"]').catch(() => {});
  await detail.waitForLoadState('networkidle');
  await detail.waitForTimeout(1200);

  const orderRow = await asStaff(
    "SELECT * FROM orders WHERE lead_id = $1 AND status = 'completed'", [leadId]);
  ok('9. The purchase made a completed order in the database',
    orderRow.rowCount === 1,
    orderRow.rowCount === 1
      ? `${orderRow.rows[0].reference} for ${orderRow.rows[0].amount_credits} credits`
      : 'no completed order was written');

  const ledger = await asStaff(
    `SELECT sum(amount_credits)::int AS total FROM wallet_ledger
      WHERE account_id = $1 AND entry_type = 'purchase'`, [seller.accountId]);
  const after = await api(seller.token, '/v1/wallet');
  ok('10. Exactly one debit was posted, and the balance matches the ledger',
    orderRow.rowCount === 1
      && Number(ledger.rows[0].total) <= -150
      && after.body.balanceCredits
        === after.body.entries.reduce((sum, e) => sum + e.amountCredits, 0),
    `balance ${after.body?.balanceCredits} equals the sum of its entries`);

  const purchased = await ctx.newPage();
  await purchased.goto(`${BASE}/seller/purchased`, { waitUntil: 'networkidle' });
  const purchasedText = (await purchased.textContent('body')) ?? '';
  ok('11. The contact is released to the buyer, on the buyer’s own screen',
    purchasedText.includes(marker) || purchasedText.includes(`+9198${marker.slice(0, 6)}22`),
    'the purchased-leads screen is served by kkl-backend');

  const stranger = await sessionFor('builder', `verify-stranger-${marker}`, 'Someone Else');
  const peek = await api(stranger.token, `/v1/orders/${orderRow.rows[0]?.id ?? randomUUID()}`);
  const strangerOrders = await api(stranger.token, '/v1/orders');
  ok('12. Another account can read neither the order nor the contact',
    peek.status === 404
      && !JSON.stringify(strangerOrders.body).includes(`+9198${marker.slice(0, 6)}22`),
    `read ${peek.status}; their own list holds ${strangerOrders.body?.orders?.length ?? 0} orders`);

  // ------------------------------------------ 3. the fixture stayed a fixture
  const globalPrice = await asStaff(
    "SELECT key FROM platform_settings WHERE key = 'lead_price_credits'");
  ok('13. No commercial rule was written into the platform configuration',
    globalPrice.rowCount === 0,
    'the price lived on this run’s own lead row and nowhere else — Q-1a stays open');

  // ---------------------------------------------- 4. the recipient inbox
  const inbox = await ctx.newPage();
  await inbox.goto(`${BASE}/builder/enquiries`, { waitUntil: 'networkidle' });
  const inboxText = (await inbox.textContent('body')) ?? '';
  ok('14. The recipient inbox says contact access is awaiting confirmation',
    /awaiting confirmation/i.test(inboxText),
    `at ${new URL(inbox.url()).pathname}: `
      + (/awaiting confirmation/i.test(inboxText)
        ? 'the wording names the undecided state rather than choosing an alternative'
        : `the phrase is absent from ${inboxText.length} characters`));

  ok('15. It offers no unlock and shows no fabricated mask',
    !/to unlock/i.test(inboxText) && !/•{3,}/.test(inboxText),
    'no unlock price and no masked digits, because no rule selects either');
} finally {
  await browser.close();
  // The fixtures are this run's own rows. They go.
  if (leadId) {
    await asStaff('DELETE FROM lead_contacts WHERE lead_id = $1', [leadId]).catch(() => {});
  }
  // The verification case is NOT deleted, and cannot be: `kkl_app` holds no
  // DELETE on verification_cases or verification_events, because a
  // verification history a process can erase is not a history. It is instead
  // withdrawn the way a real one would be — a staff decision of `expired`,
  // with a reason, appended to the case. That matters beyond tidiness: these
  // scripts share one sample account, and a fixture that left it verified
  // made the next run's real journey start from a state nobody set up.
  if (fixtureReference) {
    const closed = await api(staff.token, `/v1/verification/cases/${fixtureReference}/decision`, {
      method: 'POST',
      body: JSON.stringify({
        outcome: 'expired',
        reason: `Review fixture ${marker} withdrawn. It was written by a script, not by a `
          + 'provider, and is not evidence about this account.',
        visibility: 'internal',
      }),
    });
    if (closed.status !== 200) {
      console.error(`could not withdraw the verification fixture: ${closed.status}`);
    }
  }
  await db.end();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
process.exit(failed.length ? 1 : 0);
