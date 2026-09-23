/**
 * WCAG contrast for every text-on-surface pair the design uses.
 *
 * C-11 left "individual status-chip contrast" unmeasured, and every
 * verification pass since has carried it forward as outstanding. It is pure
 * arithmetic on values this repository already holds, so it should never have
 * been a person's job.
 *
 * WHAT THIS DOES AND DOES NOT ESTABLISH
 * -------------------------------------
 * It computes the contrast ratio for each declared foreground/background pair
 * and reports it against WCAG 2.2 AA: 4.5:1 for normal text, 3:1 for large
 * text (>=24px, or >=18.66px bold) and for non-text boundaries.
 *
 * It does **not** establish that a screen is accessible. It checks the pairs
 * the design declares; a component placing one of these colours on a surface it
 * was not designed for would be missed, and nothing here looks at focus order,
 * announcements or a screen reader. Those are recorded separately.
 *
 * Run:  node scripts/verify-contrast.mjs
 */
import { readFileSync } from 'node:fs';

const css = readFileSync('src/app/globals.css', 'utf8');

const tokens = Object.fromEntries(
  [...css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{6});/gi)].map(([, name, value]) => [
    name,
    value.toLowerCase(),
  ]),
);

function channel(component) {
  const c = component / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

const WHITE = '#ffffff';

/**
 * Each pair is a place the design actually puts one colour on another, with
 * the text size that decides which threshold applies.
 */
const PAIRS = [
  // The five status chips. 13px semibold — normal text, so 4.5:1.
  { what: 'Chip · neutral', fg: tokens['chip-neutral-fg'], bg: tokens['chip-neutral-bg'], need: 4.5, note: '13px semibold' },
  { what: 'Chip · success', fg: tokens['chip-success-fg'], bg: tokens['chip-success-bg'], need: 4.5, note: '13px semibold' },
  { what: 'Chip · warning', fg: tokens['chip-warning-fg'], bg: tokens['chip-warning-bg'], need: 4.5, note: '13px semibold' },
  { what: 'Chip · danger', fg: tokens['chip-danger-fg'], bg: tokens['chip-danger-bg'], need: 4.5, note: '13px semibold' },
  { what: 'Chip · muted', fg: tokens['chip-muted-fg'], bg: tokens['chip-muted-bg'], need: 4.5, note: '13px semibold' },

  // Body text on each surface it appears on.
  { what: 'Ink on white', fg: tokens.ink, bg: WHITE, need: 4.5, note: 'headings and values' },
  { what: 'Body on white', fg: tokens.body, bg: WHITE, need: 4.5, note: 'paragraph text' },
  { what: 'Muted on white', fg: tokens.muted, bg: WHITE, need: 4.5, note: 'captions and labels' },
  { what: 'Muted on surface', fg: tokens.muted, bg: tokens.surface, need: 4.5, note: 'captions on the page background' },
  { what: 'Muted on tint', fg: tokens.muted, bg: tokens.tint, need: 4.5, note: 'captions in inset panels' },
  { what: 'Body on tint', fg: tokens.body, bg: tokens.tint, need: 4.5, note: 'panel text' },

  // Links and actions.
  { what: 'Brand link on white', fg: tokens.brand, bg: WHITE, need: 4.5, note: 'links and quiet buttons' },
  { what: 'Brand link on tint', fg: tokens.brand, bg: tokens.tint, need: 4.5, note: 'links in panels' },
  { what: 'White on brand', fg: WHITE, bg: tokens.brand, need: 4.5, note: 'primary button' },
  { what: 'White on brand-deep', fg: WHITE, bg: tokens['brand-deep'], need: 4.5, note: 'primary button hover, rail' },

  // Semantic text on the panels that carry it.
  { what: 'Warning text on warning panel', fg: tokens.warning, bg: '#fff7e8', need: 4.5, note: 'unresolved-rule panels' },
  { what: 'Danger text on danger chip bg', fg: tokens.danger, bg: tokens['chip-danger-bg'], need: 4.5, note: 'error messages' },
  { what: 'Success text on success chip bg', fg: tokens.success, bg: tokens['chip-success-bg'], need: 4.5, note: 'confirmations' },

  // Rail foregrounds. C-03 claims inactive items clear 7:1 on their rail.
  { what: 'Rail item on rail', fg: tokens['rail-seller-item'], bg: tokens['brand-deep'], need: 4.5, note: 'inactive rail item' },
  { what: 'Rail label on rail', fg: tokens['rail-seller-label'], bg: tokens['brand-deep'], need: 4.5, note: 'rail group heading, 12px' },
  { what: 'Admin rail item on rail', fg: tokens['rail-admin-item'], bg: tokens['brand-deep'], need: 4.5, note: 'inactive Admin rail item' },
  { what: 'White on rail active', fg: WHITE, bg: tokens.brand, need: 4.5, note: 'active rail item' },

  { what: 'Ink on saffron', fg: tokens.ink, bg: tokens.saffron, need: 4.5, note: 'count badge, 12px bold' },

  // Non-text boundaries. 1.4.11 applies to what IDENTIFIES a component or
  // state, not to every line on the page, so these carry that distinction.
  { what: 'Saffron on rail', fg: tokens.saffron, bg: tokens['brand-deep'], need: 3, note: 'focus ring on the rail — identifies focus' },
];

/**
 * Pairs that fall below 3:1 and are DESIGN decisions, not implementation ones.
 *
 * Both are values the approved baseline declares. Changing either alters the
 * approved appearance — the focus ring is part of the brand identity (C-01
 * names saffron's three uses, and the focus ring is one of them) — so they are
 * reported with the numbers and a proposed remedy rather than quietly darkened.
 *
 * Listed separately from the checks above so a real regression in a passing
 * pair cannot hide among known findings.
 */
const DESIGN_FINDINGS = [
  {
    what: 'Focus ring on a light background',
    fg: tokens.saffron,
    bg: WHITE,
    need: 3,
    criterion: 'WCAG 2.2 AA · 1.4.11 Non-text Contrast',
    why: 'The focus indicator must be distinguishable from its surroundings. Saffron on white and on the page surface is about 2.1:1.',
    remedy: 'Keep saffron and pair it with a dark companion — an outline plus a 1px ink box-shadow reads as one indicator and clears 3:1 on any background — or darken the ring on light surfaces only. Both change the approved appearance and need a design decision.',
  },
  {
    what: 'Control border on white',
    fg: tokens['control-border'],
    bg: WHITE,
    need: 3,
    criterion: 'WCAG 2.2 AA · 1.4.11 Non-text Contrast',
    why: 'A text input is identified by its border. The approved #C6CCE0 is about 1.6:1; the card hairline #E1E4EE, which these controls were using until this pass, is 1.27:1.',
    remedy: 'Darken the control border on light surfaces, or give controls a filled surface distinct from the card. The card hairline itself is decorative — it groups visible content rather than identifying a component — and is not in scope for 1.4.11.',
  },
];

const results = PAIRS.map((pair) => {
  const value = ratio(pair.fg, pair.bg);
  return { ...pair, value, pass: value >= pair.need };
});

const findings = DESIGN_FINDINGS.map((f) => ({ ...f, value: ratio(f.fg, f.bg) }));

const failed = results.filter((r) => !r.pass);
for (const r of results) {
  const mark = r.pass ? 'PASS' : 'FAIL';
  console.log(
    `${mark}  ${r.what.padEnd(32)} ${r.fg} on ${r.bg}  ${r.value.toFixed(2)}:1  (needs ${r.need}:1) · ${r.note}`,
  );
}

console.log(`\n${results.length - failed.length}/${results.length} declared colour pairs meet WCAG 2.2 AA.`);

console.log(`\n${findings.length} DESIGN-LEVEL findings — below threshold, and not the implementation's to change:`);
for (const f of findings) {
  console.log(`\n  ${f.what}: ${f.fg} on ${f.bg} = ${f.value.toFixed(2)}:1, needs ${f.need}:1`);
  console.log(`    ${f.criterion}`);
  console.log(`    ${f.why}`);
  console.log(`    Proposed: ${f.remedy}`);
}

console.log('\nThis is arithmetic on declared pairs. It is not an accessibility pass for any screen.');
if (failed.length > 0) {
  console.log('\nBelow threshold:');
  failed.forEach((f) => console.log(` - ${f.what}: ${f.value.toFixed(2)}:1, needs ${f.need}:1`));
  process.exit(1);
}
