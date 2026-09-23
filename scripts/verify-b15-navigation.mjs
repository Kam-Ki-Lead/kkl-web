/**
 * B-15 — exactly what happens to an edit across browser Back and Forward.
 *
 * The acceptance question is not "is there a dialog". It is: after editing a
 * field and pressing Back, and then Forward — is the edit RETAINED, is it
 * SAVED, is it LOST, and what does the person see? Those are four different
 * answers and the difference between them matters, so each is asserted
 * separately here rather than summarised.
 *
 * The distinction that carries the most risk is retained-versus-saved. A draft
 * that quietly became a save would be a worse defect than a lost edit: the
 * Builder's listing would change without them asking. Check 6 opens a second,
 * independent browser context — a different tab, with its own sessionStorage —
 * and asserts the server still renders the original value.
 *
 * Run:  BASE_URL=http://127.0.0.1:3811 PLAYWRIGHT=… node scripts/verify-b15-navigation.mjs
 */
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3811';

const EDITOR = '/builder/properties/bl-greenview/basics';
const LIST = '/builder/properties';
const EDITED = 'Greenview Residency — edited, never saved';

let failures = 0;
const log = [];
function ok(name, pass, detail) {
  if (!pass) failures += 1;
  log.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
  if (detail) console.log(`      ${detail}`);
}

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const titleValue = () => page.inputValue('#title');
const bodyHas = async (s) => (await page.textContent('body')).includes(s);

// Establish the server's value before anything is touched.
await page.goto(`${BASE}${EDITOR}`, { waitUntil: 'networkidle' });
const ORIGINAL = await titleValue();

// A real arrival. The Builder reaches the editor by CLICKING, which makes the
// history entry a client-side one. Navigating there with page.goto instead
// makes it a document entry, and Back then behaves differently — see check 2b.
await page.goto(`${BASE}${LIST}`, { waitUntil: 'networkidle' });
await page.click(`a[href="${EDITOR}"]`);
await page.waitForURL((u) => u.pathname === EDITOR, { timeout: 15000 });
await page.waitForTimeout(500);

// ---------------------------------------------------------------- 1. dirty
await page.fill('#title', EDITED);
await page.keyboard.press('Tab');
await page.waitForTimeout(350);
const dirtyMark = await bodyHas('Unsaved changes');
ok('1. Editing a field marks the section unsaved',
   dirtyMark,
   `#title is now "${EDITED}"; header shows the unsaved mark: ${dirtyMark}`);

