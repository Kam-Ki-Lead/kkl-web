/**
 * Enquiry-flow verification beyond the happy path.
 *
 * Drives a real browser against a production build (`next build` then
 * `next start`) and checks what the flow does under reload, replay, two tabs,
 * two independent sessions, and expired or missing drafts.
 *
 * Three of these are NOT behaviour tests. They record a known limitation
 * reproducing as documented — a control sample mode does not have. Reproducing
 * an OTP bypass, an unsigned cookie or an unprotected URL is not that control
 * passing, so they are counted and reported separately. Mixing them into one
 * total would inflate the pass count with things that are wrong on purpose.
 *
 * If one stops reproducing, the limitation may have been closed: re-verify and
 * rewrite it as an assertion.
 *
 * Run:
 *   npx next build
 *   NEXT_PUBLIC_KKL_ENV=review NEXT_PUBLIC_KKL_DATA_SOURCE=sample npx next start -p 3811
 *   node scripts/verify-enquiry-flow.mjs            # or BASE_URL=… node scripts/…
 *
 * Playwright is not a dependency of this package; point PLAYWRIGHT at an
 * install if it is not resolvable.
 *
 * Note on the harness itself: the draft cookie is Secure under `next start`,
 * and Playwright's APIRequestContext will not send a Secure cookie over plain
 * http. Every check therefore navigates a real page rather than using
 * `context.request`, or an authenticated step silently looks unauthenticated.
 */

const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3811';
const DRAFT = 'kkl_enquiry_draft';
const results = [];
const observations = [];
const ok = (name, pass, detail) => { results.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}\n      ${detail}`); };
/** A known limitation reproducing as documented. Never a passing control. */
const observed = (name, reproduced, detail) => { observations.push({ name, reproduced, detail }); console.log(`${reproduced ? 'LIMIT' : 'CHANGED'}  ${name}\n      ${detail}`); };

async function countEnquiries(ctx) {
  const pg = await ctx.newPage();
  await pg.goto(`${BASE}/account/enquiries`, { waitUntil: 'networkidle' });
  const html = await pg.content();
  await pg.close();
  return new Set(html.match(/\/account\/enquiries\/e-\d+/g) || []).size;
}

async function makeDraft(ctx, { name, mobile, slug, message }) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/property/${slug}/enquiry`, { waitUntil: 'networkidle' });
  await page.fill('#name', name);
  await page.fill('#mobile', mobile);
  const msg = await page.$('#message');
  if (msg) await msg.fill(message ?? 'Sample edge-case test.');
  await Promise.all([
    page.waitForURL(/\/auth/, { timeout: 15000 }),
    page.click('form button[type=submit]'),
  ]);
  return page;
}

async function verifyOtp(page) {
  await page.fill('#auth-code', '123456');
  await Promise.all([
    page.waitForURL(/\/enquiry\/[^/]+\/confirmed|\/enquiry\/unavailable/, { timeout: 15000 }),
    page.click("button:has-text(\"Verify and continue\")"),
  ]);
  return page.url();
}

const browser = await chromium.launch();

// ---------------------------------------------------------------- session A
const A = await browser.newContext();
const pageA = await makeDraft(A, { name: 'Ananya Roy', mobile: '9830012345', slug: 'greenview-residency' });

ok('1. No personal detail in the URL after the enquiry form',
   !/9830012345|Ananya|mobile=|name=/.test(pageA.url()),
   `URL after submit: ${pageA.url()}`);

const cookiesA = await A.cookies();
const draftA = cookiesA.find(c => c.name === DRAFT);
const jsVisible = await pageA.evaluate(() => document.cookie);
ok('2. Draft cookie is httpOnly and invisible to page JavaScript',
   Boolean(draftA?.httpOnly) && !jsVisible.includes(DRAFT),
   `httpOnly=${draftA?.httpOnly}; document.cookie=${JSON.stringify(jsVisible)}`);

const draftPayload = JSON.parse(decodeURIComponent(draftA.value));
ok('3. Draft retains the entered details across the OTP step',
   draftPayload.name === 'Ananya Roy' && draftPayload.mobile === '9830012345',
   `draft carries name/mobile/token; submissionToken=${draftPayload.submissionToken}`);

const prefilled = await pageA.textContent('body');
ok('4. Verification screen shows the number without it travelling in the URL',
   prefilled.includes('9830012345') && !pageA.url().includes('9830012345'),
   'number rendered server-side from the draft cookie');

const beforeA = await countEnquiries(A);
const confirmedUrlA = await verifyOtp(pageA);
const receiptA = confirmedUrlA.split('/enquiry/')[1].replace('/confirmed', '');
const refA = (await pageA.textContent('body')).match(/e-\d+/)?.[0];
const afterA = await countEnquiries(A);
ok('5. Happy path records exactly one enquiry',
   afterA === beforeA + 1,
   `list went ${beforeA} -> ${afterA}; receipt=${receiptA}; reference=${refA}`);

