/**
 * Native browser zoom and text-only zoom.
 *
 * C-11 recorded the baseline as having checked only a *simulated* 200% text
 * enlargement, on one screen at one width, and marked it Partial. This does
 * both kinds properly, across every console, because they fail differently:
 *
 * - **Native zoom** (Ctrl +) scales everything. WCAG 1.4.10 Reflow requires no
 *   horizontal scrolling at 320 CSS px, which is what 1280px at 400% gives.
 *   Layouts break here when something is pinned to a pixel width.
 * - **Text-only zoom** (Firefox's zoom-text-only, and the effect of a large
 *   default font size) scales text and not boxes. WCAG 1.4.4 requires 200%
 *   without loss of content. Layouts break here when a box has a fixed height
 *   or an overflow that clips.
 *
 * The second is simulated by scaling the root font size, which is the closest
 * a Chromium-family browser gets. Firefox's own text-only zoom is not
 * exercised, and that is recorded rather than glossed.
 *
 * Run:  PLAYWRIGHT=… BASE_URL=… node scripts/verify-zoom.mjs
 */
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3811';

const SCREENS = [
  '/', '/search', '/property/greenview-residency',
  '/seller', '/seller/leads', '/seller/billing', '/seller/billing/recharge',
  '/builder', '/builder/properties/bl-greenview/basics', '/builder/enquiries',
  '/admin', '/admin/users', '/admin/kyc/K-3318', '/admin/wallets/U-10442/adjust',
  '/admin/support/T-2291', '/admin/audit',
];

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass, detail });
  if (!pass) console.log(`FAIL  ${name}\n      ${detail}`);
};

const browser = await chromium.launch();

/**
 * WCAG 1.4.10 Reflow: content at 320 CSS px wide without horizontal scrolling.
 * 1280 at 400% zoom is exactly 320 CSS px, which is how the criterion is
 * normally tested.
 */
console.log('Native zoom · 400% (1280px at 400% = 320 CSS px, WCAG 1.4.10 Reflow)');
for (const path of SCREENS) {
  const context = await browser.newContext({ viewport: { width: 320, height: 512 } });
  const page = await context.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const overflow = await page.evaluate(() => {
    const d = document.documentElement;
    return d.scrollWidth - d.clientWidth;
  });
  ok(`Reflow at 320 CSS px · ${path}`, overflow <= 1, `overflows by ${overflow}px`);
  await context.close();
}

/**
 * WCAG 1.4.4 Resize Text: 200% without loss of content or function.
 *
 * Simulated by doubling the root font size, which scales every rem- and
 * em-based value and leaves px-based boxes alone — the same asymmetry that
 * makes text-only zoom break layouts.
 */
console.log('Text-only zoom · 200% (root font-size doubled)');
for (const path of SCREENS) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'html { font-size: 32px !important; }' });
  await page.waitForTimeout(400);

  const problems = await page.evaluate(() => {
    const d = document.documentElement;
    const horizontal = d.scrollWidth - d.clientWidth;
    // Content clipped by a box that did not grow with its text.
    const clipped = [...document.querySelectorAll('main *')]
      .filter((el) => {
        const style = getComputedStyle(el);
        if (style.overflow === 'visible' || el.scrollHeight === 0) return false;
        // sr-only content is clipped by design — that is what hides it.
        if (el.classList.contains('sr-only') || el.closest('.sr-only')) return false;
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') return false;
        return el.scrollHeight > el.clientHeight + 4 && el.clientHeight > 0;
      })
      .slice(0, 3)
      .map((el) => `${el.tagName}.${(el.className || '').toString().slice(0, 30)}`);
    return { horizontal, clipped };
  });

  ok(
    `200% text without clipping · ${path}`,
    problems.horizontal <= 1 && problems.clipped.length === 0,
    `horizontal overflow ${problems.horizontal}px; clipped: ${problems.clipped.join(' | ') || 'none'}`,
  );
  await context.close();
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} zoom checks passed across ${SCREENS.length} screens.`);
console.log("Firefox's own text-only zoom is NOT exercised — this simulates it by scaling the root font size, which is the closest Chromium gets.");
if (failed.length) process.exit(1);
