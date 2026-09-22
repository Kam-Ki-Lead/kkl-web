/**
 * Seller journey verification: purchase, credits, and the failure states.
 *
 * Drives a real browser against a production build. Like the enquiry harness,
 * some checks assert a LIMITATION rather than a guarantee — they pass while the
 * limitation is present, and closing one should make the check fail so it gets
 * rewritten.
 *
 * Run:
 *   NEXT_PUBLIC_KKL_ENV=review NEXT_PUBLIC_KKL_DATA_SOURCE=sample npx next build
 *   KKL_ENV=review KKL_DATA_SOURCE=sample npx next start -p 3811
 *
 * The NEXT_PUBLIC_* pair goes on the BUILD (inlined into the bundle); the
 * unprefixed pair goes on the START (read per request). Swapping them makes the
 * run-time guard refuse the mismatch.
 *   PLAYWRIGHT=/path/to/playwright/index.mjs node scripts/verify-seller-flow.mjs
 */
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3811';
/**
 * Two separate registers, deliberately.
 *
 * `ok()` is a behaviour test: something is claimed to work and it does.
 * `observed()` records a KNOWN LIMITATION reproducing as documented. Reproducing
 * an OTP bypass or shared-account state is not a control passing — counting it
 * in the same total as a real assertion would inflate the pass count with
 * things that are wrong on purpose, which is the opposite of what a reader
 * needs. They are counted and printed apart.
 */
const results = [];
const observations = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}\n      ${detail}`);
};
const observed = (name, reproduced, detail) => {
  observations.push({ name, reproduced, detail });
  console.log(`${reproduced ? 'LIMIT' : 'CHANGED'}  ${name}\n      ${detail}`);
};

const browser = await chromium.launch();

/** Reset every seed value, then apply review state, through the sample-only route. */
async function reviewState(ctx, query) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/seller/review-state?${query}&to=/seller`, { waitUntil: 'networkidle' });
  await page.close();
}

async function balance(ctx) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/seller/billing`, { waitUntil: 'networkidle' });
  const text = await page.textContent('body');
  await page.close();
  const m = text.match(/Available balance\s*₹([\d,]+) credits/);
  return m ? Number(m[1].replace(/,/g, '')) : null;
}

async function ledgerRows(ctx) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/seller/billing/history`, { waitUntil: 'networkidle' });
  const rows = await page.$$eval('tbody tr', els => els.length);
  await page.close();
  return rows;
}

const A = await browser.newContext();
await reviewState(A, 'reset=1');

// ----------------------------------------------------------- masked contact
const masked = await A.newPage();
await masked.goto(`${BASE}/seller/leads/L-4471`, { waitUntil: 'networkidle' });
const maskedHtml = await masked.content();
const leaked = ['Rina Sen', '9830051134', '98300 51134', 'rina.sen@example.invalid'].filter((v) =>
  maskedHtml.includes(v),
);
ok('1. An unpurchased lead leaks no contact value into the page',
   leaked.length === 0,
   leaked.length === 0
     ? 'name, mobile and email absent from the full HTML including the RSC payload'
     : `LEAKED: ${leaked.join(', ')}`);

ok('2. The mask is rendered as a placeholder',
   maskedHtml.includes('R••• S••') && maskedHtml.includes('Masked until purchase'),
   'the server-composed mask string renders; there is no real value under it');

// ------------------------------------------------------------- happy purchase
const before = await balance(A);
const rowsBefore = await ledgerRows(A);
const buy = await A.newPage();
await buy.goto(`${BASE}/seller/leads/L-4471/buy`, { waitUntil: 'networkidle' });
const token1 = await buy.getAttribute('input[name=idempotencyKey]', 'value');
await Promise.all([
  buy.waitForURL(/\/result$/, { timeout: 15000 }),
  buy.click('button:has-text("Confirm and buy")'),
]);
const resultText = await buy.textContent('body');
const after = await balance(A);
const rowsAfter = await ledgerRows(A);

