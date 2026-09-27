/**
 * CR03 — does a lead request actually survive?
 *
 * This is the check the flow suite deliberately does not make. It files a
 * request through the browser, restarts kkl-backend under it, and then asks
 * the same screens for the same record. A store that keeps records in process
 * memory fails at the first read after the restart; that is the point.
 *
 * It also checks the thing a restart cannot: that one account's request is not
 * readable by another. kkl-web has no sign-in, so that check is made against
 * kkl-backend directly, with a second account's session.
 *
 * Run (kkl-web already built and serving, with KKL_LEAD_REQUESTS=backend):
 *   BACKEND_DIR=/path/to/kkl-backend \
 *   BACKEND_URL=http://127.0.0.1:4010 \
 *   DATABASE_URL='postgres://kkl_app@127.0.0.1:5433/kkl' \
 *   KKL_DEV_AUTH_SECRET=local-review-secret \
 *   PLAYWRIGHT=/path/to/playwright/index.mjs \
 *   node scripts/verify-lead-request-persistence.mjs
 */
import { spawn } from 'node:child_process';
import { openSync } from 'node:fs';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';

const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3811';
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:4010';
const BACKEND_DIR = process.env.BACKEND_DIR ?? '/home/user/kkl-backend';
const SECRET = process.env.KKL_DEV_AUTH_SECRET ?? 'local-review-secret';
const BACKEND_PORT = new URL(BACKEND_URL).port;

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}\n      ${detail}`);
};

async function backendUp() {
  try {
    const res = await fetch(`${BACKEND_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function waitFor(predicate, what, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await predicate()) return;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 150));
  }
}

async function stopBackend() {
  // Whatever started it — this script or the operator — is killed by port.
  const ps = spawn('bash', ['-lc',
    `ps -eo pid,args | grep "[s]rc/http/server.mjs" | awk '{print $1}' | xargs -r kill -9`]);
  await once(ps, 'exit');
  await waitFor(async () => !(await backendUp()), 'kkl-backend to stop answering');
}

async function startBackend() {
  const child = spawn(process.execPath, ['src/http/server.mjs'], {
    cwd: BACKEND_DIR,
    env: { ...process.env, PORT: BACKEND_PORT, KKL_DEV_AUTH_SECRET: SECRET },
    // Its own log file, not this script's stderr. A detached child that
    // inherits a pipe keeps that pipe open after this script exits, which
    // leaves anything reading our output waiting forever.
    stdio: ['ignore', 'ignore', openSync(process.env.BACKEND_LOG ?? '/tmp/kkl-backend-restart.log', 'a')],
    detached: true,
  });
  child.unref();
  await waitFor(backendUp, 'kkl-backend to answer');
  return child;
}

if (!(await backendUp())) {
  console.error(`kkl-backend is not answering at ${BACKEND_URL}. Start it first.`);
  process.exit(2);
}

const browser = await chromium.launch();
const ctx = await browser.newContext();

// --------------------------------------------------------- file a request
const marker = `PERSIST-${randomUUID().slice(0, 8).toUpperCase()}`;
const form = await ctx.newPage();
await form.goto(`${BASE}/seller/requests/new`, { waitUntil: 'networkidle' });
await form.fill('#areaId', 'Rajarhat');
await form.press('#areaId', 'Enter');
await form.fill('#quantity', '3');
await form.fill('#notes', `${marker} — filed to be read back after a restart.`);
await Promise.all([
  form.waitForURL(/\/seller\/requests\/[^/?]+\?created=/, { timeout: 20000 }),
  form.click('button:has-text("Send request")'),
]);
const detailUrl = form.url();
const requestId = detailUrl.split('/seller/requests/')[1].split('?')[0];
const reference = new URL(detailUrl).searchParams.get('created');

ok('1. A request is filed and returns a reference',
  Boolean(reference) && (await form.textContent('body')).includes(marker),
  `${reference} carries the marker ${marker}`);

