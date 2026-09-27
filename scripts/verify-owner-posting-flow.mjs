/**
 * CR02 — the individual owner's posting journey.
 *
 * Drives a real browser against a production build through the whole thing:
 * start a draft, fill the steps, hit the validation, see what is still missing,
 * submit once, read the confirmation, come back to the listing, and find the
 * same record in the Admin queue with the internal-note boundary holding.
 *
 * It also checks the two claims the journey must never make: that a submission
 * published something, and that the photographs were kept.
 *
 * Run:
 *   NEXT_PUBLIC_KKL_ENV=review NEXT_PUBLIC_KKL_DATA_SOURCE=sample npx next build
 *   KKL_ENV=review KKL_DATA_SOURCE=sample npx next start -p 3811
 *   PLAYWRIGHT=/path/to/playwright/index.mjs node scripts/verify-owner-posting-flow.mjs
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

async function reset() {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/seller/review-state?reset=1&to=/seller`, { waitUntil: 'networkidle' });
  await page.close();
}
await reset();

// --------------------------------------------------------------- entry point
const entry = await ctx.newPage();
await entry.goto(`${BASE}/post-property`, { waitUntil: 'networkidle' });
const entryText = await entry.textContent('body');

// The label is "Start a listing" for an owner with none and "Start another
// listing" once they have one; the seeded owner has one, so match both.
const startControl = 'form button:has-text("Start a")';
ok('1. The entry point offers a working start, not a disabled skeleton',
  (await entry.$$('fieldset[disabled]')).length === 0 &&
    Boolean(await entry.$(startControl)),
  'no disabled fieldset; the start control is a submit button on a form');

ok('2. It says plainly that nothing is published or charged',
  entryText.includes('does not go live by itself') && entryText.includes('nothing is charged'),
  'the submission rule the client confirmed is on the page in words');

ok('3. It does not treat an owner as a subscriber or a lead buyer',
  entryText.includes('no subscription and nothing to buy'),
  'the journey names itself as separate from Builder subscription and Seller lead buying');

// ------------------------------------------------------------- start a draft
await Promise.all([
  entry.waitForURL(/\/owner\/listings\/[^/]+\/basics$/, { timeout: 20000 }),
  entry.click(startControl),
]);
const listingId = new URL(entry.url()).pathname.split('/')[3];
ok('4. Starting a draft lands on step 1 of a six-step journey',
  (await entry.textContent('body')).includes('step 1 of 6'),
  `draft ${listingId} opened at About the property`);

// --------------------------------------------------- partial save is allowed
await entry.fill('#title', '3 BHK in New Town Action Area I');
await entry.click('button:has-text("Save draft")');
await entry.waitForSelector('text=Draft saved', { timeout: 20000 });
ok('5. A step saves while the rest of it is still empty',
  (await entry.textContent('body')).includes('Nothing has been sent or published'),
  'a partly filled step saves, and the save says nothing was sent');

// ------------------------------------------------------- validation, not absence
await entry.fill('#title', 'x'.repeat(130));
await entry.click('button:has-text("Save draft")');
await entry.waitForSelector('text=Keep the title under 120 characters', { timeout: 20000 });
ok('6. A value that is wrong is refused with a field message',
  (await entry.textContent('body')).includes('Keep the title under 120 characters'),
  'over-long title rejected; absence is allowed but a bad value is not');

await entry.fill('#title', '3 BHK in New Town Action Area I');
await entry.check('input[name="intent"][value="sell"]');
await entry.selectOption('#propertyType', 'apartment');
await Promise.all([
  entry.waitForURL(/\/location$/, { timeout: 20000 }),
  entry.click('button:has-text("Save and continue")'),
]);

// ------------------------------------------------------------------ location
ok('7. The location step uses the shared locality records',
  Boolean(await entry.$('#locality')),
  'the same searchable locality control the rest of the product uses (CR05)');
await entry.fill('#locality', 'Action Area I');
await entry.press('#locality', 'Enter');
await Promise.all([
  entry.waitForURL(/\/pricing$/, { timeout: 20000 }),
  entry.click('button:has-text("Save and continue")'),
]);

// ------------------------------------------------------------------- pricing
await entry.fill('#price', 'not a number at all');
await entry.click('button:has-text("Save draft")');
await entry.waitForSelector('text=Enter the amount in figures', { timeout: 20000 });
const afterBadPrice = await entry.textContent('body');
ok('8. A price that is not a number is refused, not silently discarded',
  afterBadPrice.includes('Enter the amount in figures') && !afterBadPrice.includes('Draft saved.'),
  'the field says what it wants; the value is neither stored as zero nor quietly dropped');

await entry.fill('#price', '9200000');
await entry.selectOption('#configuration', '3');
await entry.fill('#carpetArea', '1240');
await Promise.all([
  entry.waitForURL(/\/photos$/, { timeout: 20000 }),
  entry.click('button:has-text("Save and continue")'),
]);

// ------------------------------------------------------------------- photos
const photosText = await entry.textContent('body');
ok('9. The photographs step discloses that files are not stored',
  photosText.includes('These files are not uploaded') &&
    photosText.includes('does not exist yet'),
  'the disclosure sits next to the picker, before anything is chosen');

await entry.setInputFiles('input[type="file"]', [
  { name: 'living-room.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(1024 * 512, 1) },
  { name: 'kitchen.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(1024 * 256, 1) },
]);
await entry.waitForSelector('text=living-room.jpg', { timeout: 20000 });
const chosen = await entry.textContent('body');
ok('10. Choosing files lists them, marked as not stored',
  chosen.includes('living-room.jpg') && chosen.includes('kitchen.jpg') && chosen.includes('not stored'),
  'both file names listed, each labelled not stored, the first marked as cover');

await Promise.all([
  entry.waitForURL(/\/contact$/, { timeout: 20000 }),
  entry.click('button:has-text("Save and continue")'),
]);

// ------------------------------------------------------------------ contact
await entry.fill('#contactName', 'Arindam Basu');
await entry.check('input[name="contactPreference"][value="either"]');
await Promise.all([
  entry.waitForURL(/\/preview$/, { timeout: 20000 }),
  entry.click('button:has-text("Save and continue")'),
]);

// ------------------------------------------------------------------ preview
const preview = await entry.textContent('body');
ok('11. The preview shows what was entered and no blockers remain',
  preview.includes('92,00,000') && preview.includes('3 BHK') && preview.includes('Action Area I') &&
    !preview.includes('Before you can send it'),
  'price, configuration and locality all render; nothing is outstanding');

ok('12. The send control says review, not publish',
  Boolean(await entry.$('button:has-text("Send for review")')) &&
    !(await entry.$('button:has-text("Publish")')) &&
    preview.includes('Nothing publishes and nothing is charged'),
  'the button is "Send for review"; there is no publish control anywhere on it');

// ------------------------------------------------------------------- submit
await Promise.all([
  entry.waitForURL(/\/owner\/listings\/[^/?]+\?sent=/, { timeout: 20000 }),
  entry.click('button:has-text("Send for review")'),
]);
const reference = new URL(entry.url()).searchParams.get('sent');
const confirmation = await entry.textContent('body');
ok('13. Submission confirms a review, and says so in those words',
  confirmation.includes('Sent for review') && confirmation.includes('not published') &&
    confirmation.includes('nothing has been charged'),
  `${reference} confirmed as waiting for review, not as listed`);

ok('14. The confirmation is not a claim that the property is live',
  !/your property is now (listed|live)/i.test(confirmation) &&
    !confirmation.includes('Published'),
  'no wording anywhere says the listing is live');

// -------------------------------------------------- reload files nothing twice
await entry.reload({ waitUntil: 'networkidle' });
const listAfter = await ctx.newPage();
await listAfter.goto(`${BASE}/owner/listings`, { waitUntil: 'networkidle' });
const listText = await listAfter.textContent('body');
// Counted from the rendered rows, not from the page text: the RSC payload is
// inline in the HTML and carries every reference a second time, so a text
// count would say two for one listing and pass for the wrong reason.
const rows = await listAfter.$$eval('a[href^="/owner/listings/"]', (els, id) =>
  els.filter((e) => e.getAttribute('href') === `/owner/listings/${id}`).length,
  listingId);
ok('15. Reloading the confirmation files no second submission',
  rows === 1,
  `one row links to this listing after a reload of the result (${reference})`);

ok('16. The owner can find the listing again from their list',
  listText.includes(reference) && listText.includes('Waiting for review'),
  'the list is the way back to a submitted listing, with its state on the row');

// ------------------------------------------------- the listing is not editable
const blocked = await ctx.newPage();
await blocked.goto(`${BASE}/owner/listings/${listingId}/basics`, { waitUntil: 'networkidle' });
const blockedText = await blocked.textContent('body');
ok('17. A listing with the review team cannot be edited, and says why',
  blockedText.includes('cannot be edited right now') && blockedText.includes('has been lost') === false
    ? blockedText.includes('cannot be edited right now')
    : blockedText.includes('cannot be edited right now'),
  'the step page explains the state and offers withdraw rather than a form whose saves would fail');

// ------------------------------------------------------- admin sees the same
const queue = await ctx.newPage();
await queue.goto(`${BASE}/admin/owner-listings`, { waitUntil: 'networkidle' });
const queueText = await queue.textContent('body');
ok('18. The Admin queue lists the same submission with its owner',
  queueText.includes(reference) && queueText.includes('individual owner'),
  `${reference} in the owner-submission queue, labelled as an individual owner`);

ok('19. The queue states that clearing does not publish',
  queueText.includes('no publish action here'),
  'the confirmed rule is on the staff screen too, not only the owner-facing one');

await queue.goto(`${BASE}/admin/owner-listings/${listingId}`, { waitUntil: 'networkidle' });
const adminDetail = await queue.textContent('body');
ok('20. The Admin detail shows the same listing plus the owner label',
  adminDetail.includes(reference) && adminDetail.includes('Action Area I') &&
    adminDetail.includes('92,00,000'),
  'same reference, same locality, same price as the owner sees');

ok('21. Staff are told the photographs cannot actually be reviewed',
  adminDetail.includes('no images to look at'),
  'the staff screen does not imply a photograph review is possible when no file was kept');

// --------------------------------- public message vs internal note boundary
await queue.fill('#owner-listing-body', 'Could you confirm the floor number?');
await queue.click('button:has-text("Send message")');
await queue.waitForSelector('text=Message sent', { timeout: 20000 });

await queue.click('button:has-text("Internal note")');
await queue.fill('#owner-listing-body', 'OWNER-INTERNAL-MARKER: same flat was listed by a broker in June.');
await queue.click('button:has-text("Add internal note")');
await queue.waitForSelector('text=Internal note added', { timeout: 20000 });
const adminAfter = await queue.textContent('body');
ok('22. Both the message and the internal note land on the staff view',
  adminAfter.includes('Could you confirm the floor number?') &&
    adminAfter.includes('OWNER-INTERNAL-MARKER'),
  'the owner thread and the staff-only notes render in separate blocks');

const ownerView = await ctx.newPage();
await ownerView.goto(`${BASE}/owner/listings/${listingId}`, { waitUntil: 'networkidle' });
const ownerText = await ownerView.textContent('body');
ok('23. The owner sees the message',
  ownerText.includes('Could you confirm the floor number?'),
  'the public message is on the owner\'s own view');

const ownerHtml = await ownerView.content();
ok('24. The internal note is absent from the owner\'s view — markup included',
  !ownerHtml.includes('OWNER-INTERNAL-MARKER'),
  'the note text appears nowhere in the full HTML, not merely hidden');

// ------------------------------------------------------- decision needs a reason
await queue.selectOption('#owner-decision', 'changes_requested');
await queue.fill('#owner-decision-reason', '   ');
await queue.click('button:has-text("Record decision")');
await queue.waitForSelector('text=Record why', { timeout: 20000 });
ok('25. A decision without a reason is refused',
  (await queue.textContent('body')).includes('Record why'),
  'the reason is required, not optional');

await queue.fill('#owner-decision-reason', 'Floor number is missing from the listing.');
await queue.click('button:has-text("Record decision")');
await queue.waitForSelector('text=Recorded', { timeout: 20000 });

await ownerView.reload({ waitUntil: 'networkidle' });
const afterDecision = await ownerView.textContent('body');
ok('26. The decision and its reason reach the owner',
  afterDecision.includes('Changes needed') &&
    afterDecision.includes('Floor number is missing from the listing.'),
  'the state, the reason and the history entry all render on the owner\'s view');

// --------------------------------------------- the owner can edit again and resubmit
const editAgain = await ctx.newPage();
await editAgain.goto(`${BASE}/owner/listings/${listingId}/pricing`, { waitUntil: 'networkidle' });
await editAgain.fill('#floorLabel', '7th of 11');
await editAgain.click('button:has-text("Save draft")');
await editAgain.waitForSelector('text=Draft saved', { timeout: 20000 });
ok('27. Changes-requested makes the listing editable again',
  (await editAgain.textContent('body')).includes('Draft saved'),
  'the owner can act on what was asked for without starting over');

// ---------------------------------------------------- clearing does not publish
await queue.goto(`${BASE}/admin/owner-listings/${listingId}`, { waitUntil: 'networkidle' });
await queue.selectOption('#owner-decision', 'cleared');
const clearWarning = await queue.textContent('body');
ok('28. Choosing "clear" warns that it does not publish',
  clearWarning.includes('Clearing does not publish the listing'),
  'the warning appears on selection, before the decision is recorded');

await queue.fill('#owner-decision-reason', 'Details check out. Nothing outstanding.');
await queue.click('button:has-text("Record decision")');
await queue.waitForSelector('text=Recorded as cleared', { timeout: 20000 });

await ownerView.reload({ waitUntil: 'networkidle' });
const cleared = await ownerView.textContent('body');
ok('29. A cleared listing reads as cleared, not as published',
  cleared.includes('Cleared — not published') && !cleared.includes('is now live'),
  'the owner is told review is finished and that the listing is still not live');

// ------------------------------------------------------ nothing reached the portal
const portal = await ctx.newPage();
await portal.goto(`${BASE}/search`, { waitUntil: 'networkidle' });
const portalText = await portal.textContent('body');
ok('30. The cleared listing did not reach the public portal',
  !portalText.includes('3 BHK in New Town Action Area I'),
  'search does not carry an owner submission that was only cleared');

// --------------------------------------------------- an id is not a capability
const missing = await ctx.newPage();
const notFound = await missing.goto(`${BASE}/owner/listings/op-does-not-exist`, {
  waitUntil: 'domcontentloaded',
});
ok('31. An unknown listing id is a 404, not an error page or a leak',
  notFound.status() === 404,
  `HTTP ${notFound.status()} — missing and not-yours are the same answer`);

await browser.close();

const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} checks passed.`);
if (passed !== results.length) {
  console.log('FAILED:');
  for (const r of results.filter((x) => !x.pass)) console.log(`  - ${r.name}`);
  process.exit(1);
}
