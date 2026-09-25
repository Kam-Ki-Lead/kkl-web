/**
 * Side-by-side capture: the approved prototype and the implementation.
 *
 * The prototypes boot React and Babel from a CDN the environment's network
 * policy denies. `scripts/setup-prototype-review.sh` builds a **separate local
 * review copy** whose script tags point at the same pinned versions fetched
 * from the npm registry, and at local font files from @fontsource instead of
 * Google Fonts. **kkl-design is never modified.**
 *
 * This drives that copy the way a reviewer would — its own screen picker and
 * its own width tabs, so the prototype reflows the way it is designed to,
 * which a browser viewport alone does not make it do — and screenshots the
 * inner frame. Then it captures the implementation at the same width and the
 * matching state, full page.
 *
 * The pair list is `scripts/screen-map.mjs`, which covers every inventory row:
 * 97 screens as pairs, 4 nested states named against their parent, and the 12
 * library rows against the screens they are judged in.
 *
 * **These are for a person to look at.** Capturing successfully is not a
 * visual pass. `scripts/verify-screen-geometry.mjs` reads the same pairs
 * mechanically and ranks them, so inspection is directed rather than blind.
 *
 * Run:
 *   ./scripts/setup-prototype-review.sh                 # once
 *   PROTO_URL=http://127.0.0.1:8099 BASE_URL=http://127.0.0.1:3811 \
 *   PLAYWRIGHT=/path/to/playwright/index.mjs node scripts/capture-visual-comparison.mjs
 *
 * Env: CAPTURE_SUFFIX names the state (''=missing media, '-photos'=image
 * present). ONLY restricts to a comma-separated list of pair ids.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PAIRS } from './screen-map.mjs';
import { selectProtoWidth } from './proto-width.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');

const PROTO = process.env.PROTO_URL ?? 'http://127.0.0.1:8099';
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3811';
const OUT = process.env.OUT_DIR ?? 'docs/phase-2/visual';
const SUFFIX = process.env.CAPTURE_SUFFIX ?? '';
const ONLY = (process.env.ONLY ?? '').split(',').map((s) => s.trim()).filter(Boolean);

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const rows = [];

// ---------------------------------------------------------------- prototype
//
// One page per (document, width), reused across every screen in it. Booting
// React and Babel takes about two and a half seconds; doing that 194 times
// rather than 10 is most of an hour for nothing.
const protoPages = new Map();

async function protoPage(file, width) {
  const key = `${file}@${width}`;
  const existing = protoPages.get(key);
  if (existing) return existing;

  const context = await browser.newContext({
    // The frame is scaled down when the stage is narrower than it. Give the
    // viewport room so scale stays at 1 and the screenshot is not resampled.
    viewport: { width: Math.max(width + 260, 1700), height: 1400 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(`${PROTO}/${encodeURIComponent(file)}`, { waitUntil: 'load', timeout: 40000 });
  await page.waitForTimeout(2500);
  // Its own width tab, so the prototype reflows as designed. Throws if the
  // frame does not take the requested width — never capture the wrong frame.
  await selectProtoWidth(page, width);
  protoPages.set(key, page);
  return page;
}

async function captureProto(pair, width) {
  const page = await protoPage(pair.file, width);
  if (pair.screen) {
    await page.selectOption('select[aria-label="Jump to screen"]', pair.screen).catch(() => {});
    await page.waitForTimeout(800);
  }
  const frame = await page.$('div[style*="transform:scale"], div[style*="transform: scale"]');
  const target = frame ?? (await page.$('body'));
  const file = join(OUT, `${pair.id}-${width}${SUFFIX}-baseline.png`);
  await target.screenshot({ path: file }).catch(async () => {
    await page.screenshot({ path: file, fullPage: false });
  });
  return file;
}

// ----------------------------------------------------------- implementation
//
// Each setup is a sequence a real browser would have to perform. A purchase
// result, a payment outcome and an enquiry confirmation do not exist for a
// browser that has not earned them, and opening them directly is refused —
// correctly. So they are reached the way a person reaches them.
const SETUPS = {
  async 'enquiry-confirmed'(page) {
    // The approved flow verifies a mobile number before it confirms anything,
    // so the confirmation cannot be opened directly and is not reached by
    // skipping the step. This walks it: form, then the verification screen.
    await page.goto(`${BASE}/property/greenview-residency/enquiry`, { waitUntil: 'networkidle' });
    await page.fill('#name', 'A. Reviewer');
    await page.fill('#mobile', '9800000000');
    const message = await page.$('#message');
    if (message) await message.fill('Checking availability for a 3 BHK.');
    await Promise.all([
      page.waitForURL(/\/auth/, { timeout: 15000 }),
      page.click('form button[type=submit]'),
    ]);
    await page.fill('#auth-code', '123456');
    await Promise.all([
      page.waitForURL(/\/enquiry\/[^/]+\/confirmed|\/enquiry\/unavailable/, { timeout: 15000 }),
      page.click('button:has-text("Verify and continue")'),
    ]);
  },
  async 'seller-suspended'(page) {
    await page.goto(`${BASE}/seller/review-state?account=suspended&to=/seller/restricted`, { waitUntil: 'networkidle' });
  },
  async purchase(page) {
    await page.goto(`${BASE}/seller/review-state?reset=1&to=/seller`, { waitUntil: 'networkidle' });
    await page.goto(`${BASE}/seller/leads/L-4471/buy`, { waitUntil: 'networkidle' });
    await Promise.all([
      page.waitForURL(/\/result$/, { timeout: 15000 }).catch(() => {}),
      page.click('button:has-text("Confirm and buy")').catch(() => {}),
    ]);
  },
  async 'purchase-then'(page, pair) {
    await SETUPS.purchase(page);
    await page.goto(`${BASE}${pair.path}`, { waitUntil: 'networkidle' });
  },
  async 'payment-success'(page) {
    await page.goto(`${BASE}/seller/review-state?reset=1&payment=success&to=/seller`, { waitUntil: 'networkidle' });
    await page.goto(`${BASE}/seller/billing/recharge`, { waitUntil: 'networkidle' });
    await Promise.all([
      page.waitForURL(/\/billing\/payment$/, { timeout: 15000 }).catch(() => {}),
      page.click('button:has-text("Continue to payment")').catch(() => {}),
    ]);
  },
  async 'builder-subscription-payment'(page) {
    await page.goto(`${BASE}/builder/review-state?reset=1&subscriptionOutcome=success&to=/builder`, { waitUntil: 'networkidle' });
    await page.goto(`${BASE}/builder/subscription`, { waitUntil: 'networkidle' });
    await Promise.all([
      page.waitForURL(/\/subscription\/payment$/, { timeout: 15000 }),
      page.click('button:has-text("Renew now")'),
    ]);
  },
  async 'dirty-editor'(page, pair) {
    await page.goto(`${BASE}${pair.path}`, { waitUntil: 'networkidle' });
    // B-15 is the unsaved-changes screen; an editor with no edit is B-08.
    const field = await page.$('input[type="text"], input:not([type])');
    if (field) {
      await field.click();
      await field.fill('Greenview Residency — revised');
      await page.keyboard.press('Tab');
      await page.waitForTimeout(400);
    }
  },
};

async function captureImpl(pair, width) {
  const context = await browser.newContext({
    viewport: { width, height: width === 390 ? 844 : 1000 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const setup = pair.setup ? SETUPS[pair.setup] : null;
  if (setup) {
    await setup(page, pair);
  } else {
    await page.goto(`${BASE}${pair.path}`, { waitUntil: 'networkidle', timeout: 40000 });
  }
  await page.waitForTimeout(600);
  if (pair.drawer) {
    await page.click('button[aria-controls="console-drawer"]').catch(() => {});
    await page.waitForTimeout(600);
  }
  // Full page, because the prototype side is captured as its whole frame. A
  // viewport crop made every long screen a top-of-page comparison.
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 90));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(400);
  const landed = page.url().replace(BASE, '').replace(/^https?:\/\/[^/]+/, '');
  const file = join(OUT, `${pair.id}-${width}${SUFFIX}-implementation.png`);
  await page.screenshot({ path: file, fullPage: true });
  await context.close();
  return { file, landed };
}

// Group by document so each prototype page is booted once per width.
const selected = PAIRS.filter((p) => !ONLY.length || ONLY.includes(p.id));
const order = [...selected].sort((a, b) => (a.file + a.id).localeCompare(b.file + b.id));

for (const width of [1440, 390]) {
  for (const pair of order) {
    if (!pair.widths.includes(width)) continue;
    try {
      const baseline = await captureProto(pair, width);
      const { file: implementation, landed } = await captureImpl(pair, width);
      rows.push({ id: pair.id, width, baseline, implementation, landed, ok: true });
      console.log(`captured  ${pair.id} @${width}  -> ${landed}`);
    } catch (error) {
      rows.push({ id: pair.id, width, ok: false, error: String(error).slice(0, 140) });
      console.log(`FAILED    ${pair.id} @${width}  ${String(error).slice(0, 110)}`);
    }
  }
  // Release this width's prototype pages before the next width boots its own.
  for (const [key, page] of protoPages) {
    if (key.endsWith(`@${width}`)) { await page.context().close(); protoPages.delete(key); }
  }
}

await browser.close();
rows.sort((a, b) => a.id.localeCompare(b.id) || a.width - b.width);
writeFileSync(join(OUT, `index${SUFFIX}.json`), JSON.stringify(rows, null, 2));
const failed = rows.filter((r) => !r.ok);
console.log(`\n${rows.length - failed.length}/${rows.length} pairs captured into ${OUT}/`);
console.log('Capturing is not comparing. Run verify-screen-geometry.mjs, then look at the pairs it ranks.');
if (failed.length) process.exit(1);
