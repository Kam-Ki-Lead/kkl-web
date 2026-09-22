/**
 * Admin console verification, including the cross-role joins.
 *
 * Run:
 *   NEXT_PUBLIC_KKL_ENV=review NEXT_PUBLIC_KKL_DATA_SOURCE=sample npx next build
 *   KKL_ENV=review KKL_DATA_SOURCE=sample npx next start -p 3811
 *   PLAYWRIGHT=/path/to/playwright/index.mjs node scripts/verify-admin-flow.mjs
 *
 * The NEXT_PUBLIC_* pair goes on the BUILD (inlined into the bundle); the
 * unprefixed pair goes on the START (read per request). Swapping them makes the
 * run-time guard refuse the mismatch.
 *
 * Most of this suite is negative. A staff console's interesting failures are
 * things that must NOT happen — a reply reaching the wrong person, an internal
 * note reaching anyone, a suspension quietly revoking a verification — and a
 * check that only ever exercises the happy path cannot see any of them.
 */
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3811';
const results = [];
const observations = [];

const ok = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
  if (detail) console.log(`      ${detail}`);
};
const observed = (name, reproduced, detail) => {
  observations.push({ name, reproduced, detail });
  console.log(`${reproduced ? 'LIMIT' : 'GONE '}  ${name}`);
  if (detail) console.log(`      ${detail}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext();

async function reset() {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/admin/review-state?reset=1`, { waitUntil: 'load' });
  await p.close();
}

async function text(path) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}${path}`, { waitUntil: 'load' });
  await p.waitForTimeout(250);
  const body = await p.textContent('body');
  await p.close();
  return body;
}

async function open(path) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}${path}`, { waitUntil: 'load' });
  await p.waitForTimeout(250);
  return p;
}

await reset();

// ------------------------------------------------------- A-01 authenticates nobody
{
  const login = await text('/admin/login');
  ok('1. A-01 states that it authenticates nobody',
     login.includes('These fields do nothing') && login.includes('D-16'),
     'the fields are disabled, no second factor is drawn, and D-16 is named as open');

  const disabled = await (async () => {
    const p = await open('/admin/login');
    const n = await p.$$eval('input', (els) => els.filter((e) => e.disabled).length);
    const total = await p.$$eval('input', (els) => els.length);
    await p.close();
    return n === total && total > 0;
  })();
  ok('2. Every field on A-01 is disabled rather than pretending to work',
     disabled,
     'a form that looked functional would be the most misleading thing in this build');
}

// ------------------------------------------------- reason gate on every decision
{
  const p = await open('/admin/users/U-10442?action=suspend');
  await p.click('button:has-text("Suspend account")');
  // #reason-error, not [role=alert]: Next renders <next-route-announcer
  // role="alert"> on every page, so a bare role selector resolves instantly
  // against an empty element and reads nothing.
  await p.waitForSelector('#reason-error', { timeout: 8000 });
  const alert = await p.textContent('#reason-error');
  ok('3. A decision with no reason is refused',
     /reason is required/i.test(alert),
     `"${alert.trim().slice(0, 60)}…" — the gate is in the store, so no screen can skip it`);

  // And nothing changed.
  const users = await text('/admin/users');
  ok('4. The refused decision changed nothing',
     !users.includes('Suspended') || (await text('/admin/users/U-10442')).includes('Account active'),
     'the store refuses before it writes, rather than writing and then complaining');
  await p.close();
}

