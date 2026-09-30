/**
 * A-18, A-19 and A-28 connected — wallet oversight, a credit adjustment and
 * the suppression list, on the real screens against kkl-backend.
 *
 * WHY THIS EXISTS
 * All three capabilities were implemented, policy-enforced and tested in
 * kkl-backend, and all three were unreachable from any screen. One of them
 * was unreachable through the API as well: the wallet read took an account
 * identifier that no route ever passed, so a staff member asking for
 * somebody else's wallet got their own — a zero balance that reads as an
 * answer. Tests at the domain level cannot catch that. This can.
 *
 * WHAT IT WILL NOT DO
 * Show an address from the suppression list. There is none to show: the
 * table holds a SHA-256 and the response has no field for a plaintext
 * address. Check 7 asserts the screen says so rather than rendering dots,
 * which would claim a value was being withheld.
 *
 * Run (kkl-web on 3811 with KKL_ADMIN_OPERATIONS=backend, kkl-backend up):
 *   BACKEND_URL=... DATABASE_URL=... KKL_DEV_AUTH_SECRET=... \
 *   PG=../kkl-backend/node_modules/pg/lib/index.js \
 *   PLAYWRIGHT=/path/to/playwright/index.mjs node scripts/verify-admin-operations.mjs
 */
import { randomUUID } from 'node:crypto';

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
    },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};

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
    await db.query('ROLLBACK').catch(() => {});
    throw error;
  }
};

const marker = randomUUID().slice(0, 8).toUpperCase();
const browser = await chromium.launch();
const ctx = await browser.newContext();

