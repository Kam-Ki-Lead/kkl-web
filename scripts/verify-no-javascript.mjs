/**
 * Forms without JavaScript.
 *
 * Every form in this application posts to a Server Action, which Next
 * progressively enhances — but only when the action passed to `useActionState`
 * is the server action itself. Wrapping two actions in a client closure looks
 * equivalent and is not: the closure only exists after hydration, so the form
 * has no action at all before then. That defect shipped once in the Buyer OTP
 * form and was found by a check like this one.
 *
 * Run with a production build serving on BASE_URL:
 *   PLAYWRIGHT=/path/to/playwright/index.mjs node scripts/verify-no-javascript.mjs
 */
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3811';
const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}\n      ${detail}`);
};

const browser = await chromium.launch();
/** javaScriptEnabled: false is the whole point — nothing here may rely on hydration. */
const ctx = await browser.newContext({ javaScriptEnabled: false });

async function reset() {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/seller/review-state?reset=1`, { waitUntil: 'load' });
  await page.close();
}

/** Submits a form by clicking a named button and waiting for the navigation. */
async function submit(page, buttonText) {
  await Promise.all([
    page.waitForLoadState('load'),
    page.click(`button:has-text("${buttonText}")`),
  ]);
}

await reset();

// ------------------------------------------------------ S-01 registration
const reg = await ctx.newPage();
await reg.goto(`${BASE}/seller/register`, { waitUntil: 'load' });
await reg.fill('#reg-mobile', '98');
await reg.fill('#reg-agency', 'X');
await submit(reg, 'Send OTP');
const regErrors = await reg.textContent('body');
ok('1. S-01 validates without JavaScript',
   regErrors.includes('10-digit Indian mobile number') && regErrors.includes('Enter your agency name'),
   'both field errors rendered from a full page post');

await reg.fill('#reg-mobile', '9830055555');
await reg.fill('#reg-agency', 'No-JS Brokers');
await submit(reg, 'Send OTP');
const atCode = await reg.$('#reg-code');
ok('2. S-01 advances to the code step without JavaScript',
   atCode !== null && (await reg.textContent('body')).includes('9830055555'),
   'the entered number survived the step change');

await reg.fill('#reg-code', '000000');
await submit(reg, 'Verify and continue');
ok('3. S-01 rejects the invalid sample code without JavaScript',
   (await reg.textContent('body')).includes('That code is not correct'),
   'the rejected-code state is reachable with scripting off');

await reg.fill('#reg-code', '123456');
await submit(reg, 'Verify and continue');
ok('4. S-01 completes to S-02 without JavaScript',
   reg.url().includes('/seller/onboarding'),
   `landed on ${reg.url().replace(BASE, '')}`);

// --------------------------------------------------- S-02 business details
await reg.fill('#agencyName', '');
await submit(reg, 'Continue to KYC');
ok('5. S-02 validates without JavaScript',
   (await reg.textContent('body')).includes('Enter the name that should appear on invoices'),
   'server-side validation, server-rendered error');

await reg.fill('#agencyName', 'No-JS Brokers');
await reg.fill('#gstin', 'NOT-A-GSTIN');
await submit(reg, 'Continue to KYC');
ok('6. S-02 checks the GSTIN format without JavaScript',
   (await reg.textContent('body')).includes('not a valid 15-character GSTIN'),
   'optional field, still format-checked');

await reg.fill('#gstin', '');
await submit(reg, 'Continue to KYC');
ok('7. S-02 saves without JavaScript',
   (await reg.textContent('body')).includes('Business details saved'),
   'the saved state renders from a full page post');

// ------------------------------------------------------------- S-03 KYC
const kyc = await ctx.newPage();
await kyc.goto(`${BASE}/seller/kyc`, { waitUntil: 'load' });
await kyc.fill('#panNumber', 'BADPAN');
await submit(kyc, 'Submit for verification');
const kycBody = await kyc.textContent('body');
ok('8. S-03 validates the PAN and both documents without JavaScript',
   kycBody.includes('five letters, four digits and a letter') &&
     kycBody.includes('Choose a photo or scan of the PAN card') &&
     kycBody.includes('Choose both sides of the Aadhaar'),
   'all three errors rendered together');

// ------------------------------------------------------- S-23 new ticket
const ticket = await ctx.newPage();
await ticket.goto(`${BASE}/seller/support/new`, { waitUntil: 'load' });
await ticket.fill('#subject', 'no');
await ticket.fill('#body', 'short');
await submit(ticket, 'Submit ticket');
const ticketBody = await ticket.textContent('body');
ok('9. S-23 validates without JavaScript',
   ticketBody.includes('Give the ticket a subject') && ticketBody.includes('Describe what happened'),
   'both errors, with the typed values preserved');

