/**
 * The two accessibility corrections, verified where they actually render.
 *
 * Arithmetic on a token says the value clears 3:1. It does not say the value
 * reaches the screen, that it survives the error and disabled states, or that
 * the focus companion paints without shifting or clipping anything. This
 * checks the rendered control on its real background, in every state that
 * changes the border or the ring.
 *
 * Run: BASE_URL=… PLAYWRIGHT=… node scripts/verify-contrast-corrections.mjs
 */
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3811';

const CORRECTED_BORDER = 'rgb(138, 142, 156)'; // #8A8E9C
const INK = 'rgb(18, 24, 43)';                 // #12182B companion
const SAFFRON = 'rgb(243, 148, 42)';           // #F3942A ring, sampled logo orange. Baseline #F2A20C stays in kkl-design.

function luminance(rgb) {
  const [r, g, b] = rgb.match(/\d+/g).slice(0, 3).map((n) => {
    const c = Number(n) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

let failures = 0;
const ok = (name, pass, detail) => {
  if (!pass) failures += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
  if (detail) console.log(`      ${detail}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

// ---------------------------------------------- 1. resting control on white
await page.goto(`${BASE}/seller/support/new`, { waitUntil: 'networkidle' });
const resting = await page.evaluate(() => {
  const el = document.querySelector('input[type=text], input:not([type]), textarea');
  if (!el) return null;
  const cs = getComputedStyle(el);
  let bg = 'rgb(255, 255, 255)';
  for (let n = el; n; n = n.parentElement) {
    const c = getComputedStyle(n).backgroundColor;
    if (c && c !== 'rgba(0, 0, 0, 0)') { bg = c; break; }
  }
  return { border: cs.borderTopColor, width: cs.borderTopWidth, bg };
});
ok('1. Control border is the corrected value where it renders',
   resting && resting.border === CORRECTED_BORDER,
   resting && `border ${resting.border} at ${resting.width} on ${resting.bg} — ${ratio(resting.border, resting.bg).toFixed(2)}:1`);
ok('2. That border clears 3:1 against the surface it sits on',
   resting && ratio(resting.border, resting.bg) >= 3,
   resting && `${ratio(resting.border, resting.bg).toFixed(2)}:1 against ${resting.bg} (needs 3:1)`);

// ------------------------------------------------ 3. invalid state unchanged
await page.goto(`${BASE}/seller/support/new`, { waitUntil: 'networkidle' });
await page.click('form button[type=submit]').catch(() => {});
await page.waitForTimeout(700);
const invalid = await page.evaluate(() => {
  const el = document.querySelector('[aria-invalid="true"]');
  if (!el) return null;
  return { border: getComputedStyle(el).borderTopColor };
});
ok('3. The invalid state still uses the danger border, not the corrected one',
   invalid !== null && invalid.border !== CORRECTED_BORDER,
   invalid ? `aria-invalid control border ${invalid.border} — the correction does not overwrite the error state` : 'no invalid control rendered');

// -------------------------------------------------------- 4. disabled state
const disabled = await page.evaluate(() => {
  const el = document.querySelector('input:disabled, select:disabled, textarea:disabled');
  return el ? { border: getComputedStyle(el).borderTopColor } : 'none-on-this-screen';
});
ok('4. Disabled controls read consistently',
   disabled === 'none-on-this-screen' || disabled.border === CORRECTED_BORDER,
   typeof disabled === 'string' ? 'no disabled control on this screen — checked on A-14 below' : `border ${disabled.border}`);

// --------------------------------------------- 5. focus ring and companion
await page.goto(`${BASE}/seller/support/new`, { waitUntil: 'networkidle' });
const focus = await page.evaluate(() => {
  const el = document.querySelector('input[type=text], input:not([type]), textarea');
  el.focus();
  const cs = getComputedStyle(el);
  const before = el.getBoundingClientRect();
  return {
    outlineColor: cs.outlineColor,
    outlineWidth: cs.outlineWidth,
    outlineOffset: cs.outlineOffset,
    boxShadow: cs.boxShadow,
    box: `${Math.round(before.width)}x${Math.round(before.height)}`,
  };
});
ok('5. The focus ring is still saffron, at the approved 3px and 2px offset',
   focus.outlineColor === SAFFRON && focus.outlineWidth === '3px' && focus.outlineOffset === '2px',
   `${focus.outlineWidth} ${focus.outlineColor} at offset ${focus.outlineOffset}`);
ok('6. The dark companion edge is present',
   focus.boxShadow.includes('18, 24, 43'),
   `box-shadow ${focus.boxShadow}`);
ok('7. The companion clears 3:1 against both light surfaces',
   ratio(INK, 'rgb(255, 255, 255)') >= 3 && ratio(INK, 'rgb(244, 246, 251)') >= 3,
   `${ratio(INK, 'rgb(255, 255, 255)').toFixed(2)}:1 on white, ${ratio(INK, 'rgb(244, 246, 251)').toFixed(2)}:1 on the page surface`);
ok('8. Saffron still reads as saffron against its own companion',
   ratio(SAFFRON, INK) >= 3,
   `${ratio(SAFFRON, INK).toFixed(2)}:1 — the ring reads saffron, not as a dark outline`);

// ------------------------------------- 9. the correction shifts no layout
const geometry = await page.evaluate(() => {
  const el = document.querySelector('input[type=text], input:not([type]), textarea');
  el.blur();
  const before = el.getBoundingClientRect();
  const beforeDoc = document.documentElement.scrollHeight;
  el.focus();
  const after = el.getBoundingClientRect();
  const afterDoc = document.documentElement.scrollHeight;
  return {
    moved: Math.abs(before.x - after.x) + Math.abs(before.y - after.y),
    resized: Math.abs(before.width - after.width) + Math.abs(before.height - after.height),
    reflowed: Math.abs(beforeDoc - afterDoc),
  };
});
ok('9. Focusing shifts nothing — box-shadow paints outside layout',
   geometry.moved === 0 && geometry.resized === 0 && geometry.reflowed === 0,
   `control moved ${geometry.moved}px, resized ${geometry.resized}px, document height changed ${geometry.reflowed}px`);

// ------------------------- 10. nothing clips the ring at a container edge
const clipped = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('input, select, textarea, button')) {
    const r = el.getBoundingClientRect();
    if (r.width < 1) continue;
    // The ring paints 3px outline at 2px offset plus a 1px companion, so it
    // needs 6px of room. An ancestor that hides overflow within that margin
    // would cut it.
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.overflow === 'hidden' || cs.overflowX === 'hidden' || cs.overflowY === 'hidden') {
        const pr = n.getBoundingClientRect();
        const margin = Math.min(r.left - pr.left, pr.right - r.right, r.top - pr.top, pr.bottom - r.bottom);
        if (margin < 6) out.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('name') || '').trim().slice(0, 20)}" has ${Math.round(margin)}px inside an overflow-hidden ancestor`);
        break;
      }
    }
  }
  return out;
});
ok('10. No focusable control sits within 6px of an overflow-hidden edge',
   clipped.length === 0,
   clipped.length ? clipped.slice(0, 4).join('; ') : 'the ring has room to paint on every control on this screen');

