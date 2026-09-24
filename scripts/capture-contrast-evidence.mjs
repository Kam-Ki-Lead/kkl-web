/**
 * E-P2 evidence capture — the two contrast corrections, before and after,
 * on a real control on a real screen.
 *
 * WHAT "BEFORE" IS HERE
 * ---------------------
 * The BEFORE crops are captured from the approved baseline itself: the local
 * review copy of kkl-design @ 5bc3512 (scripts/setup-prototype-review.sh —
 * kkl-design is never modified). They are not reconstructions, not historical
 * screenshots of this repository's earlier code, and not re-labelled
 * stand-ins: they are the approved prototype rendering its own declared
 * values (#F2A20C focus ring with no companion; #C6CCE0 control border).
 *
 * The AFTER crops are the implementation at the commit named in the
 * filenames, same screen (the P-04 enquiry form), same control.
 *
 * Captions sit beneath the frames in the composed sheet; the raw crops are
 * unaltered. This file is capture tooling — it changes no application code.
 *
 * Run:  BASE_URL=http://127.0.0.1:3811 PROTO_URL=http://127.0.0.1:8099 \
 *       PLAYWRIGHT=… node scripts/capture-contrast-evidence.mjs
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const { chromium } = await import(process.env.PLAYWRIGHT ?? "playwright");
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3811";
const PROTO = process.env.PROTO_URL ?? "http://127.0.0.1:8099";

// The IMPLEMENTATION commit — see capture-b15-evidence.mjs for why this is
// not `git rev-parse HEAD`.
const COMMIT = execSync(
  'git log -1 --format=%h -- src package.json package-lock.json next.config.ts postcss.config.mjs tsconfig.json',
).toString().trim();
const OUT = join("docs", "phase-2", "evidence", "e-p2");
mkdirSync(OUT, { recursive: true });
const RAW = join(OUT, "raw");
mkdirSync(RAW, { recursive: true });

const BUYER_FILE = "KKL Buyer Journey.dc.html";

const shots = [];
async function crop(page, selector, file, caption, pad = 36) {
  const el = await page.$(selector);
  if (!el) throw new Error(`no element for ${selector}`);
  const box = await el.boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  const name = `${file}-${COMMIT}.png`;
  await page.screenshot({
    path: join(RAW, name),
    clip: {
      x: Math.max(0, box.x - pad),
      y: Math.max(0, box.y - pad),
      width: box.width + pad * 2,
      height: box.height + pad * 2,
    },
  });
  const style = await page.evaluate((sel) => {
    const node = document.querySelector(sel);
    if (!node) return null;
    const cs = getComputedStyle(node);
    return {
      borderColor: cs.borderColor,
      outlineColor: cs.outlineColor,
      outlineWidth: cs.outlineWidth,
      boxShadow: cs.boxShadow,
    };
  }, selector);
  shots.push({ name, caption, style });
  console.log(`crop   ${name}`);
  console.log(`       border=${style?.borderColor} outline=${style?.outlineColor} ${style?.outlineWidth} shadow=${style?.boxShadow}`);
  return style;
}

const browser = await chromium.launch();

// ------------------------------------------------------------- baseline side
const protoCtx = await browser.newContext({ viewport: { width: 1700, height: 1400 } });
const proto = await protoCtx.newPage();
await proto.goto(`${PROTO}/${encodeURIComponent(BUYER_FILE)}`, { waitUntil: "load", timeout: 40000 });
await proto.waitForTimeout(2500);
await proto.click('button[aria-pressed]:text-is("1440")').catch(() => {});
await proto.waitForTimeout(800);
await proto.selectOption('select[aria-label="Jump to screen"]', "P-04");
await proto.waitForTimeout(1200);

// The first visible text input inside the prototype's stage frame.
const protoInput = await proto.evaluateHandle(() => {
  const frame = document.querySelector('div[style*="transform:scale"], div[style*="transform: scale"]') ?? document.body;
  return [...frame.querySelectorAll("input")]
    .find((i) => (i.type === "text" || i.type === "tel" || !i.type) && i.offsetParent !== null) ?? null;
});
const protoSelector = await proto.evaluate((el) => {
  if (!el) return null;
  if (el.id) return `#${el.id}`;
  el.setAttribute("data-evidence", "first-field");
  return "[data-evidence]";
}, protoInput);
if (!protoSelector) throw new Error("No focusable text input found in the prototype's P-04.");

await crop(proto, protoSelector, "p04-field-resting-BASELINE",
  "BEFORE · resting field, approved baseline (kkl-design 5bc3512, local review copy). Declared control border #C6CCE0 — 1.60:1 on white.");
await proto.click(protoSelector);
await proto.waitForTimeout(500);
await crop(proto, protoSelector, "p04-field-focused-BASELINE",
  "BEFORE · focused field, approved baseline. Saffron #F2A20C ring alone — 2.11:1 on white, below the 3:1 WCAG 1.4.11 asks of a focus indicator.");
await protoCtx.close();

// -------------------------------------------------------- implementation side
const implCtx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const impl = await implCtx.newPage();
await impl.goto(`${BASE}/property/greenview-residency/enquiry`, { waitUntil: "networkidle" });
await impl.waitForTimeout(600);

await crop(impl, "#name", "p04-field-resting-implementation",
  "AFTER · resting field, this implementation. Control border corrected to #8A8E9C — 3.27:1 on white (E-P2b).");
await impl.click("#name");
await impl.waitForTimeout(500);
await crop(impl, "#name", "p04-field-focused-implementation",
  "AFTER · focused field, this implementation. The saffron ring is unchanged; a 1px ink #12182B companion now sits inside it — 17.63:1 on white (E-P2a).");
await implCtx.close();

await browser.close();

// ------------------------------------------------------------- labelled sheet
const dataUri = (name) =>
  `data:image/png;base64,${readFileSync(join(RAW, name)).toString("base64")}`;
const cell = (shot) => `<figure><img src="${dataUri(shot.name)}" alt=""><figcaption>${shot.caption}</figcaption>
  <code>border ${shot.style?.borderColor} · outline ${shot.style?.outlineColor} ${shot.style?.outlineWidth} · shadow ${shot.style?.boxShadow}</code></figure>`;
const pair = (a, b) => `<div class="pair">${cell(a)}${cell(b)}</div>`;
const html = `<!doctype html><meta charset="utf-8"><style>
  body { font: 15px/1.5 system-ui, sans-serif; background: #fff; color: #12182B; margin: 32px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .meta { color: #2A3250; margin-bottom: 24px; max-width: 1100px; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
  figure { margin: 0; }
  img { width: 100%; border: 1px solid #8A8E9C; border-radius: 6px; }
  figcaption { margin-top: 8px; }
  code { display: block; margin-top: 4px; font-size: 12px; color: #2A3250; word-break: break-all; }
</style>
<h1>E-P2 — Contrast corrections, before and after</h1>
<p class="meta">Implementation commit ${COMMIT} · captured ${new Date().toISOString().slice(0, 10)}.
BEFORE crops are the approved baseline (kkl-design 5bc3512) rendered by its local review copy — not reconstructions.
AFTER crops are kkl-web at ${COMMIT}. Same screen (P-04 enquiry), the corresponding name field on each side — label wording differs as sample content; what is being compared is the control's chrome: its border and its focus indicator. Raw crops are unaltered; captions sit beneath them.
Both corrections are applied and reversible in one line; design sign-off stays OPEN.</p>
${pair(shots[0], shots[2])}
${pair(shots[1], shots[3])}`;
const sheetPath = join(RAW, "sheet.html");
writeFileSync(sheetPath, html);
const sheet = await (await chromium.launch()).newContext({ viewport: { width: 1500, height: 1000 } });
const sheetPage = await sheet.newPage();
await sheetPage.goto(`file:///${sheetPath.replace(/\\/g, "/")}`);
const sheetName = `e-p2-before-after-${COMMIT}.png`;
await sheetPage.screenshot({ path: join(OUT, sheetName), fullPage: true });
await sheet.browser().close();
rmSync(sheetPath); // intermediate; the PNG is the artifact
console.log(`sheet  ${sheetName}`);
console.log("\nE-P2 evidence complete. Sign-off stays open — this shows the change; it does not approve it.");
