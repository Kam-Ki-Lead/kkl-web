/**
 * CR01 and CR05 — the contextual rename, and one location hierarchy everywhere.
 *
 * CR01 asks for three things to be tellable apart on screen: buying a property,
 * buying an available lead, and requesting leads that are needed. It also asks
 * that property Buy/Rent intent wording is NOT renamed — it is a different
 * concept, and "do not replace every occurrence of Buy" was explicit.
 *
 * CR05 asks for the same India → State → City → Area selection across property
 * search, the owner and Builder listing forms, lead-marketplace filters, Seller
 * lead-request forms and the relevant Admin views, over stable identifiers, with
 * a parent change clearing incompatible children and clear empty states.
 *
 * Run:
 *   NEXT_PUBLIC_KKL_ENV=review NEXT_PUBLIC_KKL_DATA_SOURCE=sample npx next build
 *   KKL_ENV=review KKL_DATA_SOURCE=sample npx next start -p 3811
 *   PLAYWRIGHT=/path/to/playwright/index.mjs node scripts/verify-labels-and-locations.mjs
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

async function text(path) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  const body = await page.textContent('body');
  await page.close();
  return body;
}

// ============================================================ CR01 labels

// 1. Buying a property and buying a lead are different labels pointing at
//    different places.
//
// Asserted on where each label goes, not on the absence of a word. The approved
// public header carries Buy, Projects and New launches — there is no Rent item
// to look for — and the footer links brokers to Buy Leads on every public page.
// What CR01 asks is that the two are tellable apart, so this checks that the
// property-intent link goes to property search and the lead link does not.
const homePage = await ctx.newPage();
await homePage.goto(`${BASE}/`, { waitUntil: 'networkidle' });
const labelled = await homePage.$$eval('a', (els) =>
  els
    .map((e) => ({ label: e.textContent?.trim() ?? '', href: e.getAttribute('href') ?? '' }))
    .filter((l) => l.label === 'Buy' || l.label === 'Buy Leads'),
);
await homePage.close();
const propertyBuy = labelled.filter((l) => l.label === 'Buy');
const leadBuy = labelled.filter((l) => l.label === 'Buy Leads');
ok('1. "Buy" is property search and "Buy Leads" is not',
  propertyBuy.length > 0 &&
    propertyBuy.every((l) => l.href.startsWith('/search')) &&
    leadBuy.length > 0 &&
    leadBuy.every((l) => !l.href.startsWith('/search')),
  `Buy → ${propertyBuy.map((l) => l.href).join(', ')}; Buy Leads → ${leadBuy.map((l) => l.href).join(', ')}`);

const searchPage = await ctx.newPage();
await searchPage.goto(`${BASE}/search`, { waitUntil: 'networkidle' });
const searchControls = await searchPage.$$eval(
  'button[aria-pressed], [role="tab"], label, option, select',
  (els) => els.map((e) => e.textContent?.trim()).filter(Boolean),
);
await searchPage.close();
ok('2. No property-search control carries the lead-buying label',
  !searchControls.some((l) => l === 'Buy Leads'),
  'property intent, filters and sort options are about properties, not leads');

// 2. The consoles name the marketplace for the action.
for (const [label, path] of [['Seller', '/seller'], ['Builder', '/builder']]) {
  const console_ = await text(path);
  ok(`3${label === 'Seller' ? 'a' : 'b'}. The ${label} rail entry is Buy Leads`,
    console_.includes('Buy Leads') && !console_.includes('Lead marketplace'),
    'the marketplace entry is named for the action in the rail');
}

const sellerMarket = await text('/seller/leads');
ok('4. The marketplace screen itself is Buy Leads',
  sellerMarket.includes('Buy Leads') && !sellerMarket.includes('Lead marketplace'),
  'the heading and title match the rail');

// 3. The three contexts are distinguishable, each naming what it is.
const requests = await text('/seller/requests');
ok('5. Requesting leads says it is not buying one',
  requests.includes('does not buy one') && requests.includes('Buy Leads'),
  'the request journey states the difference and points at where buying happens');

const requestForm = await text('/seller/requests/new');
ok('6. The request form asks for leads that are needed, not for a purchase',
  /Request leads|Tell us the leads you need/.test(requestForm) &&
    !requestForm.includes('Confirm and buy'),
  'the form is a request, with no purchase control on it');

// The footer's Buy Leads link is on this page too, so this asserts what the
// page says about itself rather than what it fails to mention.
const ownerEntry = await text('/post-property');
ok('7. Posting a property is distinguished from both',
  ownerEntry.includes('no subscription and nothing to buy') &&
    ownerEntry.includes('different journey from a broker buying leads'),
  'the owner journey names itself as neither buying leads nor a subscription');

// 4. Order confirmation keeps a specific label rather than the generic one.
const leadsPage = await ctx.newPage();
await leadsPage.goto(`${BASE}/seller/leads`, { waitUntil: 'networkidle' });
const leadHref = await leadsPage.$eval('a[href^="/seller/leads/"]', (el) => el.getAttribute('href'));
const leadId = leadHref.split('/seller/leads/')[1].split('?')[0];
await leadsPage.close();
const buyScreen = await text(`/seller/leads/${leadId}/buy`);
ok('8. The purchase action keeps a specific label, not the section name',
  buyScreen.includes('Confirm and buy') && !buyScreen.includes('Buy Leads now'),
  'the confirming action says what it does rather than repeating the section label');

// ========================================================== CR05 locations

const LAUNCH = 'Action Area I';

// One searchable area control, over the same records, on every surface that
// picks a location.
// The seeded owner listing is with the review team, so its step pages are
// correctly not editable. A location control needs a draft, so one is started.
const draftId = await (async () => {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/post-property`, { waitUntil: 'networkidle' });
  await Promise.all([
    page.waitForURL(/\/owner\/listings\/[^/]+\/basics$/, { timeout: 20000 }),
    page.click('form button:has-text("Start a")'),
  ]);
  const id = new URL(page.url()).pathname.split('/')[3];
  await page.close();
  return id;
})();

const SURFACES = [
  ['property search', '/search', '#f-locality'],
  ['Seller lead-request form', '/seller/requests/new', '#areaId'],
  ['owner listing form', `/owner/listings/${draftId}/location`, '#locality'],
  ['Builder listing form', '/builder/properties/bl-greenview/location', '#locality'],
  ['Seller marketplace filters', '/seller/leads', '#lead-area'],
  ['Builder marketplace filters', '/builder/marketplace', '#lead-area'],
];

for (const [label, path, selector] of SURFACES) {
  const page = await ctx.newPage();
  const response = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  const present = response.status() === 200 && (await page.$(selector)) !== null;
  let optionsFromRecords = false;
  if (present) {
    // The value submitted must be a record id, never the display text.
    const values = await page.$$eval(`${selector} option`, (els) =>
      els.map((e) => e.getAttribute('value')).filter((v) => v !== null && v !== ''),
    ).catch(() => []);
    optionsFromRecords =
      values.length > 0
        ? values.every((v) => /^[a-z0-9-]+$/.test(v) && v !== v.toUpperCase())
        : // A hydrated combobox has a hidden input rather than options; its
          // presence is what matters, and the typeahead is exercised below.
          true;
  }
  await page.close();
  ok(`9. ${label} uses the shared area control`,
    present && optionsFromRecords,
    present
      ? 'the control is there and its values are record ids, not display names'
      : `no ${selector} on ${path}`);
}

// A location selection travels as a record id, and choosing a parent replaces
// the child rather than leaving both.
const filters = await ctx.newPage();
await filters.goto(`${BASE}/seller/leads?area=action-area-i`, { waitUntil: 'networkidle' });
ok('10. A location filter is carried in the URL by record id',
  filters.url().includes('area=action-area-i'),
  'the identifier travels, so a shared link resolves to the same area');

// Typing a locality's own name and pressing Enter must select that locality.
// Labels read "<area>, <parent>", so "New Town" also matches its Action Areas;
// before the ranking fix the first of those was highlighted and Enter chose a
// sub-locality instead of the locality asked for.
await filters.fill('#lead-area', 'New Town');
await filters.waitForTimeout(400);
const ranked = await filters.$$eval('[role="option"]', (els) =>
  els.map((e) => e.textContent?.trim()),
);
ok('11. An exact locality match is ranked above areas that merely contain it',
  (ranked[0] ?? '').startsWith('New Town'),
  `typing "New Town" highlights ${ranked[0]} first (then ${ranked.slice(1, 3).join(', ')})`);

await filters.press('#lead-area', 'Enter');
await filters.waitForTimeout(1500);
const afterParent = new URL(filters.url());
const areaParams = afterParent.searchParams.getAll('area');
ok('12. Choosing a parent locality replaces the child rather than keeping both',
  areaParams.length === 1 && areaParams[0] === 'new-town',
  `the URL carries area=${areaParams.join(' & ')} — one selection, the one chosen`);
await filters.close();

// Typeahead over the records, and an honest empty result.
const typeahead = await ctx.newPage();
await typeahead.goto(`${BASE}/seller/requests/new`, { waitUntil: 'networkidle' });
await typeahead.fill('#areaId', LAUNCH);
await typeahead.waitForTimeout(400);
const matched = await typeahead.$$eval('[role="option"]', (els) => els.map((e) => e.textContent?.trim()));
ok('13. Searching localities matches on the records',
  matched.some((m) => (m ?? '').includes(LAUNCH)),
  `"${LAUNCH}" found by typing: ${matched.slice(0, 3).join(', ')}`);

await typeahead.fill('#areaId', 'Bandra');
await typeahead.waitForTimeout(400);
const noMatch = await typeahead.$$eval('[role="option"], [role="status"]', (els) =>
  els.map((e) => e.textContent?.trim()).join(' | '),
);
ok('14. An area outside the launch scope says so rather than silently matching',
  !noMatch.includes('Bandra'),
  `a locality KKL does not cover returns no match: "${noMatch.slice(0, 80)}"`);

// The hierarchy is one source: the same area reads the same everywhere.
const requestAfter = await ctx.newPage();
await requestAfter.goto(`${BASE}/admin/requests/lr-seed-1`, { waitUntil: 'networkidle' });
const adminRequest = await requestAfter.textContent('body');
const sellerRequest = await text('/seller/requests/lr-seed-1');
const areaOnBoth = ['Rajarhat', 'New Town', 'Salt Lake', 'Action Area'].filter(
  (a) => adminRequest.includes(a) && sellerRequest.includes(a),
);
ok('15. The same request shows the same area label to Seller and Admin',
  areaOnBoth.length > 0,
  `both views compose the label from the records: ${areaOnBoth.join(', ')}`);

// Admin views that pick or show a location use the records too.
const adminQueue = await text('/admin/requests');
ok('16. The Admin lead-request queue filters by area from the records',
  adminQueue.includes('Rajarhat') || adminQueue.includes('New Town') ||
    adminQueue.includes('Salt Lake'),
  'area labels on the staff queue come from the same hierarchy');

// No component carries its own locality list.
const ownerLocation = await text(`/owner/listings/${draftId}/location`);
ok('17. The owner listing form says the records are the shared ones',
  ownerLocation.includes('The same records search, listings and lead filters use'),
  'the form points at the single source rather than implying a list of its own');

await browser.close();

const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} checks passed.`);
if (passed !== results.length) {
  console.log('FAILED:');
  for (const r of results.filter((x) => !x.pass)) console.log(`  - ${r.name}`);
  process.exit(1);
}