ok('3. A purchase deducts exactly the lead price',
   before === 4200 && after === 3250,
   `balance ${before} -> ${after} for a ₹950 lead`);

ok('4. The deduction is a ledger entry, not an edited balance',
   rowsAfter === rowsBefore + 1,
   `ledger rows ${rowsBefore} -> ${rowsAfter}; the balance column is derived from them`);

ok('5. Contact details are released only after the purchase',
   resultText.includes('Rina Sen') && resultText.includes('98300 51134'),
   'the result screen shows the values the masked screen never received');

// --------------------------------------------------------------- replay
const replay = await A.newPage();
await replay.goto(`${BASE}/seller/leads/L-4471/buy`, { waitUntil: 'networkidle' });
const replayBody = await replay.textContent('body');
const balanceAfterReplayVisit = await balance(A);
ok('6. A sold lead cannot be bought again',
   !replayBody.includes('Confirm and buy') && balanceAfterReplayVisit === after,
   `revisiting the buy screen offers no confirm button; balance still ${balanceAfterReplayVisit}`);

// Replaying the same idempotency key must resolve, not spend again.
const form = await A.newPage();
await form.goto(`${BASE}/seller/leads/L-4468/buy`, { waitUntil: 'networkidle' });
const token2 = await form.getAttribute('input[name=idempotencyKey]', 'value');
await Promise.all([
  form.waitForURL(/\/result$/, { timeout: 15000 }),
  form.click('button:has-text("Confirm and buy")'),
]);
const afterSecond = await balance(A);
// Submit the SAME key again by re-posting the action's form fields.
const replayed = await A.request.post(`${BASE}/seller/leads/L-4468/buy`, {
  form: { leadId: 'L-4468', idempotencyKey: token2 },
  maxRedirects: 0,
  failOnStatusCode: false,
});
const afterReplay = await balance(A);
ok('7. Replaying a used idempotency key does not deduct twice',
   afterReplay === afterSecond,
   `balance ${afterSecond} -> ${afterReplay} after re-posting key ${token2.slice(0, 8)}… (status ${replayed.status()})`);

ok('8. Each purchase gets its own idempotency key',
   token1 !== token2 && /^[0-9a-f-]{36}$/.test(token1),
   `${token1.slice(0, 8)}… vs ${token2.slice(0, 8)}… — a per-visit key, not a per-lead hash`);

// ------------------------------------------------------- insufficient credits
await reviewState(A, 'reset=1');
await reviewState(A, 'balance=0');
const poor = await A.newPage();
await poor.goto(`${BASE}/seller/leads/L-4471/buy`, { waitUntil: 'networkidle' });
const poorBody = await poor.textContent('body');
ok('9. A balance below the price blocks before the button, not after it',
   poorBody.includes('Not enough credits') && !poorBody.includes('Confirm and buy'),
   'the confirm control is absent and the shortfall is named with a recharge route');

// ------------------------------------------------------------- unverified
await reviewState(A, 'reset=1');
await reviewState(A, 'kyc=pending');
const unver = await A.newPage();
await unver.goto(`${BASE}/seller/leads/L-4471/buy`, { waitUntil: 'networkidle' });
const unverBody = await unver.textContent('body');
ok('10. An unverified account cannot reach the confirm control',
   unverBody.includes('Verification needed') && !unverBody.includes('Confirm and buy'),
   'purchase blocked, browsing still offered');

const browse = await A.newPage();
await browse.goto(`${BASE}/seller/leads`, { waitUntil: 'networkidle' });
ok('11. An unverified account can still browse the marketplace',
   (await browse.textContent('body')).includes('Lead marketplace'),
   'D-07 is open; this implementation allows browsing and blocks the purchase, and says so');

// --------------------------------------------------------------- suspended
await reviewState(A, 'reset=1');
await reviewState(A, 'account=suspended');
const susp = await A.newPage();
await susp.goto(`${BASE}/seller/restricted`, { waitUntil: 'networkidle' });
const suspBody = await susp.textContent('body');
ok('12. Suspension names what is blocked and what still works',
   suspBody.includes('Account suspended') &&
     suspBody.includes('What is blocked') &&
     suspBody.includes('What still works'),
   'C-09: being blocked is not an error, and nothing entered or owned is lost');

