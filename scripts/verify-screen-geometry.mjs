/**
 * Mechanical comparison of the two rendered DOMs, screen by screen.
 *
 * WHY THIS EXISTS
 * ---------------
 * Capturing 194 pairs is easy; looking at 194 pairs is not, and "captured
 * successfully" is not a visual pass. Every defect this project has found by
 * eye was a measurable property — a heading at the wrong step of the type
 * ladder, a container 64px narrow, an image slot at the wrong height. So
 * measure those, on both sides, and rank the screens by how far apart they
 * are. A person then looks at the pairs this puts at the top, and at a sample
 * of the ones it puts at the bottom to check that the measure is not blind.
 *
 * HOW ELEMENTS ARE MATCHED ACROSS TWO UNRELATED DOMs
 * --------------------------------------------------
 * By their text. The prototype and the application are different codebases
 * with different markup, but they render the same copy, and a heading that
 * reads "Lead marketplace" on one side is the same heading as the one that
 * reads "Lead marketplace" on the other. Text that appears more than once on
 * a side is dropped rather than guessed at.
 *
 * WHAT IT CANNOT SEE
 * ------------------
 * Spacing between elements, alignment, shadow, anything about an image, and
 * any element whose copy deliberately differs. A screen with no divergence
 * here is a screen whose *measured* properties agree — it is a filter for
 * where to look, never a verdict. Differences in figures, labels and copy are
 * expected and are reported separately from geometry so they do not drown it.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { PAIRS } from './screen-map.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');

const PROTO = process.env.PROTO_URL ?? 'http://127.0.0.1:8099';
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3811';
const OUT = process.env.OUT_DIR ?? 'docs/phase-2/visual';
const ONLY = (process.env.ONLY ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const WIDTH = Number(process.env.WIDTH ?? 1440);

/**
 * Collected in the page. Returns text -> typography for leaf-ish elements,
 * plus the page's own structural measurements.
 *
 * `scale` divides out the prototype's stage transform so both sides are
 * reported in CSS pixels.
 */