ok('6. Confirmation URL carries an opaque receipt, not the reference',
   /^[0-9a-f-]{36}$/.test(receiptA) && receiptA !== refA,
   `URL id=${receiptA}, on-screen reference=${refA}`);

// reload confirmation
await pageA.reload({ waitUntil: 'networkidle' });
const afterReload = await countEnquiries(A);
ok('7. Reloading the confirmation records nothing further',
   pageA.url() === confirmedUrlA && afterReload === afterA && (await pageA.textContent('body')).includes(refA),
   `reload stayed on ${refA}; list still ${afterReload}`);

// direct access to confirmation in a fresh context
const Fresh = await browser.newContext();
const rDirect = await Fresh.request.get(confirmedUrlA);
observed('L1. An exact receipt URL is not access-controlled',
   rDirect.status() === 200,
   `status ${rDirect.status()}. Sample mode has no accounts, so possession of the URL is all there is. Unguessable is not authorised — per-account access control is kkl-backend's and is NOT demonstrated.`);

const rGuess = await Fresh.request.get(`${BASE}/enquiry/${refA}/confirmed`);
const rGuess2 = await Fresh.request.get(`${BASE}/enquiry/e-50001/confirmed`);
ok('9. A guessed or enumerated reference cannot open a confirmation',
   rGuess.status() === 404 && rGuess2.status() === 404,
   `/enquiry/${refA}/confirmed -> ${rGuess.status()}; /enquiry/e-50001/confirmed -> ${rGuess2.status()}`);

// ------------------------------------------------- replay with restored draft
// The draft cookie is deliberately put back to prove that idempotency, not
// cookie clearing, is what stops a duplicate.
const reput = (c) => [{ name: c.name, value: c.value, url: BASE, httpOnly: true }];
await A.addCookies(reput(draftA));
const replayPage = await A.newPage();
await replayPage.goto(`${BASE}/enquiry/confirm`, { waitUntil: 'networkidle' });
const replayTarget = replayPage.url();
const afterReplay = await countEnquiries(A);
ok('10. Replaying the SAME draft after it was cleared records no second enquiry',
   replayTarget.includes(receiptA) && afterReplay === afterA,
   `replay redirected to ${replayTarget}; list still ${afterReplay} (was ${afterA})`);

// ------------------------------------------------------------------ two tabs
const T = await browser.newContext();
const tab1 = await makeDraft(T, { name: 'Rahul Das', mobile: '9910055555', slug: 'lakeshore-heights' });
const tabDraft = (await T.cookies()).find(c => c.name === DRAFT);
const tab2 = await T.newPage();
await tab2.goto(`${BASE}/auth?next=/enquiry/confirm`, { waitUntil: 'networkidle' });
const beforeT = await countEnquiries(T);
const url1 = await verifyOtp(tab1);
// tab2 was loaded before tab1 completed and still holds the same draft
await T.addCookies(reput(tabDraft));
const url2 = await verifyOtp(tab2);
const afterT = await countEnquiries(T);
ok('11. Two tabs on the same draft produce one enquiry, not two',
   url1 === url2 && afterT === beforeT + 1,
   `tab1 -> ${url1.split('/enquiry/')[1]}, tab2 -> ${url2.split('/enquiry/')[1]}; list ${beforeT} -> ${afterT}`);

// --------------------------------------------------------- two sessions
const B = await browser.newContext();
const pageB = await makeDraft(B, { name: 'Meera Iyer', mobile: '9770088888', slug: 'greenview-residency' });
const draftB = (await B.cookies()).find(c => c.name === DRAFT);
const payloadB = JSON.parse(decodeURIComponent(draftB.value));

ok('12. A second session cannot see the first session\'s draft',
   payloadB.submissionToken !== draftPayload.submissionToken && payloadB.mobile === '9770088888',
   `session A token ${draftPayload.submissionToken.slice(0,8)}…, session B token ${payloadB.submissionToken.slice(0,8)}…`);

// Read through a real page: the draft cookie is Secure under `next start`, and
// Playwright's APIRequestContext will not send a Secure cookie over plain http.
const bPeek = await B.newPage();
await bPeek.goto(`${BASE}/auth?next=/enquiry/confirm`, { waitUntil: 'networkidle' });
const bAuthHtml = await bPeek.content();
await bPeek.close();
ok('13. Session B\'s verification screen shows B\'s number, never A\'s',
   bAuthHtml.includes('9770088888') && !bAuthHtml.includes('9830012345'),
   'each session reads only its own httpOnly draft');

