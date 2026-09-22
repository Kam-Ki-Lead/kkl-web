/**
 * Builder journey verification.
 *
 * Covers the two joins the approved prototype leaves disconnected — publishing
 * reaching the public portal, and a Buyer's enquiry reaching the Builder — plus
 * the listing editor, both contact-access alternatives, the subscription states
 * and the separation between Builder and Seller records.
 *
 * Behaviour checks and known limitations are counted separately. Reproducing a
 * limitation is not a control passing.
 *
 * Run with a production build serving on BASE_URL.
 */
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3811';
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
const ctx = await browser.newContext();

async function review(query) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/builder/review-state?${query}`, { waitUntil: 'networkidle' });
  await page.close();
}
async function sellerReview(query) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/seller/review-state?${query}`, { waitUntil: 'networkidle' });
  await page.close();
}
async function text(path) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  const body = await page.textContent('body');
  await page.close();
  return body;
}
async function click(page, label) {
  await Promise.all([page.waitForLoadState('networkidle'), page.click(`button:has-text("${label}")`)]);
}

await review('reset=1');
await sellerReview('reset=1');

// ------------------------------------------------- listing → portal continuity
const portalBefore = await text('/search');
ok('1. Published listings appear on the public portal',
   portalBefore.includes('Greenview Residency') && portalBefore.includes('Lakeshore Heights'),
   'both published listings are in search');

ok('2. An unpublished listing is absent from the portal',
   !portalBefore.includes('Orchid Grove'),
   'Orchid Grove is unpublished in the console and does not appear in search');

const props = await ctx.newPage();
await props.goto(`${BASE}/builder/properties`, { waitUntil: 'networkidle' });
await Promise.all([
  props.waitForLoadState('networkidle'),
  props.locator('form:has(button:has-text("Unpublish"))').first().locator('button').click(),
]);
await props.waitForTimeout(400);
const portalAfterUnpublish = await text('/search');
ok('3. Unpublishing in the console removes the listing from the portal',
   !portalAfterUnpublish.includes('Greenview Residency'),
   'the join runs the whole way — this is the continuity the prototype leaves disconnected');

// Republish it.
await props.goto(`${BASE}/builder/properties?tab=unpublished`, { waitUntil: 'networkidle' });
await Promise.all([
  props.waitForLoadState('networkidle'),
  props.locator('form:has(button:has-text("Republish"))').first().locator('button').click(),
]);
await props.waitForTimeout(400);
const portalAfterRepublish = await text('/search');
ok('4. Republishing puts it back',
   portalAfterRepublish.includes('Greenview Residency'),
   'nothing was deleted by unpublishing');

// -------------------------------------------------- buyer enquiry → builder
const enquiriesBefore = await text('/builder/enquiries');
const buyer = await browser.newContext();
const bp = await buyer.newPage();
await bp.goto(`${BASE}/property/greenview-residency/enquiry`, { waitUntil: 'networkidle' });
await bp.fill('#name', 'Continuity Tester');
await bp.fill('#mobile', '9830077001');
const msg = await bp.$('#message');
if (msg) await msg.fill('Does the join from the portal to the builder console work?');
await Promise.all([bp.waitForURL(/\/auth/, { timeout: 15000 }), bp.click('form button[type=submit]')]);
await bp.fill('#auth-code', '123456');
await Promise.all([
  bp.waitForURL(/\/enquiry\/[^/]+\/confirmed/, { timeout: 15000 }),
  bp.click('button:has-text("Verify and continue")'),
]);
const enquiriesAfter = await text('/builder/enquiries');
ok('5. A Buyer enquiry from the portal reaches the Builder console',
   !enquiriesBefore.includes('Continuity Tester') && enquiriesAfter.includes('Continuity Tester'),
   'the second join the prototype leaves disconnected');

// ---------------------------------------------- contact access alternatives
await review('reset=1&contact=included');
const includedList = await text('/builder/enquiries');
ok('6. Alternative A shows contact details without unlocking',
   includedList.includes('98300 51134') && includedList.includes('alternative A'),
   'and the screen says which alternative is showing');

await review('reset=1&contact=unlock');
const lockedList = await text('/builder/enquiries');
ok('7. Alternative B withholds the number entirely',
   !lockedList.includes('98300 51134') &&
     lockedList.includes('R••• S••') &&
     lockedList.includes('alternative B'),
   'the full number is not in the page at all — masking is the absence of data');

