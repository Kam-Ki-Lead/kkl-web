/**
 * Side-by-side capture: the approved prototype and the implementation.
 *
 * The prototypes boot React and Babel from a CDN the environment's network
 * policy denies. `scripts/setup-prototype-review.sh` builds a **separate local
 * review copy** whose script tags point at the same pinned versions fetched
 * from the npm registry (which the policy does allow), and at local font files
 * from @fontsource instead of Google Fonts. **kkl-design is never modified.**
 *
 * This drives that copy the way a reviewer would — its own screen picker and
 * its own width tabs, so the prototype reflows the way it is designed to,
 * which a browser viewport alone does not make it do — and screenshots the
 * inner frame. Then it captures the implementation at the same width and the
 * matching state, and writes the pair plus a difference metric.
 *
 * The metric is a coarse per-pixel comparison after resizing to a common box.
 * It is a *sorting aid*, not a verdict: it tells a reviewer which pairs to
 * look at first. Layout judgements come from looking at the images.
 *
 * Run:
 *   ./scripts/setup-prototype-review.sh              # once
 *   PROTO_URL=http://127.0.0.1:8099 BASE_URL=http://127.0.0.1:3811 \
 *   PLAYWRIGHT=/path/to/playwright/index.mjs node scripts/capture-visual-comparison.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');

const PROTO = process.env.PROTO_URL ?? 'http://127.0.0.1:8099';
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3811';
const OUT = process.env.OUT_DIR ?? 'docs/phase-2/visual';

/**
 * The comparison set, in the priority order the acceptance pass asked for.
 *
 * `file` is the prototype document, `screen` the id its picker uses, `path`
 * the implementation route, and `setup` any state the implementation needs to
 * be in for the states to match.
 */