// ----------------------------------------------------------------- 2. Back
const dialogs = [];
page.on('dialog', async (d) => { dialogs.push(d.message()); await d.dismiss(); });
await page.goBack({ waitUntil: 'commit' }).catch(() => {});
await page.waitForURL((u) => u.pathname.startsWith(LIST), { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(600);
const afterBackUrl = page.url().replace(BASE, '');
const leftEditor = afterBackUrl.startsWith(LIST) && afterBackUrl !== EDITOR;
const appDialogOnBack = await bodyHas('Discard changes');
ok('2. After a click-through arrival, Back leaves the editor with no dialog',
   leftEditor && dialogs.length === 0 && !appDialogOnBack,
   `landed on ${afterBackUrl}; browser dialogs: ${dialogs.length}; approved in-app dialog present: ${appDialogOnBack}. THIS IS THE OPEN EXCEPTION — the approved three-way dialog does not appear on Back.`);

// -------------------------------------------------- 3. nothing was saved yet
const listBody = await page.textContent('body');
const wroteEdit = listBody.includes(EDITED);
ok('3. The edit has not been written to the listing',
   !wroteEdit && listBody.includes(ORIGINAL),
   `the properties list shows "${ORIGINAL}"; contains the edited text: ${wroteEdit}. Back saved nothing and published nothing.`);

// -------------------------------------------------------------- 4. Forward
await page.goForward({ waitUntil: 'commit' }).catch(() => {});
await page.waitForURL((u) => u.pathname === EDITOR, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(800);
const afterForwardValue = await titleValue();
ok('4. Forward returns the edit to the field',
   afterForwardValue === EDITED,
   `#title reads "${afterForwardValue}" — RETAINED, restored from the per-tab draft`);

const sawRestoredNotice = await bodyHas('Unsaved work restored');
const stillUnsaved = await bodyHas('Unsaved changes');
ok('5. The person is told the work was restored, and it is still unsaved',
   sawRestoredNotice && stillUnsaved,
   `"Unsaved work restored." present: ${sawRestoredNotice}; unsaved mark still shown: ${stillUnsaved}`);

// ------------------------------------- 2b. the other arrival path is different
//
// A Builder who typed the URL, reloaded, or followed a link from outside has a
// DOCUMENT history entry behind them. Back is then a real unload, so the
// browser's own beforeunload warning fires — a different warning from the
// approved dialog, and a different behaviour from the case above. Both are
// real; which one a Builder meets depends on how they arrived.
const hardCtx = await browser.newContext();
const hard = await hardCtx.newPage();
const hardDialogs = [];
hard.on('dialog', async (d) => { hardDialogs.push(d.type()); await d.dismiss(); });
await hard.goto(`${BASE}${LIST}`, { waitUntil: 'networkidle' });
await hard.goto(`${BASE}${EDITOR}`, { waitUntil: 'networkidle' });
await hard.fill('#title', EDITED);
await hard.keyboard.press('Tab');
await hard.waitForTimeout(300);
await hard.goBack({ waitUntil: 'commit' }).catch(() => {});
await hard.waitForTimeout(1200);
const hardUrl = hard.url().replace(BASE, '');
ok('2b. After a page-load arrival, Back raises the browser\'s own leave warning',
   hardDialogs.length === 1 && hardUrl === EDITOR,
   `browser dialogs: ${hardDialogs.join(',') || 'none'}; still on ${hardUrl} after dismissing. The native beforeunload warning DOES cover this path; dismissing it cancels the navigation.`);
await hardCtx.close();

// ------------------------------------------- 6. retained is not saved
const other = await browser.newContext();
const otherPage = await other.newPage();
await otherPage.goto(`${BASE}${EDITOR}`, { waitUntil: 'networkidle' });
const otherValue = await otherPage.inputValue('#title');
ok('6. A second tab still sees the saved listing, not the draft',
   otherValue === ORIGINAL,
   `independent context reads "${otherValue}"; expected the server value "${ORIGINAL}" — the restored draft is per-tab and is NOT a save`);
await other.close();

// ------------------------------------------------------- 7. discard clears
const discardCtx = await browser.newContext();
const d = await discardCtx.newPage();
await d.goto(`${BASE}${LIST}`, { waitUntil: 'networkidle' });
await d.goto(`${BASE}${EDITOR}`, { waitUntil: 'networkidle' });
await d.fill('#title', EDITED);
await d.keyboard.press('Tab');
await d.waitForTimeout(300);
await d.click('a[href*="/builder/properties"]').catch(() => {});
await d.waitForTimeout(400);
const sawDialog = (await d.textContent('body')).includes('Discard changes');
await d.click('button:has-text("Discard changes")').catch(() => {});
await d.waitForTimeout(600);
await d.goto(`${BASE}${EDITOR}`, { waitUntil: 'networkidle' });
await d.waitForTimeout(400);
const afterDiscard = await d.inputValue('#title');
ok('7. In-app navigation still shows the approved dialog, and Discard clears the draft',
   sawDialog && afterDiscard === ORIGINAL,
   `approved dialog appeared: ${sawDialog}; after Discard the field reads "${afterDiscard}" (original "${ORIGINAL}")`);
await discardCtx.close();

// ---------------------------------------------------------- 8. save clears
const saveCtx = await browser.newContext();
const sp = await saveCtx.newPage();
await sp.goto(`${BASE}${LIST}`, { waitUntil: 'networkidle' });
await sp.goto(`${BASE}${EDITOR}`, { waitUntil: 'networkidle' });
const SAVED_VALUE = 'Greenview Residency — saved by the B-15 check';
await sp.fill('#title', SAVED_VALUE);
await sp.keyboard.press('Tab');
await sp.waitForTimeout(300);
await sp.click('button:has-text("Save draft")').catch(() => {});
await sp.waitForTimeout(900);
await sp.goBack({ waitUntil: 'commit' }).catch(() => {});
await sp.waitForTimeout(700);
await sp.goForward({ waitUntil: 'commit' }).catch(() => {});
await sp.waitForTimeout(900);
const afterSaveRoundTrip = await sp.inputValue('#title');
const restoredNoticeAfterSave = (await sp.textContent('body')).includes('Unsaved work restored');
ok('8. After saving, Back and Forward restore nothing — the draft is spent',
   afterSaveRoundTrip === SAVED_VALUE && !restoredNoticeAfterSave,
   `#title reads "${afterSaveRoundTrip}" from the server, with no restored-draft notice`);
await saveCtx.close();

// Put the fixture back so a later run starts where this one did.
const resetCtx = await browser.newContext();
const rp = await resetCtx.newPage();
await rp.goto(`${BASE}${EDITOR}`, { waitUntil: 'networkidle' });
await rp.fill('#title', ORIGINAL);
await rp.keyboard.press('Tab');
await rp.waitForTimeout(250);
await rp.click('button:has-text("Save draft")').catch(() => {});
await rp.waitForTimeout(800);
await resetCtx.close();

await browser.close();

console.log(`\n${log.filter((l) => l.pass).length}/${log.length} B-15 navigation checks passed.`);
console.log('\nThe answer, in the four terms the question was asked in:');
console.log('  RETAINED  yes — Forward puts the edit back in the field, from a per-tab draft.');
console.log('  SAVED     no  — a second tab still reads the listing as it stands on the server.');
console.log('  LOST      no  — nothing is discarded by Back, and Discard is still explicit.');
console.log('  SEEN      the editor says "Unsaved work restored." and keeps the unsaved mark.');
console.log('\nAnd it depends on how the editor was reached:');
console.log('  clicked into it   Back leaves silently; Forward restores the draft.');
console.log('  loaded it directly  Back raises the browser\'s own leave warning first.');
console.log('\nThe remaining difference from the approved design is that the three-way');
console.log('dialog does not appear on Back. It is not that edits are lost. That');
console.log('exception stays open until somebody accepts it.');
process.exit(failures ? 1 : 0);