function collect(scale, rootSelector) {
  // The prototype page contains its own reviewer chrome — screen picker, width
  // tabs, review-notes panel — which is NOT part of the screen and must not be
  // compared against the application. Scope to the emulated frame.
  const root = rootSelector ? document.querySelector(rootSelector) : document.body;
  if (!root) return { text: {}, contentWidth: null, controls: [], buttons: [] };
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const seen = new Map();
  const dupes = new Set();

  // `div` belongs in this list even though it is not a text element. The
  // approved prototypes render their headings as styled divs — there is not a
  // single h1 or h2 inside the console frames — so leaving div out made every
  // prototype heading invisible to a tool whose whole purpose is catching a
  // heading at the wrong step of the type ladder. The leaf test below keeps
  // wrappers out.
  const INTERESTING = 'div,h1,h2,h3,h4,h5,h6,p,span,a,button,label,th,td,li,summary,legend,figcaption';
  for (const el of root.querySelectorAll(INTERESTING)) {
    // Leaf-ish only: an element whose own text is its children's text is a
    // wrapper, and its computed size says nothing about what is on screen.
    if (el.querySelector(INTERESTING)) continue;
    const text = norm(el.textContent || '');
    if (text.length < 3 || text.length > 80) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    if (seen.has(text)) { dupes.add(text); continue; }
    // The nearest painted background behind this text, and where it sits down
    // the page. Two elements can carry the same words and not be the same
    // element — a "Sign in" in the header and a "Sign in" in the footer — and
    // comparing those reports a difference in nothing. Context makes that
    // detectable instead of leaving it to be argued about per finding.
    let bg = 'rgba(0, 0, 0, 0)';
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const c = getComputedStyle(n).backgroundColor;
      if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') { bg = c; break; }
    }
    const rootTop = root.getBoundingClientRect().top;
    seen.set(text, {
      fontSize: Math.round(parseFloat(cs.fontSize) / scale * 10) / 10,
      fontWeight: String(cs.fontWeight),
      color: cs.color,
      fontFamily: cs.fontFamily.split(',')[0].replace(/["']/g, ''),
      textTransform: cs.textTransform,
      bg,
      // Fraction of the way down the captured page, so header-versus-footer is
      // visible without depending on either page's absolute height.
      atY: Math.round(((r.top - rootTop) / Math.max(1, root.scrollHeight || root.getBoundingClientRect().height)) * 100) / 100,
    });
  }
  for (const d of dupes) seen.delete(d);

  // Structure: the widest laid-out box NARROWER than the frame, which is the
  // page's content container. Including the frame-width element itself made
  // this compare the prototype's stage against the application's viewport —
  // "1344 -> 1440" at 1440 and "1344 -> 390" at 390, neither of which was a
  // difference in anything.
  const bound = Math.round(root.getBoundingClientRect().width / scale) || Infinity;
  const widths = [...root.querySelectorAll('div,section,main,form')]
    .map((n) => Math.round(n.getBoundingClientRect().width / scale))
    .filter((w) => w > 200 && w < bound);
  const controls = [...root.querySelectorAll('input:not([type=hidden]),select,textarea')]
    .map((n) => {
      const cs = getComputedStyle(n);
      const r = n.getBoundingClientRect();
      return {
        h: Math.round(r.height / scale),
        borderWidth: cs.borderTopWidth,
        borderColor: cs.borderTopColor,
        radius: cs.borderTopLeftRadius,
      };
    });
  const buttons = [...root.querySelectorAll('button')]
    .map((n) => {
      const cs = getComputedStyle(n);
      return { h: Math.round(n.getBoundingClientRect().height / scale), bg: cs.backgroundColor, radius: cs.borderTopLeftRadius };
    })
    .filter((b) => b.h > 10);

  return {
    text: Object.fromEntries(seen),
    contentWidth: widths.length ? Math.max(...widths) : null,
    controls,
    buttons,
  };
}

const browser = await chromium.launch();
const protoPages = new Map();

async function protoPage(file) {
  if (protoPages.has(file)) return protoPages.get(file);
  const ctx = await browser.newContext({
    viewport: { width: Math.max(WIDTH + 260, 1700), height: 1400 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto(`${PROTO}/${encodeURIComponent(file)}`, { waitUntil: 'load', timeout: 40000 });
  await page.waitForTimeout(2500);
  await page.click(`button[aria-pressed]:text-is("${WIDTH}")`).catch(() => {});
  await page.waitForTimeout(1000);
  protoPages.set(file, page);
  return page;
}

function scaleOf() {
  const frame = document.querySelector('div[style*="transform:scale"], div[style*="transform: scale"]');
  const m = frame && getComputedStyle(frame).transform.match(/matrix\(([-\d.]+)/);
  return m ? parseFloat(m[1]) : 1;
}

const results = [];
const selected = PAIRS.filter((p) => p.widths.includes(WIDTH) && p.path && !p.drawer && (!ONLY.length || ONLY.includes(p.id)));

for (const pair of selected) {
  try {
    const pp = await protoPage(pair.file);
    if (pair.screen) {
      await pp.selectOption('select[aria-label="Jump to screen"]', pair.screen).catch(() => {});
      await pp.waitForTimeout(700);
    }
    const proto = await pp.evaluate(([fn, sfn]) => {
      const scale = new Function('return ' + sfn)()();
      return new Function('return ' + fn)()(scale, 'div[style*="transform:scale"], div[style*="transform: scale"]');
    }, [collect.toString(), scaleOf.toString()]);

    const ctx = await browser.newContext({ viewport: { width: WIDTH, height: 1000 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(`${BASE}${pair.path}`, { waitUntil: 'networkidle', timeout: 40000 });
    await page.waitForTimeout(400);
    const impl = await page.evaluate((fn) => new Function('return ' + fn)()(1, null), collect.toString());
    await ctx.close();

    // Typography divergence on text both sides render identically.
    const shared = Object.keys(proto.text).filter((t) => t in impl.text);
    const typo = [];
    const mismatched = [];
    for (const t of shared) {
      const a = proto.text[t], b = impl.text[t];
      // Same words, different place in the page, or on a different surface:
      // almost certainly not the same element. Reported separately so it can
      // be excluded from the defect list rather than hidden from it.
      if (a.bg !== b.bg && Math.abs(a.atY - b.atY) > 0.25) {
        mismatched.push({ text: t, note: `proto at ${a.atY} on ${a.bg}; impl at ${b.atY} on ${b.bg}` });
        continue;
      }
      const d = [];
      if (Math.abs(a.fontSize - b.fontSize) > 0.6) d.push(`size ${a.fontSize}->${b.fontSize}`);
      if (a.fontWeight !== b.fontWeight) d.push(`weight ${a.fontWeight}->${b.fontWeight}`);
      if (a.color !== b.color) d.push(`colour ${a.color}->${b.color}`);
      if (a.fontFamily !== b.fontFamily) d.push(`family ${a.fontFamily}->${b.fontFamily}`);
      // A text-transform difference is only visible when it CHANGES the text.
      // Both sides are matched on their rendered text content, so if the key is
      // already uppercase the transform is doing nothing either way and saying
      // so 231 times buries the differences that matter.
      const neutralTransform = t === t.toUpperCase();
      if (a.textTransform !== b.textTransform && !neutralTransform) {
        d.push(`transform ${a.textTransform}->${b.textTransform}`);
      }
      if (d.length) typo.push({ text: t, diff: d.join('; ') });
    }

    const struct = [];
    if (proto.contentWidth && impl.contentWidth && Math.abs(proto.contentWidth - impl.contentWidth) > 2) {
      struct.push(`content width ${proto.contentWidth} -> ${impl.contentWidth}`);
    }
    const uniq = (xs, f) => [...new Set(xs.map(f))].sort().join(' | ');
    if (proto.controls.length && impl.controls.length) {
      const pb = uniq(proto.controls, (c) => `${c.borderWidth} ${c.borderColor}`);
      const ib = uniq(impl.controls, (c) => `${c.borderWidth} ${c.borderColor}`);
      if (pb !== ib) struct.push(`control border [${pb}] -> [${ib}]`);
      const ph = uniq(proto.controls, (c) => c.h), ih = uniq(impl.controls, (c) => c.h);
      if (ph !== ih) struct.push(`control height [${ph}] -> [${ih}]`);
    }
    if (proto.buttons.length && impl.buttons.length) {
      // A pill is a pill: the baseline writes 999px and Chromium clamps an
      // enormous radius to 2^25px. Comparing them literally reports a
      // difference in notation, not in appearance.
      const radius = (b) => (parseFloat(b.radius) >= 500 ? 'pill' : b.radius);
      const pr = uniq(proto.buttons, radius), ir = uniq(impl.buttons, radius);
      if (pr !== ir) struct.push(`button radius [${pr}] -> [${ir}]`);
    }

    results.push({
      id: pair.id, width: WIDTH, shared: shared.length, mismatched,
      protoOnly: Object.keys(proto.text).length - shared.length,
      implOnly: Object.keys(impl.text).length - shared.length,
      typo, struct, score: typo.length * 2 + struct.length * 5,
    });
    const flag = typo.length || struct.length ? 'DIFF' : 'ok  ';
    console.log(`${flag} ${pair.id} @${WIDTH}  shared=${shared.length}  typo=${typo.length}  struct=${struct.length}  ambiguous=${mismatched.length}`);
  } catch (error) {
    results.push({ id: pair.id, width: WIDTH, error: String(error).slice(0, 140), score: -1 });
    console.log(`ERR  ${pair.id} @${WIDTH}  ${String(error).slice(0, 110)}`);
  }
}

await browser.close();
mkdirSync(OUT, { recursive: true });
results.sort((a, b) => b.score - a.score);
writeFileSync(join(OUT, `geometry-${WIDTH}.json`), JSON.stringify(results, null, 2));

const withDiff = results.filter((r) => r.score > 0);
const errored = results.filter((r) => r.score === -1);
console.log(`\n${results.length - withDiff.length - errored.length}/${results.length} screens show no measured divergence at ${WIDTH}px.`);
console.log(`${withDiff.length} diverge and are ranked in ${OUT}/geometry-${WIDTH}.json. ${errored.length} errored.`);
console.log('A screen with no divergence here has agreeing MEASUREMENTS. It is where to look, not a verdict.');
