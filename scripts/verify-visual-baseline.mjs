/**
 * Representative screens, measured against the approved design's own values.
 *
 * WHY THIS IS NOT A SCREENSHOT COMPARISON
 * ---------------------------------------
 * **The approved prototypes cannot be rendered in this environment.** They boot
 * React from unpkg.com, which the sandbox's proxy refuses, so the pages stay as
 * unexpanded `{{ template }}` placeholders. A side-by-side screenshot
 * comparison of the Admin console was therefore impossible here, and no such
 * comparison is claimed.
 *
 * What is possible is better than an eyeball in one way and worse in another.
 * The baseline declares every colour, size and weight as an inline style in its
 * own source, so those values can be read out and compared to what the browser
 * actually computes for the implementation. That is a *measurement*: it catches
 * near-misses a person comparing two screens never would (and it did — see
 * verify-design-tokens.mjs). It says nothing about layout, spacing rhythm or
 * whether a screen reads well, which is exactly what a screenshot would show.
 *
 * So: this establishes that the values are right. It does not establish visual
 * fidelity, and `verification.md` records which screens were compared how.
 *
 * Run:  PLAYWRIGHT=… BASE_URL=… node scripts/verify-visual-baseline.mjs
 */
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3811';

/**
 * Values read out of the approved design's inline styles.
 *
 * Each entry names where the baseline declares it, so a disagreement can be
 * checked against the source rather than argued about.
 */
const CHECKS = [
  // Rails — C-03. Deep blue for every console, brand blue for the active item.
  { path: '/seller', at: 1440, sel: 'nav[aria-label="Seller console"]', prop: 'backgroundColor', want: 'rgb(15, 36, 120)', note: 'rail surface #0F2478' },
  { path: '/builder', at: 1440, sel: 'nav[aria-label="Builder console"]', prop: 'backgroundColor', want: 'rgb(15, 36, 120)', note: 'rail surface #0F2478' },
  // A-02's rail is INK, not brand-deep. This row asserted #0F2478 until a
  // rendered comparison showed the approved console declares
  // `background:#12182B` — and `approved-baseline.md` said so all along
  // ("Ink #12182B — headings, admin rail, primary text"). The check was
  // encoding the implementation rather than the design, so it passed while
  // the operations console looked like a seller's.
  { path: '/admin', at: 1440, sel: 'nav[aria-label="Admin console"]', prop: 'backgroundColor', want: 'rgb(18, 24, 43)', note: 'rail surface #12182B (ink) — NOT brand-deep' },
  { path: '/admin', at: 1440, sel: 'nav[aria-label="Admin console"]', prop: 'width', want: '256px', note: 'admin rail width 232 + 24 padding' },
  { path: '/seller', at: 1440, sel: 'nav[aria-label="Seller console"]', prop: 'width', want: '264px', note: 'seller rail width 236 + 28 padding' },
  { path: '/admin', at: 1440, sel: 'nav[aria-label="Admin console"] a[aria-current="page"]', prop: 'backgroundColor', want: 'rgb(27, 59, 179)', note: 'active rail item #1B3BB3' },

  // Status chips — C-06 and C-08. All five surfaces.
  { path: '/admin/users', at: 1440, sel: '.bg-chip-success-bg', prop: 'backgroundColor', want: 'rgb(227, 243, 234)', note: 'success chip #E3F3EA' },
  { path: '/admin/properties', at: 1440, sel: '.bg-chip-danger-bg', prop: 'backgroundColor', want: 'rgb(253, 236, 234)', note: 'danger chip #FDECEA' },
  { path: '/admin/kyc', at: 1440, sel: '.bg-chip-warning-bg', prop: 'backgroundColor', want: 'rgb(255, 244, 226)', note: 'warning chip #FFF4E2' },
  { path: '/admin/kyc', at: 1440, sel: '.bg-chip-muted-bg', prop: 'backgroundColor', want: 'rgb(240, 242, 249)', note: 'muted chip #F0F2F9' },
  { path: '/seller/leads', at: 1440, sel: '.bg-chip-neutral-bg', prop: 'backgroundColor', want: 'rgb(238, 242, 253)', note: 'neutral chip #EEF2FD' },

  // Figures — the baseline declares three different sizes, not one.
  { path: '/admin', at: 1440, sel: 'main a[href="/admin/kyc"] span span', prop: 'fontSize', want: '28px', note: "A-02's queue tile, 28px" },
  { path: '/seller', at: 1440, sel: 'main .t-figure', prop: 'fontSize', want: '21px', note: 'the shared stat-tile step, 21px' },

  // Panels — the warning surface and border used across every console.
  // An attribute selector rather than a class one: Tailwind's arbitrary-value
  // class names contain [ # and ], all of which need CSS escaping, and getting
  // that wrong silently finds nothing rather than failing loudly.
  { path: '/admin/refunds', at: 1440, sel: '[class*="bg-[#FFF7E8]"]', prop: 'backgroundColor', want: 'rgb(255, 247, 232)', note: 'warning panel #FFF7E8' },
  { path: '/admin/refunds', at: 1440, sel: '[class*="border-[#F3DFB4]"]', prop: 'borderTopColor', want: 'rgb(243, 223, 180)', note: 'warning panel border #F3DFB4' },

  // Card and line — C-01.
  { path: '/admin/users', at: 1440, sel: 'main .border-line', prop: 'borderTopColor', want: 'rgb(225, 228, 238)', note: 'hairline #E1E4EE' },

  // The responsive contract — C-03. The rail becomes a drawer below 1060px.
  { path: '/admin', at: 390, sel: 'nav[aria-label="Admin console"]', prop: 'display', want: 'none', note: 'rail collapses below 1060px' },
  { path: '/seller', at: 390, sel: 'nav[aria-label="Seller console"]', prop: 'display', want: 'none', note: 'rail collapses below 1060px' },
  { path: '/builder', at: 390, sel: 'nav[aria-label="Builder console"]', prop: 'display', want: 'none', note: 'rail collapses below 1060px' },
];

/** Controls that must exist at 390px, where the rail has gone. */
const PRESENT_AT_MOBILE = ['/admin', '/seller', '/builder', '/admin/support', '/admin/wallets'];

const browser = await chromium.launch();
const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
  if (detail) console.log(`      ${detail}`);
};

for (const check of CHECKS) {
  const context = await browser.newContext({
    viewport: { width: check.at, height: check.at === 390 ? 844 : 1000 },
  });
  const page = await context.newPage();
  await page.goto(`${BASE}${check.path}`, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  const got = await page
    .$eval(check.sel, (el, prop) => getComputedStyle(el)[prop], check.prop)
    .catch(() => 'NOT FOUND');
  ok(
    `${check.path} @${check.at} · ${check.note}`,
    got === check.want,
    `want ${check.want}, got ${got}`,
  );
  await context.close();
}

for (const path of PRESENT_AT_MOBILE) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  const toggle = await page.$('button[aria-controls="console-drawer"]');
  const expanded = toggle ? await toggle.getAttribute('aria-expanded') : null;
  ok(
    `${path} @390 · the drawer toggle replaces the rail`,
    toggle !== null && expanded === 'false',
    toggle ? `aria-expanded="${expanded}", aria-controls wired` : 'no toggle found',
  );
  await context.close();
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} measured values match the approved baseline.`);
console.log('This measures values, not layout. It is not a screenshot comparison and does not establish visual fidelity.');
if (failed.length > 0) {
  console.log('\nDiffering:');
  failed.forEach((f) => console.log(` - ${f.name}`));
  process.exit(1);
}
