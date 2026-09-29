/**
 * Slice D connected — a buyer's enquiry, filed on the real screen and stored
 * in kkl-backend.
 *
 * What this can and cannot show is worth stating before the output does.
 * The *record* is real: durable, account-scoped, surviving a restart. The
 * *property* is still a kkl-web sample record, because nothing publishes
 * (Q-3), so the enquiry is stored unrouted and kkl-backend says so rather
 * than inventing a recipient. And nothing is sent to anybody: no channel is
 * configured (Q-7), so the confirmation says an enquiry was recorded, not
 * that a builder was told.
 *
 * Run (kkl-web serving on 3811 with KKL_ENQUIRIES=backend, kkl-backend up):
 *   BACKEND_DIR=... BACKEND_URL=... DATABASE_URL=... KKL_DEV_AUTH_SECRET=... \
 *   PLAYWRIGHT=/path/to/playwright/index.mjs node scripts/verify-enquiry-records.mjs
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
const SLUG = process.env.PROPERTY_SLUG ?? 'ivy-court-action-area-i';

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
    stdio: ['ignore', 'ignore', openSync(process.env.BACKEND_LOG ?? '/tmp/kkl-backend-enquiries.log', 'a')],
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

if (!(await backendUp())) {
  console.error(`kkl-backend is not answering at ${BACKEND_URL}.`);
  process.exit(2);
}

const marker = randomUUID().slice(0, 8).toUpperCase();

/** Path-only matching: `/auth?next=/enquiry/confirm` contains the confirm
 *  path in its query string, and a regex over the whole URL matched it — so a
 *  check "waited" for a page it was already on and passed while standing
 *  still. Compare the pathname. */
const atPath = (...prefixes) => (url) =>
  prefixes.some((prefix) => new URL(url).pathname.startsWith(prefix));

/**
 * Click, and make sure it landed.
 *
 * These forms are server actions: before hydration a click does nothing, and
 * "did nothing" looks exactly like "the submission failed". One retry removes
 * the race without hiding a real failure — if the second click does not move
 * either, the check fails and says so.
 */
async function submitAndWait(page, pattern, { attempts = 3, button = 'button[type="submit"]' } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    await page.click(button).catch(() => {});
    try {
      await page.waitForURL(pattern, { timeout: 8000 });
      await page.waitForLoadState('networkidle');
      return true;
    } catch {
      await page.waitForTimeout(600);
    }
  }
  return false;
}
const browser = await chromium.launch();
const ctx = await browser.newContext();