const lockedDetail = await ctx.newPage();
await lockedDetail.goto(`${BASE}/builder/enquiries/E-8801`, { waitUntil: 'networkidle' });
const lockedHtml = await lockedDetail.content();
ok('8. The locked enquiry leaks no number into the detail page HTML',
   !lockedHtml.includes('98300 51134') && !lockedHtml.includes('9830051134'),
   'checked against the full HTML including the RSC payload');

const balanceBefore = Number(
  ((await text('/builder/billing')).match(/Available balance\s*₹([\d,]+) credits/) ?? [])[1]?.replace(/,/g, '') ?? -1,
);
await click(lockedDetail, 'Unlock for');
await lockedDetail.waitForTimeout(400);
const unlockedHtml = await lockedDetail.textContent('body');
const balanceAfter = Number(
  ((await text('/builder/billing')).match(/Available balance\s*₹([\d,]+) credits/) ?? [])[1]?.replace(/,/g, '') ?? -1,
);
ok('9. Unlocking reveals the contact and deducts the price',
   unlockedHtml.includes('98300 51134') && balanceAfter === balanceBefore - 250,
   `balance ${balanceBefore} → ${balanceAfter} for a ₹250 unlock`);

// ------------------------------------------------------------ listing editor
await review('reset=1');
const editor = await ctx.newPage();
await editor.goto(`${BASE}/builder/properties/new`, { waitUntil: 'networkidle' });
await Promise.all([editor.waitForURL(/\/basics$/, { timeout: 15000 }), editor.click('button:has-text("New listing")')]);
const newId = editor.url().split('/properties/')[1].split('/')[0];

await editor.goto(`${BASE}/builder/properties/${newId}/preview`, { waitUntil: 'networkidle' });
const emptyPreview = await editor.textContent('body');
ok('10. An empty listing names every blocker with its section',
   emptyPreview.includes('cannot be published yet') &&
     emptyPreview.includes('Project name is missing') &&
     emptyPreview.includes('Street address is missing') &&
     emptyPreview.includes('At least one photograph is required'),
   'blockers link to the section that owns them');

const publishDisabled = await editor.isDisabled('button:has-text("Publish listing")');
ok('11. Publish is unavailable while blockers remain',
   publishDisabled,
   'and the service refuses regardless — the disabled state is a courtesy');

// Fill it in.
await editor.goto(`${BASE}/builder/properties/${newId}/basics`, { waitUntil: 'networkidle' });
await editor.fill('#title', 'Continuity Gardens');
await editor.selectOption('#propertyType', 'Apartment');
await editor.fill('#possessionTarget', 'Mar 2030');
await click(editor, 'Save draft');

await editor.goto(`${BASE}/builder/properties/${newId}/location`, { waitUntil: 'networkidle' });
await editor.selectOption('#locality', 'Rajarhat');
await editor.fill('#addressLine', 'Plot 11, Street 2');
await click(editor, 'Save draft');

await editor.goto(`${BASE}/builder/properties/${newId}/pricing`, { waitUntil: 'networkidle' });
await editor.check('input[name="configurations"][value="2"]');
await editor.fill('#priceMinInr', '6500000');
await editor.fill('#priceMaxInr', '9000000');
await click(editor, 'Save draft');

await editor.goto(`${BASE}/builder/properties/${newId}/media`, { waitUntil: 'networkidle' });
await editor.fill('#photoCount', '2');
await click(editor, 'Save draft');

await editor.goto(`${BASE}/builder/properties/${newId}/preview`, { waitUntil: 'networkidle' });
const readyPreview = await editor.textContent('body');
ok('12. A complete listing clears its blockers and previews as the portal shows it',
   !readyPreview.includes('cannot be published yet') &&
     readyPreview.includes('Continuity Gardens') &&
     readyPreview.includes('Rajarhat'),
   'the buyer preview renders from what the editor collected');

await click(editor, 'Publish listing');
await editor.waitForTimeout(500);
const portalWithNew = await text('/search');
ok('13. Publishing a listing created in the console puts it on the portal',
   portalWithNew.includes('Continuity Gardens'),
   'a listing with no fixture behind it reaches search');

// ------------------------------------------------- subscription gates publishing
await review('subscription=expired');
const expiredPreview = await text(`/builder/properties/${newId}/preview`);
ok('14. An expired subscription blocks publishing and says so',
   expiredPreview.includes('subscription has lapsed'),
   'the draft is untouched and nothing is lost');

const portalDuringExpiry = await text('/search');
ok('15. An expired subscription does NOT hide live listings',
   portalDuringExpiry.includes('Greenview Residency'),
   'D-02 is undecided, so nothing is hidden — B-05 puts the three alternatives to the client instead of this code choosing');