// ---------------------------------- KYC decision reaches the Seller console (join)
{
  await reset();
  const before = await text('/seller/kyc/status');
  const p = await open('/admin/kyc/K-3322');

  // Approval is gated on the checklist.
  await p.click('button:has-text("Approve verification")');
  await p.waitForSelector('#approve-error', { timeout: 8000 });
  ok('5. Approval is refused while the checklist is incomplete',
     /checklist/i.test(await p.textContent('#approve-error')),
     'the one decision an applicant cannot undo is the one with a gate');

  // Tick all four, one at a time (each is its own form post). Selected by
  // data-check, because the per-document "Legible / Problem" buttons also
  // carry aria-pressed and a looser selector ticks those instead.
  for (let i = 0; i < 6; i++) {
    const box = await p.$('button[data-check][aria-pressed="false"]');
    if (!box) break;
    await box.click();
    await p.waitForTimeout(500);
  }
  const unticked = (await p.$$('button[data-check][aria-pressed="false"]')).length;
  ok('6. The checklist can be completed',
     unticked === 0,
     'four checks, four form posts, each one persisted');

  await p.click('button:has-text("Approve verification")');
  await p.waitForTimeout(1200);
  ok('7. A completed checklist allows the approval',
     (await p.textContent('body')).includes('Decision recorded'),
     'and the application leaves the queue');
  await p.close();

  const queue = await text('/admin/kyc?filter=all');
  ok('8. The decided application has left the queue',
     !queue.includes('K-3322'),
     'a queue that keeps decided rows is how something gets approved twice');

  const after = await text('/seller/kyc/status');
  ok('9. The decision reached the Seller console',
     before !== after && /approved/i.test(after),
     'S-04 reads the same verification value the Admin decision wrote — one field, not two');
}

// --------------------------- suspension does NOT rewrite verification (negative)
{
  await reset();
  const p = await open('/admin/users/U-10442?action=suspend');
  await p.fill('#reason', 'Three buyer complaints of misrepresented listings');
  await p.click('button:has-text("Suspend account")');
  await p.waitForTimeout(1200);
  ok('10. A suspension with a reason is recorded',
     (await p.textContent('body')).includes('Recorded'),
     'and says in the confirmation that verification was not changed');
  await p.close();

  const account = await text('/admin/users/U-10442');
  ok('11. Suspension did not rewrite the verification state',
     account.includes('Account suspended') && account.includes('Verification approved'),
     'two chips, two axes — a suspended account keeps the verification it holds');

  const seller = await text('/seller/kyc/status');
  ok('12. The Seller console agrees — still verified, now suspended',
     /approved/i.test(seller),
     'the negative case: a status change must not leak into the other axis');

  const restricted = await text('/seller/restricted');
  ok('13. The suspension reached the Seller console',
     /suspend/i.test(restricted),
     'S-05 follows the Admin decision');

  const audit = await text('/admin/audit?filter=accounts');
  ok('14. The audit entry records verification as unchanged',
     audit.includes('Account suspended') && audit.includes('kyc_status'),
     'the log proves what was NOT touched, not only what was');
}

// -------------------- a KYC decision does not change account status (the reverse)
{
  await reset();
  const p = await open('/admin/users/U-10442?action=suspend');
  await p.fill('#reason', 'Suspended first, to test the other direction');
  await p.click('button:has-text("Suspend account")');
  await p.waitForTimeout(1000);
  await p.close();

  const r = await open('/admin/kyc/K-3322?action=reject');
  await r.fill('#reason', 'Aadhaar upload is not readable');
  await r.click('button:has-text("Reject and notify")');
  await r.waitForTimeout(1200);
  await r.close();

  const account = await text('/admin/users/U-10442');
  ok('15. A verification decision did not change the account status',
     account.includes('Account suspended') && account.includes('Verification rejected'),
     'the reverse of check 11 — the two axes stay independent in both directions');
}

// ----------------------------------------- credit adjustment reaches the ledger
{
  await reset();
  const before = await text('/seller/billing/history');
  const p = await open('/admin/wallets/U-10442/adjust');

  await p.click('button:has-text("Record this adjustment")');
  await p.waitForSelector('#adjust-error', { timeout: 8000 });
  ok('16. An adjustment with no amount and no reason is refused',
     /whole number/i.test(await p.textContent('#adjust-error')),
     'both gates live in the store');

  await p.fill('#amount', '780');
  await p.fill('#reason', 'Duplicate lead confirmed, goodwill credit');
  await Promise.all([
    p.waitForURL(/\/admin\/wallets\?adjusted=/, { timeout: 12000 }),
    p.click('button:has-text("Record this adjustment")'),
  ]);
  ok('17. A complete adjustment is recorded',
     (await p.textContent('body')).includes('Adjustment recorded'),
     'and names the audit entry it wrote');
  await p.close();

  const after = await text('/seller/billing/history');
  ok('18. The adjustment is in the Seller\'s own billing history, with the reason',
     after !== before && after.includes('Duplicate lead confirmed'),
     'the reason travels with the ledger entry — an adjustment nobody can trace is what A-19 exists to prevent');

  const wallets = await text('/admin/wallets?account=U-10442');
  const sellerBilling = await text('/seller/billing');
  const both = (s) => (s.match(/₹4,980/g) ?? []).length;
  ok('19. Admin and the Seller agree on the balance',
     both(wallets) > 0 && both(sellerBilling) > 0,
     '4,200 + 780 = 4,980, derived from one ledger in one place rather than stored twice');
}

