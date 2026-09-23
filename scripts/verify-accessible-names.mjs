/**
 * What a screen reader would announce, without a screen reader.
 *
 * This project recorded screen-reader behaviour as "pending — no assistive
 * technology available". That is true and remains true for *behaviour*: how
 * NVDA reads a table, where JAWS puts its virtual cursor, what VoiceOver does
 * on a rotor move. None of that can be checked here.
 *
 * What CAN be checked here is the thing those tools read FROM: the platform
 * accessibility tree, which Chromium exposes through the DevTools protocol and
 * Playwright surfaces as `page.accessibility.snapshot()`. If a control has no
 * accessible name, every screen reader announces nothing useful, and that is a
 * defect findable without one.
 *
 * So this closes the part that is mechanical — names, roles, landmark
 * structure, WCAG 2.5.3 Label in Name — and leaves the part that genuinely
 * needs a person with a screen reader clearly marked as still open.
 *
 * Run: BASE_URL=… PLAYWRIGHT=… node scripts/verify-accessible-names.mjs
 */
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3811';

const SCREENS = [
  ['P-01 homepage', '/'],
  ['P-04 enquiry form', '/property/greenview-residency/enquiry'],
  ['S-03 KYC submission', '/seller/kyc'],
  ['S-15 recharge', '/seller/billing/recharge'],
  ['B-08 listing editor', '/builder/properties/bl-greenview/basics'],
  ['A-19 credit adjustment', '/admin/wallets/U-10442/adjust'],
];

let failures = 0;
const ok = (name, pass, detail) => {
  if (!pass) failures += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
  if (detail) console.log(`      ${detail}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();

function flatten(node, out = []) {
  if (!node) return out;
  out.push(node);
  for (const child of node.children ?? []) flatten(child, out);
  return out;
}

for (const [label, path] of SCREENS) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 40000 });
  const tree = await page.accessibility.snapshot({ interestingOnly: true });
  const nodes = flatten(tree);

  // 1. Every interactive node in the tree has a name to announce.
  const INTERACTIVE = new Set(['button', 'link', 'textbox', 'combobox', 'checkbox', 'radio', 'menuitem', 'switch', 'slider', 'searchbox']);
  const nameless = nodes
    .filter((n) => INTERACTIVE.has(n.role) && !(n.name && n.name.trim()))
    .map((n) => n.role);
  ok(`${label} — every interactive node has an accessible name`,
     nameless.length === 0,
     nameless.length ? `${nameless.length} nameless: ${[...new Set(nameless)].join(', ')}` : `${nodes.filter((n) => INTERACTIVE.has(n.role)).length} interactive nodes, all named`);

  // 2. WCAG 2.5.3 Label in Name — a voice-control user says what they SEE, so
  //    the visible label has to be inside the accessible name. This is the
  //    mechanical half of the voice-control check.
  const mismatched = await page.evaluate(() => {
    // The visible LABEL, not the visible content. Two things have to come out
    // of it, and the first version of this check got both wrong:
    //
    //  - aria-hidden descendants are not visible to anyone as a label. The
    //    wordmark's decorative "K" tile is aria-hidden, so the label is
    //    "Kam Ki Lead", not "K Kam Ki Lead".
    //  - 2.5.3 is about components labelled BY TEXT. A control whose visible
    //    content is an icon glyph ("☰") has no text label, so there is
    //    nothing for the accessible name to contain.
    const visibleLabel = (el) => {
      const clone = el.cloneNode(true);
      for (const hidden of clone.querySelectorAll('[aria-hidden="true"]')) hidden.remove();
      // textContent runs adjacent inline elements together: the wordmark is
      // <span>Kam Ki</span><span>Lead</span> separated by a CSS gap, and reads
      // as "Kam KiLead" unless the boundary is respected. A voice-control user
      // sees "Kam Ki Lead".
      for (const child of clone.querySelectorAll('*')) child.append(' ');
      return (clone.textContent || el.value || '').trim().replace(/\s+/g, ' ');
    };
    const hasWords = (s) => /[\p{Letter}\p{Number}]/u.test(s);

    const out = [];
    for (const el of document.querySelectorAll('button, a[href], input[type=submit], input[type=button]')) {
      const visible = visibleLabel(el);
      if (!visible || visible.length > 40 || !hasWords(visible)) continue;
      const name = (el.getAttribute('aria-label') || '').trim();
      if (!name) continue; // no override, so the visible text IS the name
      if (!name.toLowerCase().includes(visible.toLowerCase())) {
        out.push(`"${visible}" announced as "${name}"`);
      }
    }
    return out;
  });
  ok(`${label} — visible labels appear in their accessible names (2.5.3)`,
     mismatched.length === 0,
     mismatched.length ? mismatched.slice(0, 3).join('; ') : 'no aria-label hides the visible text of a control');

  // 3. Landmark structure: a screen-reader user navigates by landmarks first.
  const landmarks = await page.evaluate(() => ({
    main: document.querySelectorAll('main').length,
    nav: [...document.querySelectorAll('nav')].map((n) => n.getAttribute('aria-label') || '(unlabelled)'),
    h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim().slice(0, 30)),
  }));
  ok(`${label} — one main landmark and exactly one h1`,
     landmarks.main === 1 && landmarks.h1.length === 1,
     `main=${landmarks.main}, h1=${landmarks.h1.length} ("${landmarks.h1[0] ?? ''}"), nav=[${landmarks.nav.join(', ')}]`);

  // 4. Every nav landmark is distinguishable by name where there is more than
  //    one, or a screen reader offers "navigation, navigation, navigation".
  const unlabelledNavs = landmarks.nav.filter((n) => n === '(unlabelled)');
  ok(`${label} — navigation landmarks are named`,
     landmarks.nav.length <= 1 || unlabelledNavs.length === 0,
     `${landmarks.nav.length} nav landmark(s); ${unlabelledNavs.length} unlabelled`);
}

await browser.close();
console.log(`\n${failures === 0 ? 'All' : `${failures} failing`} accessibility-tree checks across ${SCREENS.length} screens.`);
console.log('\nSTILL PENDING, and not addressed by this file: how NVDA, JAWS and VoiceOver');
console.log('actually behave — reading order in tables, virtual-cursor placement after a');
console.log('dialog closes, rotor navigation. That needs a person and the software.');
process.exit(failures ? 1 : 0);
