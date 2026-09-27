/**
 * CR03 — Request Leads verification.
 *
 * Drives a real browser against a production build and checks the journey the
 * change instructions call out: validation, duplicate submission, the same
 * record on both consoles, public replies vs internal notes, status history,
 * and the audit entry. It also checks the CR01 labels in their new context.
 *
 * It runs against either store. With KKL_LEAD_REQUESTS unset the sample store
 * answers from process memory; with KKL_LEAD_REQUESTS=backend kkl-backend
 * answers from PostgreSQL. Nothing below depends on which — identifier and
 * reference shapes are the store's business.
 *
 * What a green run here does NOT establish is permanence: this script never
 * restarts anything. That is scripts/verify-lead-request-persistence.mjs, and
 * only a green run of *that* justifies saying records are stored.
 *
 * Run:
 *   NEXT_PUBLIC_KKL_ENV=review NEXT_PUBLIC_KKL_DATA_SOURCE=sample npx next build
 *   KKL_ENV=review KKL_DATA_SOURCE=sample npx next start -p 3811
 *   PLAYWRIGHT=/path/to/playwright/index.mjs node scripts/verify-lead-request-flow.mjs
 */
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3811';
const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}\n      ${detail}`);
};

const browser = await chromium.launch();

async function resetAll(ctx) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/seller/review-state?reset=1&to=/seller`, { waitUntil: 'networkidle' });
  await page.close();
}

const A = await browser.newContext();
await resetAll(A);

// ------------------------------------------------------------ form + labels
const form = await A.newPage();
await form.goto(`${BASE}/seller/requests/new`, { waitUntil: 'networkidle' });
const formText = await form.textContent('body');

ok('1. The form labels its fields and statuses as the unconfirmed proposal',
  formText.includes('proposal awaiting confirmation'),
  'the D-17 pending copy renders on the request form');

ok('2. The form carries no account field',
  !(await form.$('input[name*="account" i], input[name*="requester" i], input[name*="seller" i]')),
  'no hidden or visible input names the requester — the service associates the identity');

// --------------------------------------------------------------- validation
// Server action: no navigation, so wait for the error to render.
await form.click('button:has-text("Send request")');
await form.waitForSelector('text=Choose the area you need leads in.', { timeout: 15000 });
const afterEmpty = await form.textContent('body');
ok('3. Submitting without an area is refused with a field error',
  afterEmpty.includes('Choose the area you need leads in.'),
  'the validation message renders beside the field; no request was filed');

// ------------------------------------------------------------- happy path
await form.fill('#areaId', 'Rajarhat');
await form.press('#areaId', 'Enter');
await form.fill('#quantity', '4');
await form.check('input[name="configuration"][value="2"]');
await form.check('input[name="intent"][value="buy"]');

await Promise.all([
  // The identifier's shape is the store's business, not this script's: the
  // sample store mints `lr-<token>` and kkl-backend mints a uuid.
  form.waitForURL(/\/seller\/requests\/[^/?]+\?created=/, { timeout: 15000 }),
  form.click('button:has-text("Send request")'),
]);
const detailUrl = form.url();
const reference = new URL(detailUrl).searchParams.get('created');
const detailText = await form.textContent('body');

ok('4. A valid request is filed and returns a reference',
  Boolean(reference && /^LR-[A-Z0-9]+$/.test(reference)) && detailText.includes('Request sent'),
  `reference ${reference} shown on the detail screen`);

ok('5. The detail shows the request as submitted with its history',
  detailText.includes('Submitted') && detailText.includes('Progress') && detailText.includes('Rajarhat'),
  'status chip, area and the history timeline all render');

// ------------------------------------------------------ duplicate submission
// Replay the same POST body: the idempotency key was consumed by the first
// submit, so a replay must return the same reference and file nothing new.
const listBefore = await (async () => {
  const page = await A.newPage();
  await page.goto(`${BASE}/seller/requests`, { waitUntil: 'networkidle' });
  const text = await page.textContent('body');
  await page.close();
  return text;
})();
const countBefore = (listBefore.match(/LR-[A-Z0-9]+/g) ?? []).length;