ok('13. Suspension does not rewrite verification',
   suspBody.includes('Account suspended') && !suspBody.includes('Verification needed'),
   'the two statuses are separate axes — an approved account stays approved while suspended');

// ------------------------------------------------------------- recharge paths
for (const [outcome, expect] of [
  ['success', 'Credits added'],
  ['pending', 'has not settled yet'],
  ['failed', 'No credits were added'],
]) {
  await reviewState(A, 'reset=1');
  await reviewState(A, `payment=${outcome}`);
  const before = await balance(A);
  const rc = await A.newPage();
  await rc.goto(`${BASE}/seller/billing/recharge`, { waitUntil: 'networkidle' });
  await Promise.all([
    rc.waitForURL(/\/billing\/payment$/, { timeout: 15000 }),
    rc.click('button:has-text("Continue to payment")'),
  ]);
  const body = await rc.textContent('body');
  const after = await balance(A);
  const credited = outcome === 'success';
  ok(`14${outcome[0]}. Recharge outcome "${outcome}" renders its own screen`,
     body.includes(expect) && (credited ? after === before + 2000 : after === before),
     `balance ${before} -> ${after}; screen says "${expect}"`);
}

// ------------------------------------------------------ result screen integrity
await reviewState(A, 'reset=1');
const direct = await A.newPage();
await direct.goto(`${BASE}/seller/leads/L-4471/result`, { waitUntil: 'networkidle' });
ok('15. A result screen opened directly cannot claim a purchase',
   !direct.url().includes('/result'),
   `redirected to ${direct.url().replace(BASE, '')} — no outcome was recorded for this browser`);

const B = await browser.newContext();
const other = await B.newPage();
await other.goto(`${BASE}/seller/billing/payment`, { waitUntil: 'networkidle' });
ok('16. A payment result cannot be reached without an outcome',
   !other.url().includes('/billing/payment'),
   `redirected to ${other.url().replace(BASE, '')}`);

// -------------------------------------------------------------- export
await reviewState(A, 'reset=1');
const buy2 = await A.newPage();
await buy2.goto(`${BASE}/seller/leads/L-4471/buy`, { waitUntil: 'networkidle' });
await Promise.all([
  buy2.waitForURL(/\/result$/, { timeout: 15000 }),
  buy2.click('button:has-text("Confirm and buy")'),
]);
const csv = await A.request.get(`${BASE}/seller/purchased/L-4471/export.csv`);
const csvBody = await csv.text();
ok('17. The CSV export is server-generated and contains the purchased lead',
   csv.status() === 200 &&
     csv.headers()['content-disposition']?.includes('attachment') &&
     csvBody.includes('Rina Sen'),
   `${csv.status()} ${csv.headers()['content-type']}; ${csvBody.split('\r\n').length - 2} data row(s)`);

const notOwned = await A.request.get(`${BASE}/seller/purchased/L-4402/export.csv`, {
  failOnStatusCode: false,
});
ok('18. Exporting a lead this account does not own returns 404, not an empty file',
   notOwned.status() === 404,
   `status ${notOwned.status()} for an unpurchased lead`);

// ------------------------------------------------------- reset determinism