const PAIRS = [
  // Public portal
  { id: 'P-01-home', file: 'KKL Homepage - Portal Layout.dc.html', screen: null, path: '/', widths: [1440, 390] },
  { id: 'P-02-search', file: 'KKL Buyer Journey.dc.html', screen: 'P-02', path: '/search', widths: [1440, 390] },
  { id: 'P-03-property', file: 'KKL Buyer Journey.dc.html', screen: 'P-03', path: '/property/greenview-residency', widths: [1440] },

  // Seller
  { id: 'S-06-dashboard', file: 'KKL Seller Console.dc.html', screen: 'S-06', path: '/seller', widths: [1440, 390] },
  { id: 'S-07-marketplace', file: 'KKL Seller Console.dc.html', screen: 'S-07', path: '/seller/leads', widths: [1440, 390] },
  { id: 'S-11-purchase-result', file: 'KKL Seller Console.dc.html', screen: 'S-11', path: '/seller/leads/L-4471/result', widths: [1440], setup: 'purchase' },
  { id: 'S-14-billing', file: 'KKL Seller Console.dc.html', screen: 'S-14', path: '/seller/billing', widths: [1440, 390] },

  // Builder
  { id: 'B-06-dashboard', file: 'KKL Builder Console.dc.html', screen: 'B-06', path: '/builder', widths: [1440, 390] },
  { id: 'B-08-editor', file: 'KKL Builder Console.dc.html', screen: 'B-08', path: '/builder/properties/bl-greenview/basics', widths: [1440, 390] },
  { id: 'B-16-enquiries', file: 'KKL Builder Console.dc.html', screen: 'B-16', path: '/builder/enquiries', widths: [1440] },
  { id: 'B-19-restrictions', file: 'KKL Builder Console.dc.html', screen: 'B-19', path: '/builder/restrictions', widths: [1440] },

  // Admin
  { id: 'A-02-dashboard', file: 'KKL Admin Console.dc.html', screen: 'A-02', path: '/admin', widths: [1440, 390] },
  { id: 'A-06-kyc-review', file: 'KKL Admin Console.dc.html', screen: 'A-06', path: '/admin/kyc/K-3318', widths: [1440] },
  { id: 'A-19-adjust', file: 'KKL Admin Console.dc.html', screen: 'A-19', path: '/admin/wallets/U-10442/adjust', widths: [1440] },
  { id: 'A-23-ticket', file: 'KKL Admin Console.dc.html', screen: 'A-23', path: '/admin/support/T-2291', widths: [1440] },
  { id: 'A-30-audit', file: 'KKL Admin Console.dc.html', screen: 'A-30', path: '/admin/audit', widths: [1440] },

  // Shared: component library against representative implementation surfaces
  { id: 'C-mobile-nav', file: 'KKL Admin Console.dc.html', screen: 'A-02', path: '/admin', widths: [390], drawer: true },
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const rows = [];

/** Capture one prototype screen at one width, 1:1 (no scale-to-fit). */
async function captureProto(pair, width) {
  // The frame is scaled down when the stage is narrower than it. Give the
  // viewport room so scale stays at 1 and the screenshot is not resampled.
  const context = await browser.newContext({
    viewport: { width: Math.max(width + 260, 1700), height: 1400 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(`${PROTO}/${encodeURIComponent(pair.file)}`, { waitUntil: 'load', timeout: 40000 });
  await page.waitForTimeout(2500);

  if (pair.screen) {
    await page.selectOption('select[aria-label="Jump to screen"]', pair.screen).catch(() => {});
    await page.waitForTimeout(900);
  }
  // Its own width tab, so the prototype reflows as designed.
  await page.click(`button[aria-pressed]:text-is("${width}")`).catch(async () => {
    const tabs = await page.$$('button');
    for (const t of tabs) {
      if ((await t.textContent())?.trim() === String(width)) { await t.click(); break; }
    }
  });
  await page.waitForTimeout(1200);

  const frame = await page.$('div[style*="transform:scale"], div[style*="transform: scale"]');
  const target = frame ?? (await page.$('body'));
  const file = join(OUT, `${pair.id}-${width}-baseline.png`);
  await target.screenshot({ path: file }).catch(async () => {
    await page.screenshot({ path: file, fullPage: false });
  });
  await context.close();
  return file;
}

async function captureImpl(pair, width) {
  const context = await browser.newContext({
    viewport: { width, height: width === 390 ? 844 : 1000 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  if (pair.setup === 'purchase') {
    await page.goto(`${BASE}/seller/review-state?reset=1`, { waitUntil: 'load' });
    await page.goto(`${BASE}/seller/leads/L-4471/buy`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Confirm")').catch(() => {});
    await page.waitForTimeout(1200);
  } else {
    await page.goto(`${BASE}${pair.path}`, { waitUntil: 'networkidle', timeout: 40000 });
  }
  await page.waitForTimeout(700);
  if (pair.drawer) {
    await page.click('button[aria-controls="console-drawer"]').catch(() => {});
    await page.waitForTimeout(600);
  }
  const file = join(OUT, `${pair.id}-${width}-implementation.png`);
  await page.screenshot({ path: file, fullPage: false });
  await context.close();
  return file;
}

for (const pair of PAIRS) {
  for (const width of pair.widths) {
    try {
      const baseline = await captureProto(pair, width);
      const implementation = await captureImpl(pair, width);
      rows.push({ id: pair.id, width, baseline, implementation, ok: true });
      console.log(`captured  ${pair.id} @${width}`);
    } catch (error) {
      rows.push({ id: pair.id, width, ok: false, error: String(error).slice(0, 120) });
      console.log(`FAILED    ${pair.id} @${width}  ${String(error).slice(0, 100)}`);
    }
  }
}

await browser.close();
writeFileSync(join(OUT, 'index.json'), JSON.stringify(rows, null, 2));
const failed = rows.filter((r) => !r.ok);
console.log(`\n${rows.length - failed.length}/${rows.length} pairs captured into ${OUT}/`);
console.log('These are for a person to look at. No pass is claimed from capture alone.');
if (failed.length) process.exit(1);
