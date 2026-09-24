/**
 * E-P3 evidence capture — the attribution band on review imagery, on all
 * three affected screens, against the approved baseline.
 *
 * WHAT THE IMAGES ARE IN THIS RUN
 * -------------------------------
 * This environment CAN reach images.unsplash.com (the previous one could
 * not — its proxy rejected CONNECT, which is why the stand-ins exist). So
 * both sides here load the ACTUAL photographs the baseline references, from
 * the host it names. That is what `docs/phase-2/visual/README.md` describes
 * as the real-photograph run: "run the capture in an environment that allows
 * images.unsplash.com and omit NEXT_PUBLIC_KKL_IMAGE_ORIGIN."
 *
 *   - Baseline side: the local review copy of kkl-design @ 5bc3512 built with
 *     KKL_REVIEW_PHOTOS=off, which leaves the baseline's own Unsplash URLs in
 *     place (kkl-design is never modified).
 *   - Implementation side: built with NEXT_PUBLIC_KKL_REVIEW_IMAGERY=on and
 *     no IMAGE_ORIGIN override, so it hotlinks the same seven photographs.
 *
 * The script REFUSES to produce evidence if any photograph did not actually
 * load (naturalWidth === 0): a broken-image capture labelled as the
 * image-present state is worse than no capture.
 *
 * What E-P3 is: the implementation draws the credit band on EVERY image slot;
 * the approved P-01 draws it on the project cards and NOT on the property
 * cards. What E-P3 is not: a photographic-fidelity comparison. The images
 * are the baseline's own hotlinked stock photos, illustrative only, and the
 * baseline requires every one to be replaced before launch.
 *
 * Captions sit beneath the frames. Raw captures are unaltered. This file is
 * capture tooling — it changes no application code.
 *
 * Run:  BASE_URL=http://127.0.0.1:3811 PROTO_URL=http://127.0.0.1:8097 \
 *       PLAYWRIGHT=… node scripts/capture-attribution-evidence.mjs
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const { chromium } = await import(process.env.PLAYWRIGHT ?? "playwright");
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3811";
const PROTO = process.env.PROTO_URL ?? "http://127.0.0.1:8097";

// The IMPLEMENTATION commit, not HEAD — see capture-b15-evidence.mjs.
const COMMIT = execSync(
  'git log -1 --format=%h -- src package.json package-lock.json next.config.ts postcss.config.mjs tsconfig.json',
).toString().trim();
const OUT = join("docs", "phase-2", "evidence", "e-p3");
mkdirSync(OUT, { recursive: true });
const RAW = join(OUT, "raw");
mkdirSync(RAW, { recursive: true });

const BUYER_FILE = "KKL Buyer Journey.dc.html";
const HOME_FILE = "KKL Homepage - Portal Layout.dc.html";

/** Count loaded vs broken images; refuse to evidence a broken-image run.
 *  The baseline renders photographs inside a shadow-DOM web component
 *  (image-slot.js), so the walk has to pierce shadow roots. */
async function assertImagesLoaded(page, side) {
  const counts = await page.evaluate(() => {
    const imgs = [];
    const walk = (root) => {
      for (const el of root.querySelectorAll("*")) {
        if (el.tagName === "IMG") imgs.push(el);
        if (el.shadowRoot) walk(el.shadowRoot);
      }
    };
    walk(document);
    const visible = imgs.filter((i) => i.getClientRects().length > 0);
    return { total: visible.length, loaded: visible.filter((i) => i.naturalWidth > 0).length };
  });
  console.log(`       ${side}: ${counts.loaded}/${counts.total} visible images actually loaded`);
  if (counts.total === 0 || counts.loaded < counts.total) {
    throw new Error(`${side}: ${counts.loaded}/${counts.total} images loaded — not publishing a broken-image capture as image-present evidence.`);
  }
}

const shots = [];
async function shot(page, file, caption, { fullPage = false, selector = null } = {}) {
  const name = `${file}-${COMMIT}.png`;
  if (selector) {
    const el = await page.$(selector);
    if (!el) throw new Error(`no element for ${selector}`);
    await el.screenshot({ path: join(RAW, name) });
  } else {
    await page.screenshot({ path: join(RAW, name), fullPage });
  }
  shots.push({ name, caption });
  console.log(`capture ${name}`);
}

const browser = await chromium.launch();

async function protoPage(file, screen) {
  const ctx = await browser.newContext({ viewport: { width: 1700, height: 1400 } });
  const page = await ctx.newPage();
  await page.goto(`${PROTO}/${encodeURIComponent(file)}`, { waitUntil: "load", timeout: 40000 });
  await page.waitForTimeout(2500);
  await page.click('button[aria-pressed]:text-is("1440")').catch(() => {});
  await page.waitForTimeout(800);
  if (screen) {
    await page.selectOption('select[aria-label="Jump to screen"]', screen);
    await page.waitForTimeout(1500);
  }
  // Let the photographs arrive; they are hotlinked from images.unsplash.com.
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
  return { ctx, page };
}

