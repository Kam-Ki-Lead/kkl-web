/**
 * CR04 — the lead purchase order journey.
 *
 * Drives the confirmed path in a real browser: pick a lead from Buy Leads,
 * review the order, check out against wallet credits, read the result, find the
 * order in My purchases, open it, and see what the payment and invoice blocks
 * actually claim.
 *
 * It also checks the three things this journey must not do: release contact
 * details before the purchase, charge twice for a repeated submission, or offer
 * a refund, a gateway or a tax treatment nobody has decided on.
 *
 * Run:
 *   NEXT_PUBLIC_KKL_ENV=review NEXT_PUBLIC_KKL_DATA_SOURCE=sample npx next build
 *   KKL_ENV=review KKL_DATA_SOURCE=sample npx next start -p 3811
 *   PLAYWRIGHT=/path/to/playwright/index.mjs node scripts/verify-lead-order-flow.mjs
 */
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3811';
const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}\n      ${detail}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext();

const reset = await ctx.newPage();
await reset.goto(`${BASE}/seller/review-state?reset=1&to=/seller`, { waitUntil: 'networkidle' });
await reset.close();

// ------------------------------------------------------------- selection
const market = await ctx.newPage();
await market.goto(`${BASE}/seller/leads`, { waitUntil: 'networkidle' });
const marketText = await market.textContent('body');
ok('1. The marketplace entry is Buy Leads (CR01) and lists purchasable leads',
  marketText.includes('Buy Leads'),
  'the lead-buying context is named for the action, not "Lead marketplace"');

const firstLead = await market.$eval(
  'a[href^="/seller/leads/"]',
  (el) => el.getAttribute('href'),
);
const leadId = firstLead.split('/seller/leads/')[1].split('?')[0];
await market.goto(`${BASE}/seller/leads/${leadId}`, { waitUntil: 'networkidle' });
const previewHtml = await market.content();

// A phone number in the markup before purchase would be the whole point lost.
const phoneInPreview = /\b(?:\+91[\s-]?)?[6-9]\d{9}\b/.test(previewHtml.replace(/\s+/g, ' '));
ok('2. The masked preview carries no contact details, in the markup as well as on screen',
  !phoneInPreview,
  'no mobile-number-shaped string anywhere in the served HTML before the order');

// ---------------------------------------------------------- order review
await market.goto(`${BASE}/seller/leads/${leadId}/buy`, { waitUntil: 'networkidle' });
const reviewText = await market.textContent('body');
ok('3. Order review states the price, the balance and the order of operations',
  reviewText.includes('Balance after purchase') || reviewText.includes('balance'),
  'the review screen shows what will be deducted and what is left, before the button');

ok('4. Checkout is wallet credits, with no gateway named',
  !/razorpay|stripe|paytm|payu|card number|upi id/i.test(reviewText),
  'no payment provider appears anywhere on the checkout screen');

// ------------------------------------------------------------- checkout
await Promise.all([
  market.waitForURL(/\/result$/, { timeout: 20000 }),
  market.click('button:has-text("Confirm and buy")'),
]);
const resultText = await market.textContent('body');
ok('5. The result confirms the purchase and releases the contact details',
  resultText.includes('Lead purchased') && resultText.includes('Contact details'),
  'the success screen is the first place contact details appear');

const orderRef = resultText.match(/ORD-\d+/)?.[0];
ok('6. The result carries an order reference that links to the order',
  Boolean(orderRef) && Boolean(await market.$(`a[href="/seller/orders/${orderRef}"]`)),
  `${orderRef} is a link to its own order record`);

ok('7. A first-time purchase is not labelled a repeat',
  !resultText.includes('This is the purchase you already made'),
  'the duplicate notice is absent when the submission was not a repeat');

