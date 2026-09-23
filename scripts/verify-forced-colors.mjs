/**
 * Forced-colors mode, which this project previously recorded as "needs
 * Windows". It does not.
 *
 * Chromium emulates forced-colors and Playwright exposes it as a context
 * option, so the `forced-colors` media query, the system colour keywords and
 * the `forced-color-adjust` rules can all be exercised here. What CANNOT be
 * exercised here is Windows' own High Contrast themes and their exact palette
 * — that still needs Windows. The difference matters: emulation catches the
 * failures that come from the application's own CSS, which is most of them,
 * and misses the ones that come from a specific theme's colours.
 *
 * The failure this looks for: an element that carries meaning through a
 * background, border or shadow the browser discards in forced-colors mode,
 * leaving no visible boundary. Status chips are the obvious risk — they carry
 * their meaning in a tinted fill.
 *
 * Run: BASE_URL=… PLAYWRIGHT=… node scripts/verify-forced-colors.mjs
 */
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3811';

const SCREENS = [
  ['P-01 homepage', '/'],
  ['P-02 search', '/search'],
  ['S-07 lead marketplace', '/seller/leads'],
  ['B-07 my properties', '/builder/properties'],
  ['A-02 operations dashboard', '/admin'],
  ['A-06 KYC review', '/admin/kyc/K-3318'],
];

let failures = 0;
const ok = (name, pass, detail) => {
  if (!pass) failures += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
  if (detail) console.log(`      ${detail}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ forcedColors: 'active', viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();

ok('0. Forced-colors mode is actually active in this run',
   await page.evaluate(() => matchMedia('(forced-colors: active)').matches).catch(() => false) ||
   (await (async () => { await page.setContent('<b>x</b>'); return page.evaluate(() => matchMedia('(forced-colors: active)').matches); })()),
   'emulated by Chromium — not Windows High Contrast itself, see the header of this file');

for (const [label, path] of SCREENS) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 40000 });

  // A chip whose fill is discarded and which has no border left is invisible
  // as a distinct thing: the text remains, the "this is a status" does not.
  // Target the chip component by its own marker rather than by guessing from
  // radius and padding. The first version of this check guessed, and reported
  // stat tiles and a subscription panel as chips.
  const chips = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('[data-chip]')) {
      const cs = getComputedStyle(el);
      const hasBorder = parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none';
      const hasOutline = parseFloat(cs.outlineWidth) > 0 && cs.outlineStyle !== 'none';
      if (!hasBorder && !hasOutline) out.push((el.textContent || '').trim().slice(0, 28));
    }
    return out;
  });
  ok(`${label} — every chip keeps a visible boundary`,
     chips.length === 0,
     chips.length ? `no border or outline survives on: ${[...new Set(chips)].slice(0, 5).join(', ')}` : 'all chips retain a border in forced-colors');

  // Text must not vanish: forced-colors substitutes system colours, and an
  // element that pins colour without pinning background can end up matching.
  const invisible = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('h1,h2,h3,p,span,a,button,label,td,th,li')) {
      const t = (el.textContent || '').trim();
      if (!t || el.querySelector('h1,h2,h3,p,span,a,button,label,td,th,li')) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      const cs = getComputedStyle(el);
      let bg = 'rgba(0, 0, 0, 0)';
      for (let n = el; n; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && c !== 'rgba(0, 0, 0, 0)') { bg = c; break; }
      }
      if (cs.color === bg) out.push(t.slice(0, 28));
    }
    return out;
  });
  ok(`${label} — no text matches its own background`,
     invisible.length === 0,
     invisible.length ? `invisible: ${[...new Set(invisible)].slice(0, 5).join(', ')}` : 'all text remains distinguishable from its surface');
}

// The focus ring must survive: forced-colors discards box-shadow, so the
// companion edge added for E-P2a disappears and the outline has to carry it
// alone. That is correct — forced-colors supplies its own high-contrast
// system colours — but it is worth asserting the outline is still there.
await page.goto(`${BASE}/seller/support/new`, { waitUntil: 'networkidle' });
const ring = await page.evaluate(() => {
  const el = document.querySelector('input[type=text], input:not([type]), textarea');
  el.focus();
  const cs = getComputedStyle(el);
  return { width: cs.outlineWidth, style: cs.outlineStyle, shadow: cs.boxShadow };
});
ok('Focus indicator survives forced-colors as an outline',
   parseFloat(ring.width) >= 1 && ring.style !== 'none',
   `outline ${ring.width} ${ring.style}; box-shadow is "${ring.shadow}" — forced-colors discards shadows, so the outline carries the indicator and the system supplies the colour`);

await browser.close();
console.log(`\n${failures === 0 ? 'All' : `${failures} failing`} forced-colors checks.`);
console.log('This is Chromium\'s emulation. Windows High Contrast with its own themes is');
console.log('still unverified and is listed as such in acceptance.md.');
process.exit(failures ? 1 : 0);