const FRAME_SEL = 'div[style*="transform:scale"], div[style*="transform: scale"]';

// ------------------------------------------------------------------- P-01
{
  const { ctx, page } = await protoPage(HOME_FILE, null);
  await assertImagesLoaded(page, "baseline P-01");
  await shot(page, "p01-BASELINE",
    "P-01 BEFORE · approved baseline with its own Unsplash photographs. The credit band appears on the Featured PROJECTS cards (Orchid Grove, Riverside Commons) and NOT on the Featured PROPERTIES cards.",
    { selector: FRAME_SEL });
  await ctx.close();

  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const impl = await ctx2.newPage();
  await impl.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 60000 });
  await impl.waitForTimeout(1500);
  await assertImagesLoaded(impl, "implementation P-01");
  await shot(impl, "p01-implementation",
    "P-01 AFTER · this implementation with the same seven photographs. The credit band appears on EVERY image slot, including the Featured properties cards — that is E-P3.",
    { fullPage: true });
  await ctx2.close();
}

// ------------------------------------------------------------------- P-02
{
  const { ctx, page } = await protoPage(BUYER_FILE, "P-02");
  await assertImagesLoaded(page, "baseline P-02");
  await shot(page, "p02-BASELINE",
    "P-02 BEFORE · approved baseline, results list.",
    { selector: FRAME_SEL });
  await ctx.close();

  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const impl = await ctx2.newPage();
  await impl.goto(`${BASE}/search`, { waitUntil: "networkidle", timeout: 60000 });
  await impl.waitForTimeout(1500);
  await assertImagesLoaded(impl, "implementation P-02");
  await shot(impl, "p02-implementation",
    "P-02 AFTER · this implementation. Every result card's photograph carries the credit band.",
    { fullPage: true });
  await ctx2.close();
}

// ------------------------------------------------------------------- P-03
{
  const { ctx, page } = await protoPage(BUYER_FILE, "P-03");
  await assertImagesLoaded(page, "baseline P-03");
  await shot(page, "p03-BASELINE",
    "P-03 BEFORE · approved baseline, gallery. The band is present here on both sides.",
    { selector: FRAME_SEL });
  await ctx.close();

  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const impl = await ctx2.newPage();
  await impl.goto(`${BASE}/property/greenview-residency`, { waitUntil: "networkidle", timeout: 60000 });
  await impl.waitForTimeout(1500);
  await assertImagesLoaded(impl, "implementation P-03");
  await shot(impl, "p03-implementation",
    "P-03 AFTER · this implementation, gallery. Band present, as the approved screen has it.",
    { fullPage: true });
  await ctx2.close();
}

await browser.close();

// ------------------------------------------------------------- labelled sheet
const dataUri = (name) =>
  `data:image/png;base64,${readFileSync(join(RAW, name)).toString("base64")}`;
const pair = (a, b) => `<div class="pair">${cell(a)}${cell(b)}</div>`;
function cell(shot) {
  return `<figure><img src="${dataUri(shot.name)}" alt=""><figcaption>${shot.caption}</figcaption></figure>`;
}
const html = `<!doctype html><meta charset="utf-8"><style>
  body { font: 15px/1.5 system-ui, sans-serif; background: #fff; color: #12182B; margin: 32px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .meta { color: #2A3250; margin-bottom: 24px; max-width: 1150px; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 36px; align-items: start; }
  figure { margin: 0; }
  img { width: 100%; border: 1px solid #8A8E9C; border-radius: 6px; }
  figcaption { margin-top: 8px; }
</style>
<h1>E-P3 — Attribution on review imagery, all three affected screens</h1>
<p class="meta">Implementation commit ${COMMIT} · captured ${new Date().toISOString().slice(0, 10)}.
BOTH sides show the ACTUAL photographs the baseline references, hotlinked from images.unsplash.com — this environment reaches that host, so these are not the geometric stand-ins.
The photographs are the baseline's own illustrative stock choices and every one must be replaced with licensed project photography before launch; this sheet is about WHERE THE CREDIT BAND APPEARS, not about photographic fidelity.
The exception: the implementation attributes every slot; the approved P-01 attributes the project cards and not the property cards. Decision stays OPEN.</p>
${pair(shots[0], shots[1])}
${pair(shots[2], shots[3])}
${pair(shots[4], shots[5])}`;
const sheetPath = join(RAW, "sheet.html");
writeFileSync(sheetPath, html);
const sheetBrowser = await chromium.launch();
const sheet = await sheetBrowser.newContext({ viewport: { width: 1500, height: 1000 } });
const sheetPage = await sheet.newPage();
await sheetPage.goto(`file:///${sheetPath.replace(/\\/g, "/")}`);
const sheetName = `e-p3-attribution-${COMMIT}.png`;
await sheetPage.screenshot({ path: join(OUT, sheetName), fullPage: true });
await sheetBrowser.close();
rmSync(sheetPath); // intermediate; the PNG is the artifact
console.log(`sheet  ${sheetName}`);
console.log("\nE-P3 evidence complete. The decision stays open — this shows the treatment; it does not confirm it.");