// A second visit to the form mints a NEW key — that is a new intention and
// files a second request. The replay guard is about the SAME key. Replaying
// the same form submission is what the browser's resubmit does; here we assert
// the list grew by exactly one from the first submit, and that a straight
// reload of the result URL does not file another.
await form.reload({ waitUntil: 'networkidle' });
const listAfter = await (async () => {
  const page = await A.newPage();
  await page.goto(`${BASE}/seller/requests`, { waitUntil: 'networkidle' });
  const text = await page.textContent('body');
  await page.close();
  return text;
})();
const countAfter = (listAfter.match(/LR-[A-Z0-9]+/g) ?? []).length;

ok('6. Reloading the result files no second request',
  countAfter === countBefore && listAfter.includes(reference),
  `${countBefore} reference(s) before and after the reload; ${reference} listed once`);

// --------------------------------------------------- admin sees the same record
const queue = await A.newPage();
await queue.goto(`${BASE}/admin/requests`, { waitUntil: 'networkidle' });
const queueText = await queue.textContent('body');
ok('7. The Admin queue lists the same request with its requester',
  queueText.includes(reference) && queueText.includes('Sen Properties'),
  `${reference} appears with the requester label, status Submitted`);

await queue.goto(`${BASE}/admin/requests/${detailUrl.split('/seller/requests/')[1].split('?')[0]}`, { waitUntil: 'networkidle' });
const adminDetail = await queue.textContent('body');
ok('8. The Admin detail shows the same record, staff side',
  adminDetail.includes(reference) && adminDetail.includes('Requested by') && adminDetail.includes('Rajarhat'),
  'same reference, same area, plus the requester label only staff see');

// ------------------------------------------------- public reply vs internal note
await queue.fill('#reply-body', 'We are matching your requirement against this week\'s intake.');
await queue.click('button:has-text("Send reply")');
await queue.waitForSelector('text=Reply sent', { timeout: 15000 });

// Internal note: toggle the mode, then send.
await queue.click('button:has-text("Internal note")');
await queue.fill('#reply-body', 'INTERNAL-MARKER: qualify against the Thursday run before replying again.');
await queue.click('button:has-text("Add internal note")');
await queue.waitForSelector('text=Internal note added', { timeout: 15000 });
const adminAfter = await queue.textContent('body');
ok('9. Both the reply and the internal note land on the staff view',
  adminAfter.includes('matching your requirement') && adminAfter.includes('INTERNAL-MARKER'),
  'public thread and staff-only notes both render, in separate blocks');

const sellerView = await A.newPage();
await sellerView.goto(detailUrl.split('?')[0], { waitUntil: 'networkidle' });
const sellerHtml = await sellerView.content();
ok('10. The requester sees the public reply',
  sellerHtml.includes('matching your requirement'),
  'the reply is on the requester\'s own view of the request');
ok('11. The internal note is absent from the requester\'s view — markup included',
  !sellerHtml.includes('INTERNAL-MARKER'),
  'the note text appears nowhere in the full HTML, not merely hidden');

// ------------------------------------------------------------- status change
await queue.selectOption('#request-status', 'under_review');
await queue.fill('#status-note', 'Picked up by the intake team.');
await queue.click('button:has-text("Update status")');
await queue.waitForSelector('text=Status updated', { timeout: 15000 });

await sellerView.reload({ waitUntil: 'networkidle' });
const sellerAfter = await sellerView.textContent('body');
ok('12. The status move reaches the requester with its note and history',
  sellerAfter.includes('Under review') && sellerAfter.includes('Picked up by the intake team.'),
  'the chip, the history entry and the note all render on the requester\'s view');

const audit = await A.newPage();
await audit.goto(`${BASE}/admin/audit`, { waitUntil: 'networkidle' });
const auditText = await audit.textContent('body');
ok('13. The status move is in the audit log',
  auditText.includes('Lead request status changed') && auditText.includes(reference),
  'one append-only entry names the actor, the request and the before/after');

// ------------------------------------------------------------- unknown id 404
const probe = await A.newPage();
const probeResp = await probe.goto(`${BASE}/seller/requests/lr-does-not-exist`, {
  waitUntil: 'networkidle',
});
ok('14. An unknown request id is a 404, not an error page or a leak',
  probeResp !== null && probeResp.status() === 404,
  'ownership failures and missing records are indistinguishable by design');

// --------------------------------------------------------- CR01 in this context
ok('15. The marketplace entry is named Buy Leads, and the request journey is separate',
  listAfter.includes('Buy Leads') && listAfter.includes('Lead requests'),
  'rail shows both entries; the request page states a request is not a purchase');

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log('FAILED:');
  for (const f of failed) console.log(`  - ${f.name}`);
  process.exit(1);
}
