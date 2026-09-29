/**
 * Slices B and C connected — profiles and the owner posting journey served by
 * kkl-backend, driven through the approved screens.
 *
 * The checks that matter are the ones a sample store cannot pass: a value
 * saved on a screen is still there after the process that stored it has been
 * killed and restarted; another account cannot read or change it; and a
 * staff-only note never reaches the owner's page.
 *
 * Run (kkl-web built and serving on 3811 with KKL_PROFILES=backend and
 * KKL_LISTINGS=backend, kkl-backend answering):
 *   BACKEND_DIR=/path/to/kkl-backend BACKEND_URL=http://127.0.0.1:4010 \
 *   DATABASE_URL=... KKL_DEV_AUTH_SECRET=local-review-secret \
 *   PLAYWRIGHT=/path/to/playwright/index.mjs \
 *   node scripts/verify-listing-integration.mjs
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
    stdio: ['ignore', 'ignore', openSync(process.env.BACKEND_LOG ?? '/tmp/kkl-backend-listings.log', 'a')],
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
  return (await res.json()).token;
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
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};

if (!(await backendUp())) {
  console.error(`kkl-backend is not answering at ${BACKEND_URL}. Start it first.`);
  process.exit(2);
}

const marker = randomUUID().slice(0, 8).toUpperCase();
const browser = await chromium.launch();
const ctx = await browser.newContext();

try {
  // ------------------------------------------------- 1. the profile screen
  const profile = await ctx.newPage();
  await profile.goto(`${BASE}/account/profile`, { waitUntil: 'networkidle' });
  await profile.fill('#fullName', `Ritwik Sen ${marker}`);
  await profile.fill('#email', `ritwik.${marker.toLowerCase()}@example.com`);
  await profile.click('button[type="submit"]');
  await profile.waitForLoadState('networkidle');

  await profile.reload({ waitUntil: 'networkidle' });
  const afterReload = await profile.inputValue('#fullName');
  ok('1. A profile saved on the screen is there after a reload',
    afterReload === `Ritwik Sen ${marker}`,
    `the form reads "${afterReload}"`);

  // ---------------------------------------- 2. the owner journey, on screen
  const start = await ctx.newPage();
  await start.goto(`${BASE}/post-property`, { waitUntil: 'networkidle' });
  // The button runs a server action that redirects, so wait for the URL it
  // redirects to rather than for the network to go quiet — prefetches keep it
  // busy and networkidle returns before the navigation lands.
  await Promise.all([
    start.waitForURL(/\/owner\/listings\/[0-9a-f-]{36}/, { timeout: 20000 }),
    start.click('form button:has-text("Start a")'),
  ]);
  const draftUrl = start.url();
  const listingId = draftUrl.match(/\/owner\/listings\/([0-9a-f-]{36})/)?.[1] ?? null;
  ok('2. Starting a listing creates a draft in the database',
    listingId !== null,
    `the owner is on ${draftUrl.replace(BASE, '')}`);

  const step = async (name, fill) => {
    const page = await ctx.newPage();
    await page.goto(`${BASE}/owner/listings/${listingId}/${name}`, { waitUntil: 'networkidle' });
    await fill(page);
    const saved = page.waitForResponse((r) => r.request().method() === 'POST' && r.status() < 400,
      { timeout: 20000 });
    await page.click('button:has-text("Save")');
    await saved;
    await page.waitForLoadState('networkidle');
    await page.close();
  };

  await step('basics', async (page) => {
    await page.fill('#title', `Two-bedroom flat ${marker}`);
    await page.check('input[name="intent"][value="sell"]');
    await page.selectOption('#propertyType', 'apartment');
  });
  await step('location', async (page) => {
    await page.fill('#locality', 'Salt Lake');
    await page.press('#locality', 'Enter');
  });
  await step('pricing', async (page) => {
    await page.fill('#price', '7200000');
    await page.selectOption('#configuration', '2');
  });
  await step('contact', async (page) => {
    await page.fill('#contactName', `Arindam ${marker}`);
    await page.check('input[name="contactPreference"][value="either"]');
  });

  const saved = await ctx.newPage();
  await saved.goto(`${BASE}/owner/listings/${listingId}`, { waitUntil: 'networkidle' });
  const savedText = (await saved.textContent('body')) ?? '';
  ok('3. What was typed on four steps comes back on the listing page',
    savedText.includes(`Two-bedroom flat ${marker}`) && savedText.includes('Salt Lake')
      && savedText.includes('72,00,000'),
    'title, locality and price all rendered from the record');

  // -------------------------------- 4. kill the backend, bring it back, read
  await stopBackend();
  const whileDown = await ctx.newPage();
  const downResponse = await whileDown.goto(`${BASE}/owner/listings/${listingId}`,
    { waitUntil: 'domcontentloaded' });
  const downText = (await whileDown.textContent('body')) ?? '';
  ok('4. With kkl-backend down the page fails rather than inventing a draft',
    !downText.includes(`Two-bedroom flat ${marker}`),
    `HTTP ${downResponse?.status()} and no listing rendered from process memory`);
  await startBackend();

  const after = await ctx.newPage();
  await after.goto(`${BASE}/owner/listings/${listingId}`, { waitUntil: 'networkidle' });
  const afterText = (await after.textContent('body')) ?? '';
  ok('5. The draft is still there after kkl-backend restarts',
    afterText.includes(`Two-bedroom flat ${marker}`) && afterText.includes('72,00,000'),
    'rendered by a process that did not create it');

  // ------------------------------------------- 6. another account cannot look
  const stranger = await sessionFor('owner', `verify-stranger-${marker}`, 'Someone Else');
  const peek = await api(stranger, `/v1/listings/${listingId}`);
  const poke = await api(stranger, `/v1/listings/${listingId}`, {
    method: 'PATCH', body: JSON.stringify({ title: 'Mine now' }),
  });
  const strangerList = await api(stranger, '/v1/listings');
  ok('6. Another account can neither read nor change the draft',
    peek.status === 404 && poke.status === 404
      && !strangerList.body.listings.some((l) => l.id === listingId),
    `read ${peek.status}, write ${poke.status}, and it is absent from their own list`);

  // ------------------------------------ 7. staff notes stay on the staff side
  const ownerToken = await sessionFor('owner', 'kkl-web:sample-owner', 'Arindam Basu');
  const staff = await sessionFor('staff', 'kkl-web:sample-staff', 'A. Dutta · Operations');
  await api(ownerToken, `/v1/listings/${listingId}/media`, {
    method: 'POST',
    body: JSON.stringify({ kind: 'image', contentType: 'image/jpeg', byteSize: 250000, fileName: `front-${marker}.jpg` }),
  });
  await api(ownerToken, `/v1/listings/${listingId}/submission`, {
    method: 'POST', body: JSON.stringify({ idempotencyKey: `submit-${marker}` }),
  });
  const secret = `INTERNAL-${marker}`;
  await api(staff, `/v1/listings/${listingId}/decision`, {
    method: 'POST',
    body: JSON.stringify({
      to: 'changes_requested',
      reason: 'Please add the floor number.',
      note: `${secret} — third submission from this account`,
    }),
  });

  const ownerView = await ctx.newPage();
  await ownerView.goto(`${BASE}/owner/listings/${listingId}`, { waitUntil: 'networkidle' });
  const ownerText = (await ownerView.textContent('body')) ?? '';
  ok('7. The staff-only note is absent from the owner page, and the reason is not',
    !ownerText.includes(secret) && ownerText.includes('Please add the floor number.'),
    'the policy removes the row; the owner sees the decision and its reason');

  const adminView = await ctx.newPage();
  await adminView.goto(`${BASE}/admin/owner-listings/${listingId}`, { waitUntil: 'networkidle' });
  const adminText = (await adminView.textContent('body')) ?? '';
  ok('8. Staff see the submission and their own note',
    adminText.includes(`Two-bedroom flat ${marker}`) && adminText.includes(secret),
    'the same record, with the internal trail');

  // ------------------------- 9. nothing was uploaded, and nothing is published
  ok('9. The photograph is recorded as chosen and not kept',
    ownerText.toLowerCase().includes('not kept') || ownerText.toLowerCase().includes('not stored')
      || ownerText.toLowerCase().includes('no file'),
    'the owner page says the file was not retained rather than showing a successful upload');

  const publish = await api(staff, `/v1/listings/${listingId}/decision`, {
    method: 'POST', body: JSON.stringify({ to: 'published', reason: 'Looks fine.' }),
  });
  const portal = await fetch(`${BASE}/search`).then((r) => r.text());
  ok('10. Publication is unavailable, and the portal shows no owner listing',
    publish.status === 503 && publish.body.code === 'publication_not_decided'
      && !portal.includes(`Two-bedroom flat ${marker}`),
    `HTTP ${publish.status} ${publish.body.code}; the listing is nowhere public`);
} finally {
  await browser.close();
  if (!(await backendUp())) await startBackend();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
process.exit(failed.length ? 1 : 0);