try {
  // ------------------------------------------------- 1. wallet oversight
  const funded = await api(staff.token, '/v1/wallet/adjustments', {
    method: 'POST',
    body: JSON.stringify({
      accountId: seller.accountId, amountCredits: 240,
      reason: `Oversight fixture ${marker}`, idempotencyKey: randomUUID(),
    }),
  });
  const walletApi = await api(staff.token, `/v1/wallet?accountId=${seller.accountId}`);

  const wallets = await ctx.newPage();
  await wallets.goto(`${BASE}/admin/wallets`, { waitUntil: 'networkidle' });
  const walletsText = (await wallets.textContent('body')) ?? '';
  const balance = walletApi.body?.balanceCredits;
  // A zero must not satisfy this. It did once — the wallet read ignored the
  // account it was asked about, returned the caller's own empty wallet, and
  // "0" appears on a screen full of numbers, so the check passed while
  // proving nothing.
  ok('1. The wallet list is served by kkl-backend, not by a fixture',
    funded.status === 201
      && typeof balance === 'number' && balance >= 240
      && (walletsText.includes(String(balance))
        || walletsText.includes(Number(balance).toLocaleString('en-IN'))),
    `kkl-backend reports ${balance} credits for the sample Seller, and the screen shows it`);

  ok('2. The account the adjustment named is the one that moved',
    walletApi.body.accountId === seller.accountId,
    'the wallet read honours accountId rather than answering about the caller');

  const ledgerApi = await api(staff.token, `/v1/wallet?accountId=${seller.accountId}`);
  const summed = ledgerApi.body.entries.reduce((sum, e) => sum + e.amountCredits, 0);
  ok('3. The balance on the screen is the sum of the ledger, not a stored number',
    summed === ledgerApi.body.balanceCredits,
    `${ledgerApi.body.entries.length} entries sum to ${summed}`);

  // ------------------------------------------- 2. a staff adjustment, recorded
  const before = ledgerApi.body.balanceCredits;
  const adjust = await ctx.newPage();
  await adjust.goto(`${BASE}/admin/wallets/${seller.accountId}/adjust`,
    { waitUntil: 'networkidle' });
  const adjustLoaded = (await adjust.textContent('body')) ?? '';
  ok('4. The adjustment screen loads against the real account',
    !/not found/i.test(adjustLoaded) && adjustLoaded.length > 200,
    `at /admin/wallets/${seller.accountId.slice(0, 8)}…/adjust`);

  const applied = await api(staff.token, '/v1/wallet/adjustments', {
    method: 'POST',
    body: JSON.stringify({
      accountId: seller.accountId, amountCredits: 60,
      reason: `Screen adjustment ${marker}`, idempotencyKey: randomUUID(),
    }),
  });
  const after = await api(staff.token, `/v1/wallet?accountId=${seller.accountId}`);
  ok('5. An adjustment is a ledger entry with its reason, not an edited number',
    applied.status === 201
      && after.body.balanceCredits === before + 60
      && after.body.entries[0].reason?.includes(marker),
    `${before} → ${after.body.balanceCredits}, and the reason is on the entry`);

  const audited = await asStaff(
    `SELECT action FROM audit_log WHERE reason LIKE $1 ORDER BY created_at DESC LIMIT 1`,
    [`%${marker}%`]);
  ok('6. The adjustment is in the audit log with the reason that was given',
    audited.rowCount === 1,
    audited.rowCount === 1
      ? `recorded as "${audited.rows[0].action}"`
      : 'no audit entry carries the reason');

  // --------------------------------------------- 3. the suppression list
  const address = `verify-${marker.toLowerCase()}@example.test`;
  const suppressed = await api(staff.token, '/v1/notifications/suppressions', {
    method: 'POST',
    body: JSON.stringify({
      channel: 'email', address, reason: `Asked not to be contacted ${marker}`,
    }),
  });

  const consent = await ctx.newPage();
  await consent.goto(`${BASE}/admin/consent`, { waitUntil: 'networkidle' });
  const consentText = (await consent.textContent('body')) ?? '';
  ok('7. The suppression list is on the screen, from kkl-backend',
    suppressed.status === 201 && consentText.includes(marker),
    `this run's own entry (${marker}) is rendered`);

  ok('8. No address is on the screen, and no mask standing in for one',
    !consentText.includes(address)
      && !consentText.includes(address.split('@')[0])
      && !/•{3,}/.test(consentText)
      && /not stored/i.test(consentText),
    'the screen says the address is not stored rather than showing dots');

  ok('9. No digest is on the screen either',
    !/[0-9a-f]{64}/.test(consentText),
    'a hash of an address is a lookup away from the address');

  const html = await consent.content();
  ok('10. Nor is either of them in the page source',
    !html.includes(address) && !/[0-9a-f]{64}/.test(html),
    'absent from the response, not hidden by the rendering');

  // ------------------------------------------ 4. access separation
  const strangerWallets = await api(seller.token, '/v1/wallets');
  const strangerPeek = await api(seller.token, `/v1/wallet?accountId=${staff.accountId}`);
  const strangerList = await api(seller.token, '/v1/notifications/suppressions');
  ok('11. None of this is available to an account that is not staff',
    strangerWallets.status === 403
      && strangerPeek.status === 403
      && strangerList.status === 403,
    `wallets ${strangerWallets.status}, one wallet ${strangerPeek.status}, `
      + `suppressions ${strangerList.status}`);

  // ---------------------------------- 5. the check that needs no list
  const check = await api(staff.token, '/v1/notifications/suppressions/check', {
    method: 'POST', body: JSON.stringify({ channel: 'email', address }),
  });
  const checkOther = await api(staff.token, '/v1/notifications/suppressions/check', {
    method: 'POST', body: JSON.stringify({ channel: 'email', address: `not-${address}` }),
  });
  ok('12. Whether one address is suppressed is answerable without the list',
    check.body.suppressed === true
      && checkOther.body.suppressed === false
      && !JSON.stringify(check.body).includes(address),
    'the answer carries the reason and not the address it was asked about');
} finally {
  await browser.close();
  await db.end();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
process.exit(failed.length ? 1 : 0);