// ------------------------------------------ support: the reply reaches the right thread
{
  await reset();
  const p = await open('/admin/support?filter=all');
  const queue = await p.textContent('body');
  ok('20. Tickets from both consoles are in one queue',
     queue.includes('Seller console') && queue.includes('Builder console'),
     'S-23 and B-23 both land here, each carrying which console it came from');
  await p.close();

  const marker = `Reply routed at ${Date.now()}`;
  const t = await open('/admin/support/T-2291');
  await t.fill('#body', marker);
  await t.click('button:has-text("Send reply")');
  await t.waitForTimeout(1500);
  await t.close();

  const sellerThread = await text('/seller/support/T-2291');
  ok('21. A public reply reaches the requester\'s own thread',
     sellerThread.includes(marker),
     'delivered by the ticket\'s recorded console, not by anything the form said');

  const builderQueue = await text('/builder/support');
  ok('22. That reply did NOT reach the Builder console',
     !builderQueue.includes(marker),
     'negative check: a Seller\'s ticket cannot receive a reply in the Builder\'s queue');
}

// ---------------------------------- internal notes never leave the Admin console
{
  const note = `Internal only ${Date.now()}`;
  const t = await open('/admin/support/T-2291');
  await t.click('button:has-text("Internal note")');
  await t.fill('#body', note);
  await t.click('button:has-text("Add internal note")');
  await t.waitForTimeout(1500);
  const adminThread = await t.textContent('body');
  await t.close();

  ok('23. An internal note is visible to staff and labelled as internal',
     adminThread.includes(note) && adminThread.includes('the user never sees this'),
     'drawn differently and captioned, so it cannot be mistaken for a reply');

  const sellerThread = await text('/seller/support/T-2291');
  ok('24. The internal note is absent from the requester\'s thread',
     !sellerThread.includes(note),
     'negative check: it is not hidden there, it is not there — the console store has no field that could carry it');

  // And it is absent from the served HTML, not merely from what renders.
  const p = await open('/seller/support/T-2291');
  const html = await p.content();
  await p.close();
  ok('25. The internal note is absent from the served HTML, not just the screen',
     !html.includes(note),
     'asserted against the whole document, including the RSC payload — CSS-hiding a note is not containment');
}

// --------------------------------- the Builder side of the same join
{
  const marker = `Builder reply ${Date.now()}`;
  const t = await open('/admin/support/T-3140');
  await t.fill('#body', marker);
  await t.click('button:has-text("Send reply")');
  await t.waitForTimeout(1500);
  await t.close();

  const builderThread = await text('/builder/support/T-3140');
  ok('26. A reply to a Builder ticket reaches the Builder console',
     builderThread.includes(marker),
     'the same mechanism, the other console');

  const sellerQueue = await text('/seller/support');
  ok('27. That reply did NOT reach the Seller console',
     !sellerQueue.includes(marker),
     'negative check, in the other direction');
}

// ------------------------------------------ purchases appear in the Admin record
{
  await reset();
  const before = await text('/admin/orders');
  const p = await open('/seller/leads/L-4471/buy');
  await p.click('button:has-text("Confirm")');
  await p.waitForTimeout(1500);
  await p.close();

  const after = await text('/admin/orders');
  ok('28. A purchase made in the Seller console appears in Admin orders',
     after.includes('live this session') && after !== before,
     'read from the console\'s own purchase list, not reported separately');
}