// Move it, so history has something in it to survive too.
const queue = await ctx.newPage();
await queue.goto(`${BASE}/admin/requests/${requestId}`, { waitUntil: 'networkidle' });
await queue.selectOption('#request-status', 'under_review');
await queue.fill('#status-note', `${marker} — moved before the restart.`);
await queue.click('button:has-text("Update status")');
await queue.waitForSelector('text=Status updated', { timeout: 20000 });

// ------------------------------------------------------------- the restart
await stopBackend();

const whileDown = await ctx.newPage();
await whileDown.goto(`${BASE}/seller/requests`, { waitUntil: 'domcontentloaded' });
const downText = await whileDown.textContent('body');
// Three separate things, because "the reference is missing" alone would also
// be satisfied by a blank page: the record must not appear, the screen must
// not claim the Seller has no requests, and it must not have quietly fallen
// back to the in-memory store's own seeded records.
ok('2. With the service down, the screen does not invent or fall back to records',
  !downText.includes(reference) && !downText.includes('No requests yet') && !downText.includes('LR-1042'),
  'no list is fabricated, no empty state is claimed, and the sample store\'s seeded LR-1042 does not appear');

await startBackend();

// ----------------------------------------------------- read the same record
const after = await ctx.newPage();
await after.goto(`${BASE}/seller/requests/${requestId}`, { waitUntil: 'networkidle' });
const afterText = await after.textContent('body');
ok('3. The request is readable after kkl-backend restarts',
  afterText.includes(reference) && afterText.includes(marker),
  `${reference} and its notes render from a process that did not create them`);

ok('4. Its status and history survived too',
  afterText.includes('Under review') && afterText.includes(`${marker} — moved before the restart.`),
  'the status move and the reason recorded with it are both still there');

const list = await ctx.newPage();
await list.goto(`${BASE}/seller/requests`, { waitUntil: 'networkidle' });
ok('5. It is still in the requester\'s list',
  (await list.textContent('body')).includes(reference),
  `${reference} listed after the restart`);

const adminAfter = await ctx.newPage();
await adminAfter.goto(`${BASE}/admin/requests`, { waitUntil: 'networkidle' });
ok('6. It is still in the Admin queue',
  (await adminAfter.textContent('body')).includes(reference),
  `${reference} in the staff queue after the restart`);

// ------------------------------------------- another account cannot read it
// kkl-web has one sample Seller and no sign-in, so this is asked of
// kkl-backend directly, with a session belonging to a different account.
async function session(role, ref) {
  const res = await fetch(`${BACKEND_URL}/v1/dev/sessions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-kkl-dev-secret': SECRET },
    body: JSON.stringify({ externalRef: ref, displayName: `Probe ${role}`, role }),
  });
  if (!res.ok) throw new Error(`session failed: ${res.status}`);
  return (await res.json()).token;
}

const otherToken = await session('seller', `probe-other-${randomUUID()}`);
const otherDirect = await fetch(`${BACKEND_URL}/v1/lead-requests/${requestId}`, {
  headers: { authorization: `Bearer ${otherToken}` },
});
ok('7. Another account reading the request by id gets 404, not the record',
  otherDirect.status === 404,
  `HTTP ${otherDirect.status} — an identifier is not a capability`);

const otherList = await (await fetch(`${BACKEND_URL}/v1/lead-requests`, {
  headers: { authorization: `Bearer ${otherToken}` },
})).json();
ok('8. The request is absent from another account\'s list',
  !JSON.stringify(otherList).includes(reference),
  `${reference} appears nowhere in the other account's ${otherList.requests.length} request(s)`);

const anonymous = await fetch(`${BACKEND_URL}/v1/lead-requests/${requestId}`);
ok('9. With no session at all the service refuses',
  anonymous.status === 401,
  `HTTP ${anonymous.status} without a bearer token`);

await browser.close();

const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} checks passed.`);
if (passed !== results.length) {
  console.log('FAILED:');
  for (const r of results.filter((x) => !x.pass)) console.log(`  - ${r.name}`);
  process.exit(1);
}
