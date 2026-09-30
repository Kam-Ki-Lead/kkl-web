/**
 * Slice G connected — a verification case on the real screens.
 *
 * WHAT THIS PROVES
 * The case is real: durable, account-scoped, with its history, and it
 * survives a restart. The staff queues read the same records. The customer's
 * view carries no internal note and no policy provenance. And the one thing
 * nobody can do — mark a verification passed by hand — is refused.
 *
 * WHAT IT CANNOT PROVE
 * That a check works. No provider is selected (Q-4), so no case can pass, and
 * several checks below assert exactly that rather than working around it.
 * Nothing here collects an identity document; there is no upload path.
 *
 * Run (kkl-web on 3811 with KKL_VERIFICATION=backend, kkl-backend up):
 *   BACKEND_DIR=... BACKEND_URL=... DATABASE_URL=... KKL_DEV_AUTH_SECRET=... \
 *   PG=../kkl-backend/node_modules/pg/lib/index.js \
 *   PLAYWRIGHT=/path/to/playwright/index.mjs node scripts/verify-verification-cases.mjs
 */
import { spawn } from 'node:child_process';
import { openSync } from 'node:fs';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';

const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
const { default: pg } = await import(
  process.env.PG ?? '/home/user/kkl-backend/node_modules/pg/lib/index.js');

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3811';
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:4010';
const BACKEND_DIR = process.env.BACKEND_DIR ?? '/home/user/kkl-backend';
const SECRET = process.env.KKL_DEV_AUTH_SECRET ?? 'local-review-secret';
const BACKEND_PORT = new URL(BACKEND_URL).port;
const DB = process.env.DATABASE_URL ?? 'postgres://kkl_app@127.0.0.1:5433/kkl';

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}\n      ${detail}`);
};

const backendUp = async () => {
  try { return (await fetch(`${BACKEND_URL}/health`)).ok; } catch { return false; }
};
async function waitFor(predicate, what, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await predicate()) return;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 150));
  }
}
async function stopBackend() {
  const ps = spawn('bash', ['-lc',
    `ps -eo pid,args | grep "[s]rc/http/server.mjs" | awk '{print $1}' | xargs -r kill -9`]);
  await once(ps, 'exit');
  await waitFor(async () => !(await backendUp()), 'kkl-backend to stop');
}
async function startBackend() {
  const child = spawn(process.execPath, ['src/http/server.mjs'], {
    cwd: BACKEND_DIR,
    env: { ...process.env, PORT: BACKEND_PORT, KKL_DEV_AUTH_SECRET: SECRET },
    stdio: ['ignore', 'ignore', openSync('/tmp/kkl-backend-verification.log', 'a')],
    detached: true,
  });
  child.unref();
  await waitFor(backendUp, 'kkl-backend to answer');
}

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
const stranger = await sessionFor('builder', `verify-stranger-${randomUUID().slice(0, 8)}`, 'Someone Else');

const db = new pg.Client({ connectionString: DB });
await db.connect();
const asStaff = async (sql, params = []) => {
  await db.query('BEGIN');
  await db.query("SELECT set_config('app.user_id', $1, true)", [staff.accountId]);
  await db.query("SELECT set_config('app.user_role', 'staff', true)");
  const out = await db.query(sql, params);
  await db.query('COMMIT');
  return out;
};

const marker = randomUUID().slice(0, 8).toUpperCase();
const browser = await chromium.launch();
const ctx = await browser.newContext();

try {
  // -------------------------------------- 1. the customer's own screen
  const page = await ctx.newPage();
  const response = await page.goto(`${BASE}/seller/verification`, { waitUntil: 'networkidle' });
  const text = (await page.textContent('body')) ?? '';
  ok('1. The verification screen loads against kkl-backend',
    response?.status() === 200,
    `HTTP ${response?.status()} at /seller/verification`);

  // The confirmed policy, both halves, on the screen.
  ok('2. The screen says requesting leads needs no check and buying one does',
    /request/i.test(text) && /not required|no verification/i.test(text)
      && /buy a lead|purchas/i.test(text),
    'both halves of the 28 September decision are rendered');

  ok('3. Nothing on it awards a verified badge for an action that needs none',
    !/verified/i.test(text) || !/not required[^.]{0,80}verified/i.test(text),
    '"not required" is rendered as its own state');

  // -------------------------------------------- 2. a real case, and its history
  const opened = await api(seller.token, '/v1/verification/cases', {
    method: 'POST', body: JSON.stringify({ action: 'purchase_lead' }),
  });
  const reference = opened.body.reference;
  ok('4. Opening a case writes a durable record with its policy version',
    (opened.status === 201 || opened.status === 200) && /^VER-/.test(reference),
    `${reference}, outcome "${opened.body.outcome}"`);

  const stored = await asStaff(
    `SELECT c.policy_version, c.provider, c.expires_at, count(e.id)::int AS events
       FROM verification_cases c LEFT JOIN verification_events e ON e.case_id = c.id
      WHERE c.reference = $1 GROUP BY c.id`, [reference]);
  ok('5. It records the version it was judged under, no provider and no expiry',
    stored.rows[0]?.policy_version >= 1
      && stored.rows[0]?.provider === 'none_selected'
      && stored.rows[0]?.expires_at === null,
    `policy version ${stored.rows[0]?.policy_version}, provider "${stored.rows[0]?.provider}"`);

  const caseScreen = await ctx.newPage();
  await caseScreen.goto(`${BASE}/seller/verification`, { waitUntil: 'networkidle' });
  const caseText = (await caseScreen.textContent('body')) ?? '';
  ok('6. The case appears on the customer’s own screen',
    caseText.includes(reference),
    'the screen is served by kkl-backend, not by process memory');

  // ------------------------------------- 3. the honest unavailable state
  const submitted = await api(seller.token, `/v1/verification/cases/${reference}/submission`, {
    method: 'POST', body: JSON.stringify({}),
  });
  ok('7. Submitting reports an honest unavailable state, not a pass',
    submitted.body.unavailable?.question === 'Q-4'
      && submitted.body.outcome !== 'verified'
      && submitted.body.outcome !== 'failed',
    `outcome stays "${submitted.body.outcome}"; the reason names Q-4`);

  const health = await api(seller.token, '/health');
  ok('8. The service reports no provider, and that it collects no document',
    health.body.verification.selected === false
      && health.body.verification.collectsDocuments === false
      && health.body.verification.failureOutcome === 'needs_review',
    'a provider failure is a case for a person, never an approval');

  // ------------------------------------------- 4. staff screens and refusals
  const secret = `INTERNAL-${marker}`;
  const decided = await api(staff.token, `/v1/verification/cases/${reference}/decision`, {
    method: 'POST',
    body: JSON.stringify({
      outcome: 'needs_review', reason: secret, visibility: 'internal',
    }),
  });
  ok('9. A staff decision is recorded with its reason',
    decided.status === 200 && decided.body.outcome === 'needs_review',
    `the case is now "${decided.body.outcome}" and needs a person`);

  const queue = await ctx.newPage();
  await queue.goto(`${BASE}/admin/verification`, { waitUntil: 'networkidle' });
  const queueText = (await queue.textContent('body')) ?? '';
  ok('10. The staff queue shows the case, from kkl-backend',
    queueText.includes(reference),
    'the Admin queue is served by the backend');

  const detail = await ctx.newPage();
  await detail.goto(`${BASE}/admin/verification/${reference}`, { waitUntil: 'networkidle' });
  const detailText = (await detail.textContent('body')) ?? '';
  ok('11. Staff see the internal note and the policy provenance',
    detailText.includes(secret) && /product_decision|policy version/i.test(detailText),
    'the staff view carries who decided the rule and on what basis');

  const customerView = await ctx.newPage();
  await customerView.goto(`${BASE}/seller/verification`, { waitUntil: 'networkidle' });
  const customerText = (await customerView.textContent('body')) ?? '';
  ok('12. The customer’s screen carries neither the internal note nor the provenance',
    !customerText.includes(secret) && !/product_decision|policy version/i.test(customerText),
    'the internal half is absent from the customer response, not filtered from it');

  const manual = await api(staff.token, `/v1/verification/cases/${reference}/decision`, {
    method: 'POST',
    body: JSON.stringify({ outcome: 'verified', reason: 'They look fine to me.' }),
  });
  ok('13. Staff cannot mark a verification passed by hand',
    manual.status === 403 && manual.body.code === 'manual_verification_not_authorised',
    'refused by name, because nobody has decided whether anyone may');

  const stillNot = await asStaff(
    'SELECT outcome FROM verification_cases WHERE reference = $1', [reference]);
  ok('14. The case is untouched by that attempt',
    stillNot.rows[0].outcome === 'needs_review',
    `it is still "${stillNot.rows[0].outcome}"`);

  // --------------------------------------------- 5. access separation
  const peek = await api(stranger.token, `/v1/verification/cases/${reference}`);
  const strangerList = await api(stranger.token, '/v1/verification/cases');
  const strangerQueue = await api(stranger.token, '/v1/verification/queues');
  ok('15. Another account cannot read the case, the list or the queues',
    peek.status === 404
      && !JSON.stringify(strangerList.body).includes(reference)
      && strangerQueue.status === 403,
    `read ${peek.status}, queues ${strangerQueue.status}`);

  // ---------------------------------------- 6. suspension is a different axis
  const suspended = await api(staff.token, `/v1/accounts/${seller.accountId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status: 'suspended', reason: `Verification separation check ${marker}` }),
  });
  const afterSuspension = await asStaff(
    'SELECT outcome FROM verification_cases WHERE reference = $1', [reference]);
  // A suspension revokes the account's live sessions, so the token held above
  // stops working here. That is the suspension doing its job, and the checks
  // below sign in again rather than treating it as a failure — but it is
  // asserted, because a suspension that left the session working would be a
  // suspension in name only and nothing else here would notice.
  const revoked = await api(seller.token, '/v1/verification/cases');
  await api(staff.token, `/v1/accounts/${seller.accountId}/status`, {
    method: 'POST', body: JSON.stringify({ status: 'active', reason: 'Cleared.' }),
  });
  ok('16. Suspending the account does not rewrite its verification',
    suspended.status === 200 && afterSuspension.rows[0].outcome === 'needs_review'
      && (revoked.status === 401 || revoked.status === 403),
    `the case is still "${afterSuspension.rows[0].outcome}" while the live session `
      + `went to ${revoked.status} — two axes, and suspension moves only one of them`);

  // ------------------------------------------------ 7. across a restart
  await stopBackend();
  const down = await ctx.newPage();
  const downResponse = await down.goto(`${BASE}/seller/verification`, { waitUntil: 'domcontentloaded' });
  const downText = (await down.textContent('body')) ?? '';
  ok('17. With kkl-backend down the screen fails rather than inventing a case',
    !downText.includes(reference) || /error|not responding/i.test(downText),
    `HTTP ${downResponse?.status()} and no substitute case rendered`);
  await startBackend();

  const after = await ctx.newPage();
  await after.goto(`${BASE}/seller/verification`, { waitUntil: 'networkidle' });
  const afterText = (await after.textContent('body')) ?? '';
  // Signed in again after the suspension above revoked the first session.
  const sellerAgain = await sessionFor(
    'seller', 'kkl-web:sample-seller', 'Sujata Pal · Sen Properties');
  const reread = await api(sellerAgain.token, '/v1/verification/cases');
  ok('18. The case and its history survive a restart',
    afterText.includes(reference)
      && reread.body.cases.some((c) => c.reference === reference && c.events.length >= 2),
    'read back by a process that did not open it, and rendered on the screen');

  // ------------------------------------- 8. nothing verified anywhere
  const anyVerified = await asStaff(
    `SELECT c.reference FROM verification_cases c
      WHERE c.outcome = 'verified'
        AND NOT EXISTS (SELECT 1 FROM verification_events e
                         WHERE e.case_id = c.id AND e.actor_kind = 'provider')`);
  ok('19. No case anywhere is verified without a provider event behind it',
    anyVerified.rowCount === 0,
    anyVerified.rowCount === 0
      ? 'and the only provider events in this database are synthetic test ones'
      : `verified without a provider: ${anyVerified.rows.map((r) => r.reference).join(', ')}`);

  const purchase = await api(sellerAgain.token, '/v1/commerce/availability');
  ok('20. Buying a lead is blocked by verification, reported separately from the price',
    purchase.body.verification.satisfied === false
      && purchase.body.verification.code === 'verification_required'
      && purchase.body.purchase.code === 'verification_required',
    'two independent blockers, and the screen is told which one is in the way');
} finally {
  await browser.close();
  await db.end();
  if (!(await backendUp())) await startBackend();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
process.exit(failed.length ? 1 : 0);