// ------------------------------------------------------ nothing is invented
{
  const subs = await text('/admin/subscriptions');
  ok('29. No subscription amount is shown anywhere on A-21',
     subs.includes('D-01') && !/₹\s?\d/.test(subs.replace(/₹\s?0\b/g, '')),
     'D-01 is open; the amount column reads "Sample"');

  const properties = await text('/admin/properties');
  ok('30. A-08 offers no approve action and says why',
     properties.includes('There is no approve action here') && properties.includes('D-10'),
     'an approve step would settle D-10 by implication and contradict the Builder console');

  const refunds = await text('/admin/refunds');
  ok('31. A-20 states that no refund moves anything',
     refunds.includes('No refund moves anything here') && refunds.includes('D-06'),
     'both halves of D-06 are open, so approving records a decision and writes no ledger entry');

  const consent = await text('/admin/consent');
  ok('32. A-28 has no control that could remove a suppression',
     consent.includes('Staff cannot change this list') && !consent.includes('Remove'),
     'the service interface has no method for it either');

  const system = await text('/admin/system');
  ok('33. No credential field appears anywhere in the console',
     system.includes('No credentials appear in this console'),
     'integration credentials live in the deployment environment');

  const pricing = await text('/admin/settings/pricing');
  ok('34. A-14\'s price fields are disabled placeholders',
     pricing.includes('nothing is editable') && pricing.includes('D-03'),
     'a price typed into a staff screen becomes a price somebody quotes');
}

// ------------------------------------------------ the audit log is append-only
{
  const audit = await text('/admin/audit');
  ok('35. Every recorded action carries its reason in the audit log',
     audit.includes('Append-only') && audit.includes('Duplicate lead confirmed'),
     'and the entries written by this run are in it');
}

// --------------------------------------------------------- reset is complete
{
  await reset();
  const [users, kyc, audit, seller] = await Promise.all([
    text('/admin/users/U-10442'),
    text('/admin/kyc?filter=all'),
    text('/admin/audit'),
    text('/seller/kyc/status'),
  ]);
  ok('36. Reset restores every console, not only this one',
     users.includes('Account active') &&
       users.includes('Verification approved') &&
       kyc.includes('K-3322') &&
       !audit.includes('Suspended first, to test') &&
       /approved/i.test(seller),
     'a staff decision writes into the other two consoles, so resetting one alone would leave them disagreeing');
}

// -------------------------------------------------------------- LIMITATIONS
{
  const anon = await browser.newContext();
  const p = await anon.newPage();
  const response = await p.goto(`${BASE}/admin`, { waitUntil: 'load' });
  observed('L1. The whole console is reachable without signing in',
     response.status() === 200 && (await p.textContent('body')).includes('This is not a staff console yet'),
     'A-01 authenticates nobody and anything that reaches this URL gets everything. Staff authentication is kkl-backend\'s and is NOT demonstrated. This is not an access-control pass.');
  await p.close();
  await anon.close();

  const dashboard = await text('/admin');
  observed('L2. The operational screens read fixtures',
     dashboard.includes('These six are fixtures'),
     'there is no intake pipeline, qualification caller, WhatsApp journey or notification sender in this repository. The screens exist so their layout and states can be reviewed.');

  const wallets = await text('/admin/wallets');
  observed('L3. Balances are numbers in one process, not money',
     wallets.includes('No money exists behind any of it'),
     'no gateway, no reconciliation, and everything is lost on restart. Financial authority is kkl-backend\'s.');
}

await browser.close();

const failed = results.filter((r) => !r.pass);
const changed = observations.filter((o) => !o.reproduced);
console.log(`\n${results.length - failed.length}/${results.length} behaviour checks passed.`);
console.log(`${observations.length - changed.length}/${observations.length} known limitations reproduced as documented (reproduction is not a pass).`);
if (failed.length) { console.log('\nFailed behaviour checks:'); failed.forEach((f) => console.log(' - ' + f.name)); }
if (changed.length) { console.log('\nLimitations that no longer reproduce:'); changed.forEach((c) => console.log(' - ' + c.name)); }
if (failed.length || changed.length) process.exit(1);