/** The full state a reset has to put back, read through the screens. */
async function snapshot(ctx) {
  const page = await ctx.newPage();
  const read = async (path, fn) => {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    return fn(await page.textContent('body'));
  };

  const balanceText = await read('/seller/billing', (t) =>
    (t.match(/Available balance\s*₹([\d,]+) credits/) ?? [])[1] ?? null,
  );
  // Unique references, not raw matches: each row prints its reference in both
  // the description and the reference column, so counting occurrences triples
  // the number of entries.
  const ledgerRows = await read('/seller/billing/history', (t) =>
    new Set(t.match(/(PAY|ORD|ADJ)-[\d]+/g) ?? []).size,
  );
  const invoiceRows = await read('/seller/billing/invoices', (t) =>
    new Set(t.match(/INV-\d{4}-\d{4}/g) ?? []).size,
  );
  const purchasedCount = await read('/seller/purchased', (t) =>
    Number((t.match(/(\d+) purchased lead/) ?? [])[1] ?? 0),
  );
  const ticketCount = await read('/seller/support', (t) =>
    Number((t.match(/(\d+) ticket/) ?? [])[1] ?? 0),
  );
  const marketCount = await read('/seller/leads', (t) =>
    Number((t.match(/(\d+) leads? ·/) ?? [])[1] ?? 0),
  );
  const kycChip = await read('/seller/kyc/status', (t) =>
    ['Approved', 'In review', 'Rejected', 'Not submitted'].find((w) => t.includes(w)) ?? null,
  );

  await page.close();
  return { balanceText, ledgerRows, invoiceRows, purchasedCount, ticketCount, marketCount, kycChip };
}

async function reconciliation(ctx) {
  const res = await ctx.request.get(`${BASE}/seller/review-state?reconcile=1`);
  return res.json();
}

await reviewState(A, 'reset=1');
const seed = await snapshot(A);

ok('19. The seed state is the documented one',
   seed.balanceText === '4,200' &&
     seed.ledgerRows === 7 &&
     seed.invoiceRows === 3 &&
     seed.purchasedCount === 0 &&
     seed.ticketCount === 3 &&
     seed.marketCount === 4 &&
     seed.kycChip === 'Approved',
   JSON.stringify(seed));

const seedReconcile = await reconciliation(A);
ok('20. The seed ledger reconciles',
   seedReconcile.consistent && seedReconcile.expectedBalance === 4200,
   `opening ${seedReconcile.openingBalance} + deltas ${seedReconcile.sumOfDeltas} = ${seedReconcile.expectedBalance}, reported ${seedReconcile.reportedBalance}, chain ${seedReconcile.chainIntact ? 'intact' : 'BROKEN'}`);

// Disturb every kind of record, then reset.
const dirty1 = await A.newPage();
await dirty1.goto(`${BASE}/seller/leads/L-4471/buy`, { waitUntil: 'networkidle' });
await Promise.all([
  dirty1.waitForURL(/\/result$/, { timeout: 15000 }),
  dirty1.click('button:has-text("Confirm and buy")'),
]);
const dirty2 = await A.newPage();
await dirty2.goto(`${BASE}/seller/billing/recharge`, { waitUntil: 'networkidle' });
await Promise.all([
  dirty2.waitForURL(/\/billing\/payment$/, { timeout: 15000 }),
  dirty2.click('button:has-text("Continue to payment")'),
]);
const dirty3 = await A.newPage();
await dirty3.goto(`${BASE}/seller/support/new`, { waitUntil: 'networkidle' });
await dirty3.fill('#subject', 'Reset determinism probe');
await dirty3.fill('#body', 'A ticket created only so that reset has something to clear.');
await Promise.all([
  dirty3.waitForURL(/\/seller\/support\/T-/, { timeout: 15000 }),
  dirty3.click('button:has-text("Submit ticket")'),
]);
await dirty3.fill('#reply-body', 'A reply, so the thread has been touched too.');
await dirty3.click('button:has-text("Send reply")');
await dirty3.waitForTimeout(600);
await reviewState(A, 'balance=137');
await reviewState(A, 'kyc=rejected');
await reviewState(A, 'account=suspended');

const dirty = await snapshot(A);
ok('21. The disturbance actually changed every kind of record',
   dirty.ledgerRows > seed.ledgerRows &&
     dirty.invoiceRows > seed.invoiceRows &&
     dirty.purchasedCount > seed.purchasedCount &&
     dirty.ticketCount > seed.ticketCount &&
     dirty.kycChip !== seed.kycChip,
   JSON.stringify(dirty));

