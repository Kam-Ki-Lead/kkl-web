/**
 * Keyboard navigation, dialog focus and validation announcements.
 *
 * WHAT THIS COVERS, AND WHERE
 * ---------------------------
 * C-11 left these outstanding and every pass since has carried them forward.
 * They are driveable, so they are driven — on a screen from each console
 * rather than on one shared component, because "the Field component is
 * labelled" says nothing about a screen that forgot to use it.
 *
 * WHAT IT DOES NOT COVER
 * ----------------------
 * **No screen reader is exercised.** None is installed in this environment and
 * none can be, so the announcements checked here are the *markup that would
 * produce them* — roles, live regions, `aria-describedby` wiring — not what a
 * user of NVDA, JAWS or VoiceOver would actually hear. That distinction is the
 * whole difference between "the page says the right things" and "the page is
 * usable without sight", and only the first is claimed.
 *
 * Zoom is checked separately by `verify-zoom.mjs`.
 *
 * Run:  PLAYWRIGHT=… BASE_URL=… node scripts/verify-accessibility.mjs
 */
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3811';
const results = [];
const pending = [];

const ok = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
  if (detail) console.log(`      ${detail}`);
};
const notRun = (name, why) => {
  pending.push({ name, why });
  console.log(`PEND  ${name}`);
  console.log(`      ${why}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext();

async function open(path, width = 1440) {
  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 } });
  const page = await context.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  return { page, context };
}

// ------------------------------------------------- labelled controls, per screen
//
// One screen from each console. A shared component being right does not make a
// screen right: a page can hand-roll an input, or label one control and not the
// next.
for (const path of [
  '/property/greenview-residency/enquiry',
  '/seller/billing/details',
  '/builder/properties/bl-greenview/basics',
  '/admin/wallets/U-10442/adjust',
  '/admin/support/T-2291',
]) {
  const { page, context } = await open(path);
  const unlabelled = await page.$$eval(
    'input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea',
    (els) =>
      els
        .filter((el) => {
          if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) return false;
          const id = el.getAttribute('id');
          if (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) return false;
          return !el.closest('label');
        })
        .map((el) => el.name || el.id || el.tagName),
  );
  ok(`Every control is labelled · ${path}`, unlabelled.length === 0,
     unlabelled.length === 0 ? 'checked on this screen, not inferred from the component' : `unlabelled: ${unlabelled.join(', ')}`);
  await context.close();
}

// ------------------------------------------------------------- heading order
for (const path of ['/', '/seller', '/builder', '/admin', '/admin/kyc/K-3318']) {
  const { page, context } = await open(path);
  const levels = await page.$$eval('h1,h2,h3,h4', (els) => els.map((e) => Number(e.tagName[1])));
  const h1s = levels.filter((l) => l === 1).length;
  let skips = 0;
  for (let i = 1; i < levels.length; i += 1) {
    if (levels[i] > levels[i - 1] + 1) skips += 1;
  }
  ok(`One h1 and no skipped level · ${path}`, h1s === 1 && skips === 0,
     `h1 count ${h1s}, skipped levels ${skips}`);
  await context.close();
}

// ------------------------------------------------------- keyboard: reachability
{
  const { page, context } = await open('/seller/billing/recharge');
  await page.keyboard.press('Tab');
  const reached = [];
  for (let i = 0; i < 25; i += 1) {
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      return { tag: el.tagName, id: el.id, text: (el.textContent ?? '').trim().slice(0, 24) };
    });
    if (info) reached.push(info);
    await page.keyboard.press('Tab');
  }
  const hitTheAmount = reached.some((r) => r.id === 'recharge-amount');
  const hitSubmit = reached.some((r) => r.tag === 'BUTTON' && /continue/i.test(r.text));
  // Derived, not asserted. A detail string that describes what the check
  // hoped for rather than what it found is how a failure reads like a pass.
  ok('Tab reaches the amount field and the submit on S-15', hitTheAmount && hitSubmit,
     `${reached.length} stops; #recharge-amount ${hitTheAmount ? 'reached' : 'NOT reached'}, ` +
     `submit ${hitSubmit ? 'reached' : 'NOT reached'}`);
  await context.close();
}

// ------------------------------------------------- keyboard: no positive tabindex
{
  const { page, context } = await open('/admin');
  const positive = await page.$$eval('[tabindex]', (els) =>
    els.map((e) => Number(e.getAttribute('tabindex'))).filter((n) => n > 0));
  ok('No positive tabindex overrides document order', positive.length === 0,
     'a positive tabindex jumps the queue and breaks the order the layout implies');
  await context.close();
}