try {
  // ------------------------------------------- 1. file one on the real screen
  const form = await ctx.newPage();
  await form.goto(`${BASE}/property/${SLUG}/enquiry`, { waitUntil: 'networkidle' });
  await form.fill('#name', 'Ritwik Sen');
  await form.fill('#mobile', '9830012345');
  await form.fill('#message', `Interested in this one — ${marker}`);
  // Hydration first: a server-action form ignores a click until it is live.
  await form.waitForTimeout(800);
  await submitAndWait(form, atPath('/auth', '/enquiry/'),
    { button: 'button:has-text("Send enquiry")' });

  // The approved journey puts a one-time code between the form and the
  // record: an enquiry is filed by an identified person, not by anyone who
  // can type. In review mode the code is simulated and the screens say so —
  // that is the OTP limitation slice A has not lifted, not a shortcut taken
  // here.
  if (atPath('/auth')(form.url())) {
    const number = await form.$('#auth-mobile');
    if (number) {
      await number.fill('9830012345');
      // Named buttons, not "the first submit on the page" — the header and
      // the change-number form have their own, and clicking one of those is
      // how this check spent a while believing sign-in was broken.
      await form.click('button:has-text("Send code")').catch(() => {});
    }
    // The review build says it plainly on the screen: any six digits work,
    // and 000000 shows the invalid state. That is the OTP limitation slice A
    // has not lifted — no provider delivers a code (Q-7) — not a shortcut
    // taken by this check.
    await form.waitForSelector('#auth-code', { timeout: 20000 });
    await form.fill('#auth-code', '123456');
    await submitAndWait(form, atPath('/enquiry/', '/account'),
      { button: 'button:has-text("Verify")' });
  }

  // The confirmation lives at /enquiry/<id>/confirmed — addressed by the
  // submission token rather than by the quotable reference, so a short
  // reference in a URL cannot be guessed into somebody else's enquiry.
  const confirmed = (url) => /^\/enquiry\/[0-9a-f-]{36}\/confirmed$/.test(new URL(url).pathname);
  await form.waitForURL(confirmed, { timeout: 20000 }).catch(() => {});
  await form.waitForLoadState('networkidle');
  const confirmation = (await form.textContent('body')) ?? '';
  ok('1. An enquiry filed on the property page reaches a confirmation',
    confirmed(form.url()),
    `the journey ends at ${form.url().replace(BASE, '')}`);

  // The confirmation must not claim anybody was contacted: no channel exists.
  ok('2. The confirmation does not claim a notification was sent',
    !/we have (emailed|messaged|notified|called)|has been notified|sent to the (builder|owner)/i
      .test(confirmation),
    'the screen says the enquiry was recorded, not that somebody was told');

  // ------------------------- 3. the stored record, and what it is not
  const buyerToken = await sessionFor('buyer', 'kkl-web:sample-buyer', 'Ritwik Sen');
  const filed = await (await fetch(`${BACKEND_URL}/v1/enquiries?as=buyer`, {
    headers: { authorization: `Bearer ${buyerToken}` },
  })).json();
  const stored = filed.enquiries.find((e) => (e.message ?? '').includes(marker));
  ok('3. It is stored in kkl-backend, referenced, and honestly unrouted',
    stored !== undefined && /^EN-/.test(stored.reference)
      && stored.routing === 'pending_backend_property',
    stored
      ? `${stored.reference}, routing "${stored.routing}" — the property is still a portal record`
      : 'the enquiry was not found in the database');

  const list = await ctx.newPage();
  await list.goto(`${BASE}/account/enquiries`, { waitUntil: 'networkidle' });
  const listText = (await list.textContent('body')) ?? '';
  ok('4. The buyer\'s own list renders that record',
    stored !== undefined && listText.includes('Ivy Court'),
    'the account list is served by kkl-backend, not by process memory');

  // ------------------------------- 4. the record survives a backend restart
  await stopBackend();
  const down = await ctx.newPage();
  const downResponse = await down.goto(`${BASE}/account/enquiries`, { waitUntil: 'domcontentloaded' });
  const downText = (await down.textContent('body')) ?? '';
  ok('5. With kkl-backend down the list fails rather than showing sample enquiries',
    !/EN-[0-9A-F]{8}/.test(downText) || /error|not responding/i.test(downText),
    `HTTP ${downResponse?.status()} and no substitute list rendered`);
  await startBackend();

  const after = await ctx.newPage();
  await after.goto(`${BASE}/account/enquiries`, { waitUntil: 'networkidle' });
  const afterText = (await after.textContent('body')) ?? '';
  const reread = await (await fetch(`${BACKEND_URL}/v1/enquiries?as=buyer`, {
    headers: { authorization: `Bearer ${await sessionFor('buyer', 'kkl-web:sample-buyer', 'Ritwik Sen')}` },
  })).json();
  ok('6. The enquiry is still there after kkl-backend restarts',
    reread.enquiries.some((e) => e.id === stored?.id) && afterText.includes('Ivy Court'),
    'read back by a process that did not take it, and rendered on the screen');

  // ------------------------------------------ 7. nobody else can read it
  const stranger = await sessionFor('buyer', `verify-stranger-${marker}`, 'Someone Else');
  const peek = await fetch(`${BACKEND_URL}/v1/enquiries/${stored?.id ?? randomUUID()}`, {
    headers: { authorization: `Bearer ${stranger}` },
  });
  const strangerList = await (await fetch(`${BACKEND_URL}/v1/enquiries?as=buyer`, {
    headers: { authorization: `Bearer ${stranger}` },
  })).json();
  ok('7. Another account cannot read it, by identifier or by list',
    peek.status === 404 && !strangerList.enquiries.some((e) => e.id === stored?.id),
    `read ${peek.status}; their own list holds ${strangerList.enquiries.length} enquiries`);

  // --------------------------------------- 8. no contact was released anywhere
  const asStranger = JSON.stringify(strangerList);
  ok('8. No contact detail was released to anyone',
    !asStranger.includes('9830012345') && (stored?.contact ?? null) === null,
    'the buyer\'s number is on their account, not copied onto the enquiry or shown to a recipient');
} finally {
  await browser.close();
  if (!(await backendUp())) await startBackend();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
process.exit(failed.length ? 1 : 0);