await reviewState(A, 'reset=1');
const afterReset = await snapshot(A);
ok('22. Reset restores every record and counter to the seed state',
   JSON.stringify(afterReset) === JSON.stringify(seed),
   `after reset ${JSON.stringify(afterReset)}`);

const resetReconcile = await reconciliation(A);
ok('23. The ledger still reconciles after reset',
   resetReconcile.consistent && JSON.stringify(resetReconcile) === JSON.stringify(seedReconcile),
   `${resetReconcile.expectedBalance} expected, ${resetReconcile.reportedBalance} reported, ${resetReconcile.entryCount} entries`);

// The invariant must hold after each kind of mutation, not just at rest.
const afterEach = [];
const buyAgain = await A.newPage();
await buyAgain.goto(`${BASE}/seller/leads/L-4471/buy`, { waitUntil: 'networkidle' });
await Promise.all([
  buyAgain.waitForURL(/\/result$/, { timeout: 15000 }),
  buyAgain.click('button:has-text("Confirm and buy")'),
]);
afterEach.push(['purchase', await reconciliation(A)]);

const rechargeAgain = await A.newPage();
await rechargeAgain.goto(`${BASE}/seller/billing/recharge`, { waitUntil: 'networkidle' });
await Promise.all([
  rechargeAgain.waitForURL(/\/billing\/payment$/, { timeout: 15000 }),
  rechargeAgain.click('button:has-text("Continue to payment")'),
]);
afterEach.push(['recharge', await reconciliation(A)]);

await reviewState(A, 'balance=500');
afterEach.push(['review adjustment', await reconciliation(A)]);

await reviewState(A, 'reset=1');
afterEach.push(['reset', await reconciliation(A)]);

ok('24. The ledger reconciles after every kind of mutation',
   afterEach.every(([, r]) => r.consistent),
   afterEach.map(([label, r]) => `${label}: ${r.reportedBalance} (${r.entryCount})`).join(' · '));

// ------------------------------------------------------------- LIMITATIONS

// A purchase has to exist for the cross-session observation to mean anything;
// the reset above cleared the earlier one.
const forCross = await A.newPage();
await forCross.goto(`${BASE}/seller/leads/L-4471/buy`, { waitUntil: 'networkidle' });
await Promise.all([
  forCross.waitForURL(/\/result$/, { timeout: 15000 }),
  forCross.click('button:has-text("Confirm and buy")'),
]);

const C = await browser.newContext();
const crossSession = await C.newPage();
await crossSession.goto(`${BASE}/seller/purchased/L-4471`, { waitUntil: 'networkidle' });
const crossBody = await crossSession.textContent('body');
observed('L1. A second browser sees the first browser\'s purchase',
   crossBody.includes('Rina Sen'),
   'sample mode has one Seller and no sign-in, so state is shared. Per-account isolation is kkl-backend\'s and is NOT demonstrated. This is not an access-control pass.');

const guard = await C.request.get(`${BASE}/seller/review-state?reset=1`, {
  maxRedirects: 0,
  failOnStatusCode: false,
});
observed('L2. The review-state route is reachable in sample mode',
   guard.status() === 307 || guard.status() === 302 || guard.status() === 200,
   `status ${guard.status()}. It sets which designed screen renders; it is not an authorisation bypass, and it returns 404 outside sample mode.`);

await browser.close();

const failed = results.filter((r) => !r.pass);
const changed = observations.filter((o) => !o.reproduced);

console.log(`\n${results.length - failed.length}/${results.length} behaviour checks passed.`);
console.log(
  `${observations.length - changed.length}/${observations.length} known limitations reproduced as documented ` +
    '(reproduction is not a pass — these are things that do not work yet).',
);

if (failed.length) {
  console.log('\nFailed behaviour checks:');
  failed.forEach((f) => console.log(' - ' + f.name));
}
if (changed.length) {
  console.log('\nLimitations that no longer reproduce — re-verify and rewrite as assertions:');
  changed.forEach((c) => console.log(' - ' + c.name));
}
if (failed.length || changed.length) process.exit(1);