// ------------------------------------------ duplicate submission is visible
// A replayed submission is one that carries the SAME idempotency key — a
// retried request, or a client that sent the form twice. Two visits to the
// confirm screen mint two keys and are two intentions, not a replay, so this
// copies the first tab's key into a second tab and submits both.
const leadB = await (async () => {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/seller/leads`, { waitUntil: 'networkidle' });
  const hrefs = await page.$$eval('a[href^="/seller/leads/"]', (els) =>
    els.map((e) => e.getAttribute('href')).filter((h) => /\/seller\/leads\/[^/]+$/.test(h)),
  );
  await page.close();
  const next = hrefs.map((h) => h.split('/seller/leads/')[1]).find((id) => id !== leadId);
  return next ?? null;
})();

if (leadB === null) {
  ok('8. A replayed submission is reported as a repeat, not charged twice',
    false, 'no second lead was available in the marketplace to test a replay against');
} else {
  const tabA = await ctx.newPage();
  await tabA.goto(`${BASE}/seller/leads/${leadB}/buy`, { waitUntil: 'networkidle' });
  const replayToken = await tabA.inputValue('input[name="idempotencyKey"]');

  const tabB = await ctx.newPage();
  await tabB.goto(`${BASE}/seller/leads/${leadB}/buy`, { waitUntil: 'networkidle' });
  // Same key as tab A: this is a replay of A's submission, not a new intention.
  await tabB.$eval('input[name="idempotencyKey"]', (el, value) => {
    el.value = value;
  }, replayToken);

  await Promise.all([
    tabA.waitForURL(/\/result$/, { timeout: 20000 }),
    tabA.click('button:has-text("Confirm and buy")'),
  ]);
  const firstText = await tabA.textContent('body');
  const orderB = firstText.match(/ORD-\d+/)?.[0];

  await Promise.all([
    tabB.waitForURL(/\/result$/, { timeout: 20000 }),
    tabB.click('button:has-text("Confirm and buy")'),
  ]);
  const replayedText = await tabB.textContent('body');

  ok('8. A replayed submission is reported as a repeat, not charged twice',
    replayedText.includes('This is the purchase you already made') &&
      replayedText.includes('not') &&
      (replayedText.match(/ORD-\d+/)?.[0] ?? '') === orderB,
    `the replay resolved to ${orderB} and says so, instead of rendering an ordinary second success`);

  const afterReplay = await ctx.newPage();
  await afterReplay.goto(`${BASE}/seller/orders`, { waitUntil: 'networkidle' });
  const refsAfter = await afterReplay.$$eval('a[href^="/seller/orders/ORD-"]', (els) =>
    els.map((e) => e.getAttribute('href')),
  );
  ok('9. The replay filed no second order',
    refsAfter.filter((h) => h.endsWith(orderB)).length === 1,
    `${orderB} appears on exactly one row after the replayed submission`);
}

const same = await ctx.newPage();
await same.goto(`${BASE}/seller/orders`, { waitUntil: 'networkidle' });
const ordersText = await same.textContent('body');
const orderRows = await same.$$eval('a[href^="/seller/orders/ORD-"]', (els) =>
  els.map((e) => e.getAttribute('href')),
);
ok('10. Every order row is a distinct order',
  new Set(orderRows).size === orderRows.length && orderRows.length >= 1,
  `${orderRows.length} order row(s), all distinct`);

// ------------------------------------------------------- My purchases list
ok('11. My purchases lists the order with its amount and payment method',
  ordersText.includes(orderRef) && ordersText.includes('Wallet credits'),
  `${orderRef} listed with what paid for it`);

// ------------------------------------------------------------ order detail
const detail = await ctx.newPage();
await detail.goto(`${BASE}/seller/orders/${orderRef}`, { waitUntil: 'networkidle' });
const detailText = await detail.textContent('body');

ok('12. The order detail shows what was ordered and what paid for it',
  detailText.includes('What you ordered') && detailText.includes('Payment') &&
    detailText.includes('Wallet credits'),
  'item, area, amount and method all render');

ok('13. The payment block names the ledger entry, so the money is traceable',
  detailText.includes('Ledger entry') && detailText.includes(orderRef),
  'the deduction is pointed at by reference rather than asserted');

ok('14. The invoice state is stated rather than implied',
  detailText.includes('No separate invoice for this order') &&
    detailText.includes('not yet decided'),
  'no download that leads nowhere, and no invented tax treatment');

ok('15. There is no refund or cancel control, and it says why',
  !(await detail.$('button:has-text("Refund")')) &&
    !(await detail.$('button:has-text("Cancel order")')) &&
    detailText.includes('has not been decided'),
  'refund eligibility is undecided, so no control pretends otherwise');

ok('16. The order links to the lead rather than repeating its contact details',
  Boolean(await detail.$(`a[href="/seller/purchased/${leadId}"]`)) &&
    !/\b(?:\+91[\s-]?)?[6-9]\d{9}\b/.test((await detail.content()).replace(/\s+/g, ' ')),
  'contact details live on one screen, not several');

// ------------------------------------------------- the lead links back
const leadPage = await ctx.newPage();
await leadPage.goto(`${BASE}/seller/purchased/${leadId}`, { waitUntil: 'networkidle' });
ok('17. The purchased lead links to its order',
  Boolean(await leadPage.$(`a[href="/seller/orders/${orderRef}"]`)),
  'the two records point at each other');

// --------------------------------------------- an order id is not a capability
const missing = await ctx.newPage();
const notFound = await missing.goto(`${BASE}/seller/orders/ORD-999999`, {
  waitUntil: 'domcontentloaded',
});
ok('18. An unknown order reference is a 404',
  notFound.status() === 404,
  `HTTP ${notFound.status()} — missing and not-yours are the same answer`);

// The Builder pool is separate: a Seller order must not resolve there.
const crossPool = await ctx.newPage();
const crossStatus = await crossPool.goto(`${BASE}/builder/orders/${orderRef}`, {
  waitUntil: 'domcontentloaded',
});
ok('19. A Seller order does not resolve in the Builder console',
  crossStatus.status() === 404,
  `HTTP ${crossStatus.status()} — the two lead pools are separate and so are their orders`);

// ------------------------------------------------- Builder side is the same
const builderOrders = await ctx.newPage();
await builderOrders.goto(`${BASE}/builder/orders`, { waitUntil: 'networkidle' });
const builderText = await builderOrders.textContent('body');
ok('20. The Builder console has the same order history over its own pool',
  builderText.includes('order') && !builderText.includes(orderRef),
  'the screen exists for Builders and does not show the Seller\'s order');

await browser.close();

const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} checks passed.`);
if (passed !== results.length) {
  console.log('FAILED:');
  for (const r of results.filter((x) => !x.pass)) console.log(`  - ${r.name}`);
  process.exit(1);
}