// -------------------------------------------------------- dialog: focus and Escape
//
// B-15's exit dialog is the only dialog in the application, so it is checked
// directly rather than through a component.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/builder/review-state?reset=1`, { waitUntil: 'load' });
  await page.goto(`${BASE}/builder/properties/bl-greenview/basics`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.fill('#title', 'Dialog focus check');
  await page.click('a:has-text("Close editor")');
  await page.waitForSelector('#unsaved-changes-dialog', { timeout: 8000 });

  const inDialog = await page.evaluate(() =>
    document.getElementById('unsaved-changes-dialog')?.contains(document.activeElement) ?? false);
  ok('Focus moves into the dialog when it opens', inDialog,
     'otherwise a keyboard user is left behind the thing that just appeared');

  const attrs = await page.$eval('#unsaved-changes-dialog', (el) => ({
    role: el.getAttribute('role'),
    modal: el.getAttribute('aria-modal'),
    labelledby: el.getAttribute('aria-labelledby'),
    describedby: el.getAttribute('aria-describedby'),
    labelText: document.getElementById(el.getAttribute('aria-labelledby') ?? '')?.textContent?.trim(),
  }));
  ok('The dialog is named and described',
     attrs.role === 'dialog' && attrs.modal === 'true' && Boolean(attrs.labelText),
     `role=${attrs.role} aria-modal=${attrs.modal} labelled by "${attrs.labelText}"`);

  // Tab must cycle within the dialog rather than escaping behind it.
  const seen = new Set();
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press('Tab');
    const where = await page.evaluate(() => {
      const dialog = document.getElementById('unsaved-changes-dialog');
      return {
        inside: dialog?.contains(document.activeElement) ?? false,
        label: (document.activeElement?.textContent ?? '').trim().slice(0, 20),
      };
    });
    seen.add(where.label);
    if (!where.inside) break;
  }
  const trapped = await page.evaluate(() =>
    document.getElementById('unsaved-changes-dialog')?.contains(document.activeElement) ?? false);
  ok('Tab is trapped inside the dialog', trapped, `cycled through ${seen.size} controls without escaping`);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const closed = (await page.$('#unsaved-changes-dialog')) === null;
  const valueKept = await page.inputValue('#title');
  ok('Escape dismisses the dialog and keeps the edit',
     closed && valueKept === 'Dialog focus check',
     'Escape means "keep editing", not "discard"');
  await context.close();
}

// ------------------------------------------- validation: announced, not just red
//
// An error that only changes a colour is invisible to a screen reader and to
// anyone who cannot distinguish the colour.
for (const [path, submit, errorSelector] of [
  ['/admin/users/U-10442?action=suspend', 'button:has-text("Suspend account")', '#reason-error'],
  ['/admin/wallets/U-10442/adjust', 'button:has-text("Record this adjustment")', '#adjust-error'],
]) {
  const { page, context } = await open(path);
  await page.click(submit);
  await page.waitForSelector(errorSelector, { timeout: 8000 });
  const info = await page.$eval(errorSelector, (el) => ({
    role: el.getAttribute('role'),
    text: (el.textContent ?? '').trim(),
  }));
  ok(`A refused submit announces why · ${path.split('?')[0]}`,
     info.role === 'alert' && info.text.length > 20,
     `role=${info.role}, "${info.text.slice(0, 54)}…"`);
  await context.close();
}

// ------------------------------------------------ validation: field association
{
  const { page, context } = await open('/property/greenview-residency/enquiry');
  await page.click('form button[type=submit]');
  await page.waitForTimeout(900);
  const wired = await page.$$eval('input[aria-invalid="true"]', (els) =>
    els.map((el) => {
      const described = (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
      return described.some((id) => document.getElementById(id));
    }));
  ok('An invalid field points at its own message',
     wired.length > 0 && wired.every(Boolean),
     `${wired.length} invalid field(s), each with a resolvable aria-describedby`);
  await context.close();
}

// ---------------------------------------------------- mobile drawer, per console
for (const path of ['/seller', '/builder', '/admin']) {
  const { page, context } = await open(path, 390);
  const toggle = await page.$('button[aria-controls="console-drawer"]');
  const before = await toggle.getAttribute('aria-expanded');
  await toggle.click();
  await page.waitForTimeout(400);
  const after = await toggle.getAttribute('aria-expanded');
  const focusInside = await page.evaluate(() => {
    const drawer = document.getElementById('console-drawer');
    return drawer ? drawer.contains(document.activeElement) || drawer.offsetHeight > 0 : false;
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const closed = await toggle.getAttribute('aria-expanded');
  ok(`Mobile drawer opens, reports state and closes on Escape · ${path}`,
     before === 'false' && after === 'true' && focusInside && closed === 'false',
     `aria-expanded ${before} → ${after} → ${closed}`);
  await context.close();
}

// ------------------------------------------------------------------- PENDING
notRun('Screen-reader behaviour (NVDA, JAWS, VoiceOver)',
  'No screen reader is installed in this environment and none can be. What is checked above is the MARKUP that would produce announcements — roles, live regions, describedby wiring — not what a user would hear. This is the gap between "says the right things" and "is usable without sight", and only the first is claimed.');
notRun('Windows High Contrast / forced-colors',
  'Needs a Windows host. The application sets explicit background and border colours, which is the usual source of forced-colors failures, so this is a real risk rather than a formality.');
notRun('Voice control (Dragon, Voice Access)',
  'Needs the tooling. Visible labels match accessible names throughout, which is the main requirement, but that has not been exercised.');

await ctx.close();
await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} accessibility checks passed.`);
console.log(`${pending.length} checks are PENDING — tooling or platform unavailable here, not passed and not failed.`);
if (failed.length) {
  console.log('\nFailed:');
  failed.forEach((f) => console.log(` - ${f.name}: ${f.detail}`));
  process.exit(1);
}