await review('reset=1');

// ---------------------------------------------- verification gates publishing
await review('kyc=pending');
const unverifiedPreview = await text('/builder/properties/bl-orchid/preview');
ok('16. Verification pending blocks publishing',
   unverifiedPreview.includes('administrator approves your company documents'),
   'and drafts stay editable');

const restrictionsPending = await text('/builder/restrictions');
ok('17. Access restrictions mark the account\'s current state',
   restrictionsPending.includes('Verification pending') && restrictionsPending.includes('This account'),
   'the table is anchored to something real');

await review('reset=1&account=suspended');
const suspended = await text('/builder/restrictions');
ok('18. Suspension does not rewrite verification',
   suspended.includes('Account suspended') && suspended.includes('Verification status is unchanged'),
   'three independent axes, as B-19 requires');

await review('reset=1');

// ------------------------------------------- builder and seller records differ
const builderBilling = await text('/builder/billing');
const sellerBilling = await text('/seller/billing');
const builderBalance = (builderBilling.match(/Available balance\s*₹([\d,]+) credits/) ?? [])[1];
const sellerBalance = (sellerBilling.match(/Available balance\s*₹([\d,]+) credits/) ?? [])[1];
ok('19. Builder and Seller have separate balances',
   builderBalance === '1,850' && sellerBalance === '4,200',
   `builder ₹${builderBalance}, seller ₹${sellerBalance}`);

const builderMarket = await text('/builder/marketplace');
const sellerMarket = await text('/seller/leads');
ok('20. Builder and Seller have separate lead pools',
   builderMarket.includes('L-4530') &&
     !builderMarket.includes('L-4471') &&
     sellerMarket.includes('L-4471') &&
     !sellerMarket.includes('L-4530'),
   'no lead reference appears in both marketplaces');

const builderTickets = await text('/builder/support');
const sellerTickets = await text('/seller/support');
ok('21. Builder and Seller have separate support queues',
   builderTickets.includes('T-3140') &&
     !builderTickets.includes('T-2291') &&
     sellerTickets.includes('T-2291') &&
     !sellerTickets.includes('T-3140'),
   'no ticket appears in both');

// A Builder purchase must not touch the Seller's balance.
const sellerBalanceBefore = sellerBalance;
const buy = await ctx.newPage();
await buy.goto(`${BASE}/builder/marketplace/L-4530/buy`, { waitUntil: 'networkidle' });
await Promise.all([buy.waitForURL(/\/result$/, { timeout: 15000 }), buy.click('button:has-text("Confirm and buy")')]);
const sellerBalanceAfter = ((await text('/seller/billing')).match(/Available balance\s*₹([\d,]+) credits/) ?? [])[1];
const builderBalanceAfter = ((await text('/builder/billing')).match(/Available balance\s*₹([\d,]+) credits/) ?? [])[1];
ok('22. A Builder purchase spends only the Builder\'s credits',
   sellerBalanceAfter === sellerBalanceBefore && builderBalanceAfter !== builderBalance,
   `seller unchanged at ₹${sellerBalanceAfter}; builder ₹${builderBalance} → ₹${builderBalanceAfter}`);

// ------------------------------------------------------------ reconciliation
const recon = await (await ctx.request.get(`${BASE}/builder/review-state?reconcile=1`)).json();
ok('23. The Builder ledger reconciles',
   recon.consistent,
   `opening ${recon.openingBalance} + deltas ${recon.sumOfDeltas} = ${recon.expectedBalance}, reported ${recon.reportedBalance}, chain ${recon.chainIntact ? 'intact' : 'BROKEN'}`);

await review('reset=1');
const reconAfterReset = await (await ctx.request.get(`${BASE}/builder/review-state?reconcile=1`)).json();
ok('24. Reset restores the Builder ledger',
   reconAfterReset.consistent && reconAfterReset.reportedBalance === 1850 && reconAfterReset.entryCount === 2,
   `${reconAfterReset.reportedBalance} over ${reconAfterReset.entryCount} entries`);

// ------------------------------------------------------------- subscription
for (const [outcome, expect] of [
  ['active', 'subscription is active'],
  ['pending', 'has not settled yet'],
  ['failed', 'No subscription was started'],
]) {
  await review(`reset=1&subscription=none&subscriptionOutcome=${outcome}`);
  const sub = await ctx.newPage();
  await sub.goto(`${BASE}/builder/subscription`, { waitUntil: 'networkidle' });
  await Promise.all([
    sub.waitForURL(/\/subscription\/payment$/, { timeout: 15000 }),
    sub.click('button:has-text("Activate a subscription")'),
  ]);
  ok(`25${outcome[0]}. Subscription outcome "${outcome}" renders its own screen`,
     (await sub.textContent('body')).includes(expect),
     `screen says "${expect}"`);
  await sub.close();
}