await ticket.fill('#subject', 'Raised with scripting disabled');
await ticket.fill('#body', 'This ticket was created by a form post with JavaScript switched off.');
await submit(ticket, 'Submit ticket');
ok('10. S-23 creates a ticket without JavaScript',
   /\/seller\/support\/T-\d+/.test(ticket.url()),
   `redirected to ${ticket.url().replace(BASE, '')}`);

// ----------------------------------------------------------- S-24 replies
await ticket.fill('#reply-body', 'A reply posted without JavaScript.');
await submit(ticket, 'Send reply');
ok('11. S-24 replies without JavaScript',
   (await ticket.textContent('body')).includes('A reply posted without JavaScript'),
   'the reply appears in the thread');

await submit(ticket, 'Mark as resolved');
ok('12. S-24 resolves without JavaScript',
   (await ticket.textContent('body')).includes('This ticket is resolved'),
   'the resolve control is its own form, so it posts independently');

// -------------------------------------------------------- S-15 recharge
const rc = await ctx.newPage();
await rc.goto(`${BASE}/seller/billing/recharge`, { waitUntil: 'load' });
await rc.fill('#recharge-amount', '5');
await submit(rc, 'Continue to payment');
ok('13. S-15 validates the amount without JavaScript',
   (await rc.textContent('body')).includes('smallest recharge'),
   'the minimum is enforced server-side');

await rc.fill('#recharge-amount', '2000');
await submit(rc, 'Continue to payment');
ok('14. S-15 reaches the payment result without JavaScript',
   rc.url().includes('/seller/billing/payment') &&
     (await rc.textContent('body')).includes('Credits added'),
   'the pack buttons need JavaScript; the amount field does not, and it is the one that submits');

// ---------------------------------------------------------- S-09 purchase
const buy = await ctx.newPage();
await buy.goto(`${BASE}/seller/leads/L-4471/buy`, { waitUntil: 'load' });
await submit(buy, 'Confirm and buy');
ok('15. S-09 completes a purchase without JavaScript',
   buy.url().includes('/result') && (await buy.textContent('body')).includes('Lead purchased'),
   'the idempotency key is a hidden field, so it travels with a plain form post');

// ------------------------------------------------- S-07 marketplace filters
const market = await ctx.newPage();
await market.goto(`${BASE}/seller/leads`, { waitUntil: 'load' });
const applyVisible = await market.$('button:has-text("Apply filters")');
ok('16. S-07 filters expose a submit control without JavaScript',
   applyVisible !== null,
   'the Apply button is server-rendered and only hidden once the change handler is live');

await market.selectOption('#lead-area', 'Rajarhat');
await submit(market, 'Apply filters');
ok('17. S-07 filtering works without JavaScript',
   market.url().includes('area=Rajarhat'),
   `filter state went to the URL: ${market.url().replace(BASE, '')}`);

// ----------------------------------------------------------- S-21 billing
const billing = await ctx.newPage();
await billing.goto(`${BASE}/seller/billing/details`, { waitUntil: 'load' });
await billing.fill('#billingName', '');
await submit(billing, 'Save billing details');
ok('18. S-21 validates without JavaScript',
   (await billing.textContent('body')).includes('Enter the name to bill'),
   'server-side validation');

await billing.fill('#billingName', 'No-JS Brokers');
await submit(billing, 'Save billing details');
ok('19. S-21 saves without JavaScript',
   (await billing.textContent('body')).includes('Billing details saved'),
   'confirmation rendered from a full page post');

// ----------------------------------------------------------- S-25 profile
const profile = await ctx.newPage();
await profile.goto(`${BASE}/seller/profile`, { waitUntil: 'load' });
await profile.fill('#contactName', '');
await submit(profile, 'Save changes');
ok('20. S-25 validates without JavaScript',
   (await profile.textContent('body')).includes('Enter the name support should use'),
   'server-side validation');

await profile.fill('#contactName', 'No JS Reviewer');
await submit(profile, 'Save changes');
ok('21. S-25 saves without JavaScript',
   (await profile.textContent('body')).includes('Your details were saved'),
   'confirmation rendered from a full page post');

await reset();
await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} forms work with JavaScript disabled.`);
if (failed.length) {
  console.log('Failed:');
  failed.forEach((f) => console.log(' - ' + f.name));
  process.exit(1);
}