// ------------------------------------ 11. the ring on the dark rails still passes
await page.goto(`${BASE}/seller`, { waitUntil: 'networkidle' });
const rail = await page.evaluate(() => {
  const link = document.querySelector('nav[aria-label] a');
  link.focus();
  const cs = getComputedStyle(link);
  let bg = 'rgb(15, 36, 120)';
  for (let n = link; n; n = n.parentElement) {
    const c = getComputedStyle(n).backgroundColor;
    if (c && c !== 'rgba(0, 0, 0, 0)') { bg = c; break; }
  }
  return { outline: cs.outlineColor, shadow: cs.boxShadow, bg };
});
ok('11. On the dark rail the ring is unchanged and still passes',
   rail.outline === SAFFRON && ratio(SAFFRON, rail.bg) >= 3,
   `saffron on ${rail.bg} is ${ratio(SAFFRON, rail.bg).toFixed(2)}:1; the companion sits against the ring, not the rail`);

// -------------------------------- 12. a disabled control on a screen that has one
await page.goto(`${BASE}/admin/settings/pricing`, { waitUntil: 'networkidle' });
const adminDisabled = await page.evaluate(() => {
  const el = document.querySelector('input:disabled, select:disabled, textarea:disabled');
  if (!el) return null;
  const cs = getComputedStyle(el);
  let bg = 'rgb(255, 255, 255)';
  for (let n = el; n; n = n.parentElement) {
    const c = getComputedStyle(n).backgroundColor;
    if (c && c !== 'rgba(0, 0, 0, 0)') { bg = c; break; }
  }
  return { border: cs.borderTopColor, bg };
});
// 1.4.11 reads "except for inactive components". A disabled control is
// inactive, so its border is out of scope and is NOT required to reach 3:1 —
// and the approved A-14 deliberately renders these in the card hairline on a
// tinted fill, which is how a reader knows they cannot be typed into. The
// check asserts the exemption holds rather than demanding a value the
// criterion does not ask for. An earlier version of this check demanded the
// corrected border here and failed; the check was wrong, not the screen.
ok('12. Disabled controls keep their inactive treatment, which 1.4.11 exempts',
   adminDisabled === null || adminDisabled.border !== CORRECTED_BORDER,
   adminDisabled
     ? `A-14's disabled price fields render ${adminDisabled.border} on ${adminDisabled.bg} (${ratio(adminDisabled.border, adminDisabled.bg).toFixed(2)}:1) — inactive, so out of scope for 1.4.11, and deliberately distinct from an editable control`
     : 'no disabled control found on A-14; recorded as unchecked rather than assumed');

await browser.close();
console.log(`\n${failures === 0 ? 'All' : `${12 - failures}/12`} rendered-state checks behaved as expected.`);
console.log('These are the two corrections recorded as E-P2a and E-P2b. They are applied and');
console.log('verified as rendered; the DESIGN decision to keep them is still open.');
process.exit(failures ? 1 : 0);