await review('reset=1');
const subPage = await text('/builder/subscription');
ok('26. No subscription price is shown anywhere',
   subPage.includes('Not set by the client') && subPage.includes('D-01'),
   'D-01 is open, so no figure is presented as a price');

// ------------------------------------------------------ B-15 unsaved changes
await review('reset=1');

{
  const ctx15 = await browser.newContext();
  const ed = await ctx15.newPage();
  const open = async (section = 'basics') => {
    await ed.goto(`${BASE}/builder/properties/bl-greenview/${section}`, { waitUntil: 'networkidle' });
  };
  const badge = () => ed.$('text=Unsaved changes');

  await open();
  ok('27. A freshly opened section is not marked unsaved',
     (await badge()) === null,
     'the mark reads the DOM, so an untouched form is clean');

  await ed.fill('#title', 'Greenview Residency Phase II');
  ok('28. Editing a field marks the editor unsaved',
     (await badge()) !== null,
     'the header mark appears on the first keystroke');

  // Typing a value back to what the server rendered is not a change.
  const original = await ed.$eval('#title', (el) => el.defaultValue);
  await ed.fill('#title', original);
  ok('29. Typing a value back to what was saved clears the mark',
     (await badge()) === null,
     `restored "${original}" — dirtiness is a comparison, not a "was touched" flag`);

  // --- leaving with unsaved changes: the dialog, and all three ways out ---
  await ed.fill('#title', 'Discarded title');
  await ed.click('a:has-text("Close editor")');
  await ed.waitForSelector('#unsaved-changes-dialog', { timeout: 5000 });
  ok('30. Leaving with unsaved changes opens the approved dialog instead',
     ed.url().endsWith('/basics') &&
       (await ed.textContent('#unsaved-changes-dialog')).includes('You have unsaved changes'),
     'navigation was stopped and the dialog offers save, discard and keep editing');

  await ed.click('button:has-text("Keep editing")');
  ok('31. "Keep editing" stays put and preserves what was typed',
     (await ed.$('#unsaved-changes-dialog')) === null &&
       (await ed.inputValue('#title')) === 'Discarded title' &&
       (await badge()) !== null,
     'the dialog closed, the edit survived, the mark is still up');

  await ed.click('a:has-text("Close editor")');
  await ed.waitForSelector('#unsaved-changes-dialog');
  await Promise.all([
    ed.waitForURL(/\/builder\/properties$/, { timeout: 10000 }),
    ed.click('button:has-text("Discard changes")'),
  ]);
  await open();
  ok('32. "Discard changes" leaves and does not save',
     (await ed.inputValue('#title')) === original,
     `back on the section, the title is still "${original}"`);

  // --- save and close ---
  await ed.fill('#title', 'Greenview Residency Phase II');
  await ed.click('a:has-text("Close editor")');
  await ed.waitForSelector('#unsaved-changes-dialog');
  await Promise.all([
    ed.waitForURL(/\/builder\/properties$/, { timeout: 10000 }),
    ed.click('button:has-text("Save draft and close")'),
  ]);
  ok('33. "Save draft and close" saves and lands where the Builder was going',
     (await ed.textContent('body')).includes('Greenview Residency Phase II'),
     'the listing list shows the saved title, so the save happened before the navigation');

  await open();
  ok('34. The saved value is what the editor reopens with',
     (await ed.inputValue('#title')) === 'Greenview Residency Phase II' && (await badge()) === null,
     'and the reopened section is clean');

  // --- saving in place clears the mark ---
  await ed.fill('#title', original);
  await ed.click('button:has-text("Save draft")');
  await ed.waitForSelector('text=Draft saved', { timeout: 10000 });
  ok('35. Saving in place clears the mark and settles the button label',
     (await badge()) === null,
     'the save control reads "Draft saved" and the unsaved mark is gone');

  // --- the rail, not just "Close editor" ---
  await ed.fill('#title', 'Rail interception check');
  await ed.click('a[href="/builder/enquiries"]');
  await ed.waitForSelector('#unsaved-changes-dialog', { timeout: 5000 });
  ok('36. The console rail is intercepted too, not only "Close editor"',
     ed.url().endsWith('/basics'),
     'one capture-phase listener covers every anchor, including ones added later');

  await ed.click('button:has-text("Keep editing")');
  await ed.fill('#title', 'Section rail check');
  await ed.click('a:has-text("Location")');
  await ed.waitForSelector('#unsaved-changes-dialog', { timeout: 5000 });
  ok('37. Moving between editor sections is intercepted as well',
     ed.url().endsWith('/basics'),
     'section 2 would have discarded section 1 silently');

  // Save into that move: the dialog carries where you were going.
  await Promise.all([
    ed.waitForURL(/\/location$/, { timeout: 10000 }),
    ed.click('button:has-text("Save draft and close")'),
  ]);
  await open();
  ok('38. Saving from the dialog continues to the link that was intercepted',
     (await ed.inputValue('#title')) === 'Section rail check',
     'landed on section 2 with section 1 saved');

  // --- the preview section has no form and must not be guarded ---
  await ed.goto(`${BASE}/builder/properties/bl-greenview/preview`, { waitUntil: 'networkidle' });
  const previewHasSaveControl = (await ed.$('button:has-text("Save draft")')) !== null;
  await Promise.all([
    ed.waitForURL(/\/builder\/properties$/, { timeout: 10000 }),
    ed.click('a:has-text("Close editor")'),
  ]);
  ok('39. The preview section has nothing to lose and does not interrupt',
     previewHasSaveControl === false &&
       (await ed.$('#unsaved-changes-dialog')) === null &&
       ed.url().endsWith('/builder/properties'),
     'no fields, so no save control, no guard and no dialog — leaving preview is immediate');

  // --- reload/close: the browser-level warning ---
  await open();
  await ed.fill('#title', 'Reload warning check');
  const beforeUnloadArmed = await ed.evaluate(() => {
    // A synthetic beforeunload cannot open the browser's own prompt, but it
    // does run the page's handler, and a handler that calls preventDefault is
    // exactly what makes a real browser prompt.
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
  ok('40. A reload or tab close is armed with the browser warning while unsaved',
     beforeUnloadArmed,
     'the page cancels beforeunload, which is what triggers the browser prompt; the wording is the browser\'s and cannot be set');

  await ed.click('button:has-text("Save draft")');
  await ed.waitForSelector('text=Draft saved', { timeout: 10000 });
  const armedAfterSave = await ed.evaluate(() => {
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
  ok('41. Once saved, a reload is no longer interrupted',
     armedAfterSave === false,
     'the handler is removed with the dirty state, so a clean editor does not nag');

  await review('reset=1');
  await ctx15.close();
}

// -------------------------------------------------------------- LIMITATIONS
const other = await browser.newContext();
const otherPage = await other.newPage();
await otherPage.goto(`${BASE}/builder/properties`, { waitUntil: 'networkidle' });
observed('L1. A second browser sees the same Builder account',
   (await otherPage.textContent('body')).includes('Greenview Residency'),
   'sample mode has one Builder and no sign-in. Per-account isolation is kkl-backend\'s and is NOT demonstrated.');

const editorNoJs = await browser.newContext({ javaScriptEnabled: false });
const njs = await editorNoJs.newPage();
await njs.goto(`${BASE}/builder/properties/bl-orchid/media`, { waitUntil: 'load' });
const fileInput = await njs.$('#photos');
observed('L2. Choosing a photograph uploads nothing',
   fileInput !== null && (await njs.textContent('body')).includes('Nothing is uploaded yet'),
   'media storage, scanning and retention are kkl-backend\'s. The count is a review stand-in and the screen says so.');

await njs.goto(`${BASE}/builder/properties/bl-greenview/basics`, { waitUntil: 'load' });
const njsBody = await njs.textContent('body');
observed('L3. Without JavaScript there is no unsaved-changes warning',
   njsBody.includes('Without JavaScript there is no unsaved-changes warning') &&
     (await njs.$('#unsaved-changes-dialog')) === null,
   'the mark, the dialog and the reload warning are all client behaviour. The screen says so, and every control that leaves a section is still a submit button, so moving through the editor saves on the way.');

await browser.close();

const failed = results.filter((r) => !r.pass);
const changed = observations.filter((o) => !o.reproduced);
console.log(`\n${results.length - failed.length}/${results.length} behaviour checks passed.`);
console.log(`${observations.length - changed.length}/${observations.length} known limitations reproduced as documented (reproduction is not a pass).`);
if (failed.length) { console.log('\nFailed behaviour checks:'); failed.forEach((f) => console.log(' - ' + f.name)); }
if (changed.length) { console.log('\nLimitations that no longer reproduce:'); changed.forEach((c) => console.log(' - ' + c.name)); }
if (failed.length || changed.length) process.exit(1);
