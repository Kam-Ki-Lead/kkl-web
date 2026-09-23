/**
 * Every colour token, checked against the approved design's own source.
 *
 * WHY THIS EXISTS
 * ---------------
 * `verification.md` recorded C-01 as "values transcribed and compared". It was
 * transcribed; the comparison was a person reading two lists, and it missed
 * three tokens that were never in the baseline at all. A near-miss colour is
 * the hardest kind of difference to see and the easiest kind to check, so it
 * should never have been a human's job.
 *
 * This reads the tokens out of globals.css and greps the approved design files
 * for each value. A token the baseline never uses is a token somebody invented.
 *
 * It needs no browser and no server — it is the one check in this repository
 * that compares the implementation against the design rather than against
 * itself.
 *
 * Run:  node scripts/verify-design-tokens.mjs [path-to-kkl-design]
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DESIGN = process.argv[2] ?? '../kkl-design';
const CSS = 'src/app/globals.css';

const design = readdirSync(DESIGN)
  .filter((f) => f.endsWith('.dc.html') && !f.includes('archived'))
  .map((f) => ({ file: f, text: readFileSync(join(DESIGN, f), 'utf8').toLowerCase() }));

if (design.length === 0) {
  console.error(`No design files found in ${DESIGN}. Pass the path to kkl-design.`);
  process.exit(2);
}

const css = readFileSync(CSS, 'utf8');
const tokens = [...css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{6});/gi)]
  .map(([, name, value]) => ({ name, value: value.toLowerCase() }));

/**
 * Tokens the design has no literal for, with the reason.
 *
 * Each one is a deliberate departure or an addition, and naming it here is the
 * point: an unexplained absence should fail, and these are the explanations.
 */
/**
 * Values the approved design does not specify, each with the reason.
 *
 * Almost all of them are *derived states* — a hover, a disabled fill, a
 * placeholder — that the baseline simply does not draw. Those have to be
 * invented, and inventing them is fine; leaving them unexplained is not, which
 * is why an unlisted literal fails this check.
 */
const DERIVED = {
  '#0a1230': 'Homepage hero wash. Darker than --brand-deep, for a gradient the baseline renders as an image.',
  '#de9309': 'Saffron hover. The baseline draws saffron only at rest and specifies no hover.',
  '#2a4199': 'Footer link hover on the deep-blue footer. Not specified in the baseline.',
  '#aeb6ce': 'Disabled primary-button fill. The baseline shows a disabled button but declares no fill for it.',
  '#9aa2b8': 'Placeholder text in form controls. Not specified in the baseline.',
  // The same accessibility correction as --color-control-border above, caught
  // again here because the token declaration is itself a literal in the CSS.
  '#8a8e9c': 'Control border, corrected for WCAG 2.2 AA 1.4.11. See --color-control-border in EXPLAINED. Awaiting design sign-off as E-P2b.',
};

const EXPLAINED = {
  // The design writes rail foregrounds only inside the Seller and Builder rail
  // markup, as literals that also appear there; if one of these ever stops
  // matching, it is a real change.
  //
  // ACCESSIBILITY CORRECTION, not a derived state. It is listed here — in the
  // place reserved for things that need explaining — rather than quietly
  // admitted, because the whole point of this check is that a token the
  // approved design never uses has to be argued for.
  'control-border':
    'Corrected for contrast. The approved #C6CCE0 is 1.60:1 on white and 1.48:1 on the page surface, against the 3:1 that WCAG 2.2 AA 1.4.11 requires of the border identifying a control. #8A8E9C is the smallest same-hue darkening that clears it: 3.27:1 on white, 3.02:1 on the page surface. Awaiting design sign-off as E-P2b. The approved value is kept as --color-control-border-baseline so the change stays legible.',
  'control-border-baseline':
    'The approved #C6CCE0, retained unused so the correction above can be read as a correction and reverted in one line if the design prefers a different remedy.',
};

const results = [];
for (const token of tokens) {
  const bare = token.value.slice(1);
  const hits = design.filter((d) => d.text.includes(token.value) || d.text.includes(bare));
  const explained = EXPLAINED[token.name];
  results.push({
    ...token,
    hits: hits.length,
    files: hits.map((h) => h.file.replace('KKL ', '').replace('.dc.html', '')),
    explained,
    pass: hits.length > 0 || Boolean(explained),
  });
}

/**
 * Hex colours written straight into components, rather than taken from a token.
 *
 * Tailwind's arbitrary-value syntax makes `bg-[#FDECEA]` as easy to type as a
 * token, and a one-off literal is how a palette quietly grows a 27th colour.
 * Every one of these has to appear in the approved design too.
 *
 * This caught the destructive button's hover, which was #FBECEB — a value
 * nobody had approved, invented for a state the baseline does not specify.
 */
const componentFiles = [];
(function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (/\.(tsx|ts|css)$/.test(entry.name)) componentFiles.push(path);
  }
})('src');

const literals = new Map();
for (const file of componentFiles) {
  const text = readFileSync(file, 'utf8');
  for (const [, hex] of text.matchAll(/#([0-9a-fA-F]{6})\b/g)) {
    const value = `#${hex.toLowerCase()}`;
    if (!literals.has(value)) literals.set(value, new Set());
    literals.get(value).add(file);
  }
}

const strayLiterals = [];
for (const [value, files] of literals) {
  if (DERIVED[value]) continue;
  const bare = value.slice(1);
  // The design writes white as #fff 159 times, so match the shorthand too.
  const short = /^#(.)\1(.)\2(.)\3$/.exec(value);
  const shorthand = short ? `#${short[1]}${short[2]}${short[3]}` : null;
  const inDesign = design.some(
    (d) => d.text.includes(value) || d.text.includes(bare) || (shorthand && d.text.includes(shorthand)),
  );
  if (!inDesign) strayLiterals.push({ value, files: [...files] });
}

const failed = results.filter((r) => !r.pass);
for (const r of results) {
  const mark = r.pass ? 'OK  ' : 'ABSENT';
  const where = r.hits > 0 ? `${r.hits} file(s): ${r.files.slice(0, 3).join(', ')}` : (r.explained ?? 'not in the approved design');
  console.log(`${mark.padEnd(7)} --color-${r.name.padEnd(20)} ${r.value}  ${where}`);
}

console.log(`\n${results.length - failed.length}/${results.length} colour tokens appear in the approved design.`);
console.log(`${literals.size - strayLiterals.length}/${literals.size} hex literals written into components appear in it too.`);

if (strayLiterals.length > 0) {
  console.log('\nHex literals the approved design never uses:');
  strayLiterals.forEach((l) => console.log(` - ${l.value}  ${l.files.join(', ')}`));
}

if (failed.length > 0 || strayLiterals.length > 0) {
  if (failed.length === 0) process.exit(1);
}
if (failed.length > 0) {
  console.log('\nTokens the approved design never uses:');
  failed.forEach((f) => console.log(` - --color-${f.name}: ${f.value}`));
  console.log('\nEither the token is wrong, or the departure needs a reason in EXPLAINED.');
  process.exit(1);
}
