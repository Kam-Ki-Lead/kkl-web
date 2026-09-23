/**
 * Typography precedence, verified per context rather than per token.
 *
 * C-02 names one step, "Card and section title — Archivo 700 · 17px". The
 * approved SCREENS render four, and an earlier pass applied the library's
 * single label to all of them. This checks a representative use of each
 * context against the size and weight the baseline actually draws.
 *
 * Every expectation below was measured from the rendered prototype at 1440,
 * not read out of the library. Where a context could not be reached in the
 * prototype it is absent here rather than guessed.
 *
 * Run: BASE_URL=… PLAYWRIGHT=… node scripts/verify-typography.mjs
 */
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3811';

const CASES = [
  { context: 'page title', path: '/property/greenview-residency', text: 'Greenview Residency', size: 34, weight: '800', style: '.t-title' },
  { context: 'public section heading', path: '/', text: 'Featured properties', size: 26, weight: '700', style: '.t-section-title' },
  { context: 'public section heading', path: '/', text: 'Browse by locality', size: 26, weight: '700', style: '.t-section-title' },
  // Scoped to the header: "Dashboard" and "My properties" are also rail
  // links, and an unscoped search finds the rail's 15px copy first.
  { context: 'console header title', path: '/seller', text: 'Dashboard', size: 22, weight: '700', style: '.t-console-title', within: 'header' },
  { context: 'console header title', path: '/builder/properties', text: 'My properties', size: 22, weight: '700', style: '.t-console-title', within: 'header' },
  { context: 'console header title', path: '/admin', text: 'Operations dashboard', size: 22, weight: '700', style: '.t-console-title', within: 'header' },
  { context: 'console panel heading', path: '/seller', text: 'New leads matching your areas', size: 18, weight: '700', style: '.t-panel-title' },
  { context: 'console panel heading', path: '/builder', text: 'Recent enquiries on your listings', size: 18, weight: '700', style: '.t-panel-title' },
  { context: 'console panel heading', path: '/admin', text: 'Needs attention', size: 18, weight: '700', style: '.t-panel-title' },
  { context: 'listing card title', path: '/', text: 'Greenview Residency', size: 18, weight: '700', style: '.t-panel-title' },
  { context: 'card title', path: '/seller', text: 'Credits', size: 17, weight: '700', style: '.t-card-title' },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
let failures = 0;

for (const c of CASES) {
  await page.goto(`${BASE}${c.path}`, { waitUntil: 'networkidle', timeout: 40000 });
  const got = await page.evaluate(({ text, within }) => {
    const root = within ? document.querySelector(within) : document;
    if (!root) return null;
    const el = [...root.querySelectorAll('h1,h2,h3,h4,p,span,div')]
      .find((n) => n.textContent.trim() === text && !n.querySelector('h1,h2,h3,h4,p,span,div'));
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { size: Math.round(parseFloat(cs.fontSize)), weight: String(cs.fontWeight) };
  }, { text: c.text, within: c.within });

  if (!got) {
    failures += 1;
    console.log(`MISSING  ${c.context.padEnd(24)} "${c.text}" not found on ${c.path}`);
    continue;
  }
  const ok = got.size === c.size && got.weight === c.weight;
  if (!ok) failures += 1;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${c.context.padEnd(24)} ${c.style.padEnd(18)} "${c.text.slice(0, 30)}"  ` +
    `${got.size}px/${got.weight}  (baseline ${c.size}px/${c.weight})`,
  );
}

await browser.close();
console.log(`\n${CASES.length - failures}/${CASES.length} representative uses match the size and weight the approved screen renders.`);
console.log('The library\'s single "17px" label is not the authority here; the rendered screen is.');
process.exit(failures ? 1 : 0);
