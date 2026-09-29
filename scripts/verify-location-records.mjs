/**
 * Slice B — are the location records the ones in the database?
 *
 * The sample build carried a module of records, so a locality could only be
 * added by editing code and deploying. The claim now is that staff maintain
 * them and the portal reads them. This checks that claim the only way that
 * means anything: add a locality through the API, and look for it in the
 * picker on a page nobody rebuilt.
 *
 * It also checks the other half — that when kkl-backend is down, the picker
 * fails rather than quietly serving the sample list.
 *
 * Run (kkl-web built and serving on 3811 with KKL_LOCATIONS=backend):
 *   BACKEND_DIR=/path/to/kkl-backend BACKEND_URL=http://127.0.0.1:4010 \
 *   KKL_DEV_AUTH_SECRET=local-review-secret \
 *   PLAYWRIGHT=/path/to/playwright/index.mjs \
 *   node scripts/verify-location-records.mjs
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
  try { return (await fetch(`${BACKEND_URL}/health`)).ok; } catch { return false; }
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
  const ps = spawn('bash', ['-lc',
    `ps -eo pid,args | grep "[s]rc/http/server.mjs" | awk '{print $1}' | xargs -r kill -9`]);
  await once(ps, 'exit');
  await waitFor(async () => !(await backendUp()), 'kkl-backend to stop answering');
}
async function startBackend() {
  const child = spawn(process.execPath, ['src/http/server.mjs'], {
    cwd: BACKEND_DIR,
    env: { ...process.env, PORT: BACKEND_PORT, KKL_DEV_AUTH_SECRET: SECRET },
    stdio: ['ignore', 'ignore', openSync(process.env.BACKEND_LOG ?? '/tmp/kkl-backend-locations.log', 'a')],
    detached: true,
  });
  child.unref();
  await waitFor(backendUp, 'kkl-backend to answer');
}

async function staffToken() {
  const res = await fetch(`${BACKEND_URL}/v1/dev/sessions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-kkl-dev-secret': SECRET },
    body: JSON.stringify({ externalRef: 'kkl-web:sample-staff', displayName: 'Review staff', role: 'staff' }),
  });
  if (!res.ok) throw new Error(`dev session failed: ${res.status}`);
  return (await res.json()).token;
}

if (!(await backendUp())) {
  console.error(`kkl-backend is not answering at ${BACKEND_URL}. Start it first.`);
  process.exit(2);
}

const token = await staffToken();
const suffix = randomUUID().slice(0, 6);
const localityId = `verify-${suffix}`;
const localityName = `Verify Nagar ${suffix.toUpperCase()}`;

const browser = await chromium.launch();
const ctx = await browser.newContext();

try {
  // ------------------------------------------------ 1. add it through the API
  const created = await fetch(`${BACKEND_URL}/v1/locations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({
      id: localityId, parentId: 'in-wb-kol', kind: 'locality', name: localityName,
      synonyms: [`VN${suffix.toUpperCase()}`],
    }),
  });
  ok('1. Staff add a locality through the API',
    created.status === 201,
    `HTTP ${created.status} for ${localityName} — no deploy, no code change`);

  // ------------------------------------- 2. it is in the picker, unrebuilt
  // The picker is a client component: it receives every area from the server
  // and shows the matching few, so counting options in the DOM would count
  // the suggestion list rather than the records. Typing the name and taking
  // what the form would submit is the check that means something.
  const form = await ctx.newPage();
  await form.goto(`${BASE}/seller/requests/new`, { waitUntil: 'networkidle' });
  await form.fill('#areaId', localityName);
  await form.press('#areaId', 'Enter');
  const chosenId = await form.inputValue('input[name="areaId"][type="hidden"]');
  ok('2. A locality added minutes ago is selectable on a page nobody rebuilt',
    chosenId === localityId,
    `the form would submit areaId="${chosenId}" — the record staff created, not a compiled list`);

  // ------------------------------- 3. the label is the one the database composed
  const shown = await form.inputValue('#areaId');
  ok('3. It carries its parent in the label, composed by the database',
    shown === `${localityName}, Kolkata`,
    `picker shows "${shown}"`);

  // The server-rendered page carries the whole record set, so the no-JavaScript
  // fallback offers it too.
  const ssr = await (await fetch(`${BASE}/seller/requests/new`)).text();
  ok('3b. The server-rendered fallback offers it as well',
    ssr.includes(`value="${localityId}"`) && ssr.includes(`${localityName}, Kolkata`),
    'present in the <select> that renders before, and without, hydration');

  // ------------------------- 4. with the service down, no silent fallback
  await stopBackend();
  const down = await ctx.newPage();
  const response = await down.goto(`${BASE}/search`, { waitUntil: 'domcontentloaded' });
  const text = (await down.textContent('body')) ?? '';
  const servedSample = /Salt Lake|New Town/.test(text) && !/error|not responding|went wrong/i.test(text);
  ok('4. With kkl-backend down the picker fails rather than serving sample records',
    !servedSample,
    `HTTP ${response?.status()} and no sample locality list rendered in its place`);
  await startBackend();

  // --------------------------------- 5. retiring it takes it out of the picker
  const retired = await fetch(`${BACKEND_URL}/v1/locations/${localityId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${await staffToken()}` },
    body: JSON.stringify({ status: 'retired' }),
  });
  const remaining = await (await fetch(`${BASE}/seller/requests/new`)).text();
  ok('5. Retiring it removes it from the picker, and deletes nothing',
    retired.status === 200 && !remaining.includes(localityName),
    `HTTP ${retired.status}; the record still exists for staff, and anything pointing at it still resolves`);

  // ------------------------------- 6. a stored CR03 area still has a name
  const resolved = await fetch(`${BACKEND_URL}/v1/locations/resolve?ids=rajarhat,in-wb-kol`);
  const body = await resolved.json();
  ok('6. The identifiers stored by CR03 still resolve to records',
    body.locations?.length === 2 && body.locations.some((l) => l.label === 'Rajarhat, Kolkata'),
    `resolve returned ${body.locations?.map((l) => l.label).join(' | ')}`);
} finally {
  await browser.close();
  if (!(await backendUp())) await startBackend();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
process.exit(failed.length ? 1 : 0);