const urlB = await verifyOtp(pageB);
const receiptB = urlB.split('/enquiry/')[1].replace('/confirmed', '');
const refB = (await pageB.textContent('body')).match(/e-\d+/)?.[0];
ok('14. The same property enquired by two people yields two distinct enquiries',
   receiptB !== receiptA && refB !== refA,
   `A: ${refA} (${receiptA.slice(0,8)}…)  B: ${refB} (${receiptB.slice(0,8)}…) — both on Greenview Residency`);

// ------------------------------------------------------- expired / missing
const E = await browser.newContext();
const pageE = await makeDraft(E, { name: 'Sunil Bose', mobile: '9611122233', slug: 'sundew-enclave' });
const draftE = (await E.cookies()).find(c => c.name === DRAFT);
const stale = JSON.parse(decodeURIComponent(draftE.value));
stale.createdAt = Date.now() - 31 * 60 * 1000;
await E.clearCookies();
await E.addCookies([{ name: DRAFT, value: encodeURIComponent(JSON.stringify(stale)), url: BASE, httpOnly: true }]);
const pageE2 = await E.newPage();
await pageE2.goto(`${BASE}/enquiry/confirm`, { waitUntil: 'networkidle' });
ok('15. An expired draft is refused and named as expired',
   pageE2.url().includes('reason=expired'),
   `-> ${pageE2.url()}`);

await E.clearCookies();
await pageE2.goto(`${BASE}/enquiry/confirm`, { waitUntil: 'networkidle' });
ok('16. A missing draft is refused and named as missing',
   pageE2.url().includes('reason=missing'),
   `-> ${pageE2.url()}`);

const pageU = await E.newPage();
await pageU.goto(`${BASE}/enquiry/unavailable?reason=expired`, { waitUntil: 'networkidle' });
const expiredCopy = await pageU.textContent('body');
await pageU.goto(`${BASE}/enquiry/unavailable?reason=missing`, { waitUntil: 'networkidle' });
const missingCopy = await pageU.textContent('body');
ok('17. Expired and missing show different copy, not one generic error',
   expiredCopy !== missingCopy,
   'each state gets its own explanation and next step');

// ------------------------------------------------------------ OTP behaviour
const O = await browser.newContext();
const pageO = await makeDraft(O, { name: 'Kabir Nath', mobile: '9500011122', slug: 'orchid-grove' });
await pageO.fill('#auth-code', '000000');
await pageO.click("button:has-text(\"Verify and continue\")");
await pageO.waitForSelector('#auth-code-error', { timeout: 10000 });
const otpErr = await pageO.textContent('#auth-code-error');
const draftSurvived = (await O.cookies()).some(c => c.name === DRAFT);
ok('18. A rejected code keeps the draft rather than dropping the enquiry',
   draftSurvived && /not correct/i.test(otpErr),
   `error: "${otpErr.trim()}"; draft cookie still present`);

// unverified direct hit on the confirm handoff, no OTP step at all
const S = await browser.newContext();
const pageS = await makeDraft(S, { name: 'Test Skip', mobile: '9400011122', slug: 'palm-meadows' });
await pageS.goto(`${BASE}/enquiry/confirm`, { waitUntil: 'networkidle' });
observed('L2. The confirm handoff does not require the OTP step',
   /\/confirmed$/.test(pageS.url()),
   `a draft alone reaches ${pageS.url()} without entering a code — the sample OTP step is not a control; real verification is kkl-backend's`);

// draft cookie is unsigned
const F = await browser.newContext();
await F.addCookies([{ name: DRAFT, url: BASE, httpOnly: true,
  value: encodeURIComponent(JSON.stringify({ propertyId: 'p-greenview', propertySlug: 'greenview-residency',
    kind: 'enquiry', name: 'Forged Draft', mobile: '9123456780',
    submissionToken: '11111111-2222-4333-8444-555555555555', createdAt: Date.now() })) }]);
const pageF = await F.newPage();
await pageF.goto(`${BASE}/enquiry/confirm`, { waitUntil: 'networkidle' });
observed('L3. The draft cookie is unsigned, so a crafted one is accepted',
   /\/confirmed$/.test(pageF.url()),
   `forged draft accepted -> ${pageF.url()}; a real implementation must sign it or hold it server-side`);

await browser.close();

const failed = results.filter(r => !r.pass);
const changed = observations.filter(o => !o.reproduced);

console.log(`\n${results.length - failed.length}/${results.length} behaviour checks passed.`);
console.log(`${observations.length - changed.length}/${observations.length} known limitations reproduced as documented (reproduction is not a pass — these are things that do not work yet).`);

if (failed.length) { console.log('\nFailed behaviour checks:'); failed.forEach(f => console.log(' - ' + f.name)); }
if (changed.length) { console.log('\nLimitations that no longer reproduce — re-verify and rewrite as assertions:'); changed.forEach(c => console.log(' - ' + c.name)); }
if (failed.length || changed.length) process.exit(1);
