/**
 * CR07 — the confirmed selective, action-based verification policy.
 *
 * Every check here is about structure rather than wording, because the structure
 * is what the client's decision actually changed:
 *
 *   - no check for browsing or enquiring
 *   - a check where money or publication is at stake
 *   - "Not required" is its own state and is never shown as verified
 *   - registering does not put an account in a verification queue
 *   - a required check has a case reference and visible progress
 *   - routine provider processing is separate from cases needing a person
 *   - a provider failure or outage never becomes an approval
 *   - verification, account suspension and listing moderation stay separate
 *   - a staff decision needs a reason and lands in history and the audit log
 *   - the existing Seller purchase restriction is unchanged
 *
 * Run:
 *   NEXT_PUBLIC_KKL_ENV=review NEXT_PUBLIC_KKL_DATA_SOURCE=sample npx next build
 *   KKL_ENV=review KKL_DATA_SOURCE=sample npx next start -p 3811
 *   PLAYWRIGHT=/path/to/playwright/index.mjs node scripts/verify-verification-policy.mjs
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

async function review(query) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/seller/review-state?${query}`, { waitUntil: 'networkidle' });
  await page.close();
}
await review('reset=1&to=/seller');

// --------------------------------------------- the policy, action by action
const mine = await ctx.newPage();
await mine.goto(`${BASE}/seller/verification`, { waitUntil: 'networkidle' });
const mineText = await mine.textContent('body');

ok('1. Browsing and enquiring require no check',
  /Browse and search properties[\s\S]{0,400}?Not required/.test(mineText) &&
    /Enquire about a property[\s\S]{0,400}?Not required/.test(mineText),
  'both rows read Not required, per the confirmed selective policy');

ok('2. Buying a lead does require one',
  /Buy a lead[\s\S]{0,500}?(Check needed|Being checked|Needs a person|Verified|Did not pass)/.test(mineText),
  'the money action carries a check rather than reading Not required');

ok('3. "Not required" is not presented as verified',
  mineText.includes('This is not a verification and no check has been passed'),
  'the sentence beside Not required says plainly that nothing was checked');

ok('4. Registering opens no case for actions that need none',
  !/Browse and search properties[\s\S]{0,400}?Case VER-/.test(mineText),
  'no case reference appears against an action that requires nothing');

ok('5. The screen says no provider has been selected',
  mineText.includes('No verification provider has been selected') &&
    mineText.includes('no claim is made that any check meets a legal requirement'),
  'the sample service and the absence of a compliance claim are both stated');

// The rule that was an assumption is now a decision, and the screen has to say
// which kind. Three separate things: the outcome, the provenance, and the
// absence of any compliance wording.
ok('6. Requesting leads reads as needing no verification',
  /Request leads[\s\S]{0,500}?Not required/.test(mineText) &&
    mineText.includes('Submitting a lead request needs no verification'),
  'the confirmed product decision is what the row states');

ok('6b. It is attributed as a product decision, not a compliance finding',
  mineText.includes('Product decision — Project owner, 28 September 2026') &&
    mineText.includes('not a determination about what any law requires') &&
    !mineText.includes('an assumption, not a confirmed rule'),
  'the row names who decided it and what kind of decision it is; the assumption caveat is gone');

// Read from the rendered text, not `textContent('body')`: the latter includes
// the inline RSC payload, which carries a second escaped copy of every
// sentence. An earlier version of this check matched that copy and failed for
// the wrong reason.
const visible = await mine.$eval('main', (el) => el.innerText.replace(/\s+/g, ' '));
const legalMentions = (visible.match(/[^.]*\b(legal|complian\w+)\b[^.]*\./gi) ?? []).map((m) =>
  m.trim(),
);
// Every mention must be a disclaimer — something is NOT claimed, or is somebody
// else's to decide. A sentence saying a check IS compliant would not match these.
const disclaimers = legalMentions.filter(
  (m) =>
    /no claim is made/i.test(m) ||
    /decisions for the client and its compliance adviser/i.test(m) ||
    /not a determination about what any law requires/i.test(m),
);
ok('6c. Every mention of law or compliance is a disclaimer, not a claim',
  legalMentions.length > 0 && disclaimers.length === legalMentions.length,
  `${legalMentions.length} mention(s), all disclaimers: ${legalMentions
    .map((m) => m.slice(0, 60))
    .join(' | ')}`);

// The decision covers requesting leads and nothing else. Every other action
// keeps whatever it had, so this asserts the whole table rather than one row.
const stillRequired = ['Buy a lead'];
const stillNotRequired = ['Browse and search properties', 'Enquire about a property'];
ok('6d. The decision did not move any other action',
  stillRequired.every((label) =>
    new RegExp(`${label}[\\s\\S]{0,500}?(Check needed|Being checked|Needs a person|Verified|Did not pass|Expired)`).test(mineText),
  ) &&
    stillNotRequired.every((label) =>
      new RegExp(`${label}[\\s\\S]{0,400}?Not required`).test(mineText),
    ),
  'buying a lead still requires a check; browsing and enquiring still do not');

// ------------------------------------- a required check has a case and progress
const seeded = await ctx.newPage();
await seeded.goto(`${BASE}/admin/verification`, { waitUntil: 'networkidle' });
const queueText = await seeded.textContent('body');
ok('7. The Admin queue separates cases needing a person from routine processing',
  queueText.includes('Needs a person') && queueText.includes('With the service'),
  'two sections, so routine work cannot bury what needs attention');

ok('8. The queue states that an unanswerable case is not an approval',
  queueText.includes('A case that the service could not answer is') &&
    queueText.includes('an approval — it is on this queue for exactly that reason'),
  'the rule is on the staff screen in that sentence, not only in the policy document');

const caseDetail = await ctx.newPage();
await caseDetail.goto(`${BASE}/admin/verification/VER-4401`, { waitUntil: 'networkidle' });
const caseText = await caseDetail.textContent('body');
ok('9. A case shows why the check was required, and its history',
  caseText.includes('Why a check was required') && caseText.includes('History') &&
    caseText.includes('could not read the document image'),
  'the reason, the service and the event trail all render');

ok('10. The case says it came from a sample service',
  caseText.includes('This is a sample verification service'),
  'no screen implies a real provider was involved');

// ------------------------------------------ a provider outage is not a pass
await review('reset=1&provider=unavailable&to=/seller/verification');
const outage = await ctx.newPage();
await outage.goto(`${BASE}/seller/verification`, { waitUntil: 'networkidle' });
// The seeded case is already needs_review; send it again with the service down.
// Counting the history entries makes this falsifiable: a run that changed
// nothing would leave the count where it was, and a run that verified the case
// would show a Verified entry.
const eventsBefore = (await outage.textContent('body')).split('Needs a person').length;
await outage.click('button:has-text("Send to the sample verification service")');
await outage.waitForSelector('text=could not be reached', { timeout: 20000 });
const afterOutage = await outage.textContent('body');
const eventsAfter = afterOutage.split('Needs a person').length;
ok('11. A verification service that cannot be reached does not verify anything',
  !/Buy a lead[\s\S]{0,400}?Verified/.test(afterOutage) &&
    afterOutage.includes('an outage is not a pass') &&
    eventsAfter > eventsBefore,
  `the attempt added an outage entry (${eventsBefore - 1} → ${eventsAfter - 1}) and produced no pass`);

await review('provider=failed&to=/seller/verification');
const failed = await ctx.newPage();
await failed.goto(`${BASE}/seller/verification`, { waitUntil: 'networkidle' });
await failed.click('button:has-text("Send to the sample verification service")');
await failed.waitForTimeout(2500);
const afterFailed = await failed.textContent('body');
ok('12. A failed check reads as failed, not as approved',
  afterFailed.includes('Did not pass') && afterFailed.includes('Nothing was approved'),
  'a completed-and-not-passed check is its own outcome');

// -------------------------------- the failed case still blocks the action
ok('13. A failed check does not clear the action it gates',
  !/Buy a lead[\s\S]{0,400}?Verified/.test(afterFailed),
  'only a passed check clears the action');

// --------------------------------------------- a decision needs a reason
const decide = await ctx.newPage();
await decide.goto(`${BASE}/admin/verification/VER-4401`, { waitUntil: 'networkidle' });
await decide.selectOption('#verification-outcome', 'verified');
await decide.fill('#verification-reason', '   ');
await decide.click('button:has-text("Record decision")');
await decide.waitForSelector('text=Record why', { timeout: 20000 });
ok('14. A verification decision without a reason is refused',
  (await decide.textContent('body')).includes('Record why'),
  'the reason is mandatory on the screen where an identity is accepted or refused');

await decide.fill('#verification-reason', 'Document reviewed by hand; identity matches the account.');
await decide.click('button:has-text("Record decision")');
await decide.waitForSelector('text=Recorded', { timeout: 20000 });
const decided = await decide.textContent('body');
ok('15. The decision is recorded with its reason in the case history',
  decided.includes('Document reviewed by hand; identity matches the account.'),
  'the reason is in the history, not only in a toast');

ok('16. The confirmation states that verification is not suspension or moderation',
  decided.includes('not account status') || decided.includes('does not suspend'),
  'the three axes are kept apart in words as well as in the model');

// ------------------------------------------------------ the audit log has it
const audit = await ctx.newPage();
await audit.goto(`${BASE}/admin/audit`, { waitUntil: 'networkidle' });
const auditText = await audit.textContent('body');
ok('17. The decision is in the append-only audit log',
  auditText.includes('Verification case decided') &&
    auditText.includes('Document reviewed by hand; identity matches the account.'),
  'who decided, on what, why, and what changed');

// ------------------------- the existing purchase restriction is untouched
await review('reset=1&kyc=pending&to=/seller');
const gate = await ctx.newPage();
const leadsPage = await ctx.newPage();
await leadsPage.goto(`${BASE}/seller/leads`, { waitUntil: 'networkidle' });
const leadHref = await leadsPage.$eval('a[href^="/seller/leads/"]', (el) => el.getAttribute('href'));
const gatedLead = leadHref.split('/seller/leads/')[1].split('?')[0];
await gate.goto(`${BASE}/seller/leads/${gatedLead}/buy`, { waitUntil: 'networkidle' });
const gateText = await gate.textContent('body');
ok('18. The existing purchase restriction still applies to an unverified account',
  /verif/i.test(gateText) && !(await gate.$('button:has-text("Confirm and buy")')),
  'CR07 removed no gate: an unverified account still cannot buy');

// -------------------------------- suspension is not a verification decision
// Compared rather than asserted by wording: the outcome chip on every row must
// read the same before and after the account is suspended. If suspension leaked
// into the verification model, one of them would move.
async function outcomeChips() {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/seller/verification`, { waitUntil: 'networkidle' });
  const chips = await page.$$eval('li', (items) =>
    items
      .map((li) => {
        const action = li.querySelector('p.t-label')?.textContent?.trim();
        const chip = li.querySelector('span[class*="chip"], span.inline-flex')?.textContent?.trim();
        return action && chip ? `${action}=${chip}` : null;
      })
      .filter((v) => v !== null),
  );
  await page.close();
  return chips.join(' | ');
}

await review('reset=1&kyc=approved&account=active&to=/seller');
const chipsActive = await outcomeChips();
await review('account=suspended&to=/seller');
const chipsSuspended = await outcomeChips();
ok('19. Suspending an account does not change any verification outcome',
  chipsActive === chipsSuspended && chipsActive.length > 0,
  `the same outcomes before and after suspension: ${chipsActive || '(none captured)'}`);

await browser.close();

const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} checks passed.`);
if (passed !== results.length) {
  console.log('FAILED:');
  for (const r of results.filter((x) => !x.pass)) console.log(`  - ${r.name}`);
  process.exit(1);
}
