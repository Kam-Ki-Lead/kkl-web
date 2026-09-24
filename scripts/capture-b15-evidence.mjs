/**
 * E-P1 evidence capture — the B-15 unsaved-changes behaviour on browser
 * Back/Forward, as a short recording plus labelled still frames.
 *
 * This is CAPTURE TOOLING. It changes nothing in the application; the only
 * thing it drives is a browser. The labelled strip is composed afterwards
 * from unaltered viewport frames — captions sit BENEATH each frame in the
 * contact sheet, never overlaid on the capture, so nothing in the rendered
 * application is hidden by a label. (An earlier draft of this evidence put
 * captions on top of the frames and they covered the dialog's buttons; that
 * framing was corrected, and the raw frames here are always unaltered.)
 *
 * What it records, in order:
 *   1. Arriving at the listing editor by clicking (a client-side history
 *      entry — the arrival path where Back shows no dialog).
 *   2. Editing the title: the "Unsaved changes" mark appears.
 *   3. Browser Back: the editor is left, no custom dialog appears. THIS IS
 *      THE OPEN EXCEPTION, shown as it is.
 *   4. Browser Forward: the edit is back in the field, with the
 *      "Unsaved work restored." notice and the unsaved mark.
 *   5. An independent second browser context reading the same field: the
 *      server still has the original value — restored is not saved.
 *   6. For contrast, the approved three-way dialog on IN-APP navigation
 *      (still present; the exception is only about browser Back).
 *
 * Artifacts are named with the implementation commit they show. A docs-only
 * commit does not change that identity; if application code changes, re-run
 * this and the new commit short-sha lands in the filenames.
 *
 * Run:  BASE_URL=http://127.0.0.1:3811 PLAYWRIGHT=… node scripts/capture-b15-evidence.mjs
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const { chromium } = await import(process.env.PLAYWRIGHT ?? "playwright");
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3811";

// The IMPLEMENTATION commit, not HEAD: documentation commits do not change
// what the application renders. Resolve it as the last commit that touched
// application code or build configuration.
const COMMIT = execSync(
  'git log -1 --format=%h -- src package.json package-lock.json next.config.ts postcss.config.mjs tsconfig.json',
).toString().trim();
const OUT = join("docs", "phase-2", "evidence", "e-p1");
mkdirSync(OUT, { recursive: true });
const RAW = join(OUT, "raw");
mkdirSync(RAW, { recursive: true });

const EDITOR = "/builder/properties/bl-greenview/basics";
const LIST = "/builder/properties";
const EDITED = "Greenview Residency — edited, never saved";

const frames = [];
async function frame(page, file, caption) {
  const name = `${file}-${COMMIT}.png`;
  await page.screenshot({ path: join(RAW, name) });
  frames.push({ name, caption });
  console.log(`frame  ${name} — ${caption}`);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: RAW, size: { width: 1280, height: 800 } },
});
const page = await ctx.newPage();

// 1. Arrive by clicking, as a Builder does.
await page.goto(`${BASE}${LIST}`, { waitUntil: "networkidle" });
await page.click(`a[href="${EDITOR}"]`);
await page.waitForURL((u) => u.pathname === EDITOR, { timeout: 15000 });
await page.waitForTimeout(1200);
const ORIGINAL = await page.inputValue("#title");
await frame(page, "01-editor-arrival",
  `1 · The listing editor, reached by clicking through from the properties list. The title reads "${ORIGINAL}" — the saved value.`);

// 2. Edit.
await page.click("#title");
await page.fill("#title", EDITED);
await page.keyboard.press("Tab");
await page.waitForTimeout(1000);
await frame(page, "02-edited-unsaved-mark",
  `2 · The title is edited. The header shows "Unsaved changes". Nothing has been sent anywhere.`);

// 3. Browser Back — the exception, shown as it is.
await page.goBack({ waitUntil: "commit" }).catch(() => {});
await page.waitForURL((u) => u.pathname.startsWith(LIST), { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1200);
await frame(page, "03-after-back-no-dialog",
  "3 · Browser Back. The editor is left and the approved three-way dialog does NOT appear. This is the open exception E-P1.");

// 4. Browser Forward — the edit is restored.
await page.goForward({ waitUntil: "commit" }).catch(() => {});
await page.waitForURL((u) => u.pathname === EDITOR, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1500);
const restored = await page.inputValue("#title");
await frame(page, "04-after-forward-restored",
  `4 · Browser Forward. The field reads "${restored}" again, above "Unsaved work restored." — and it is still marked "Unsaved changes".`);

// 5. Independent view: a second context reads the server value.
const other = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const otherPage = await other.newPage();
await otherPage.goto(`${BASE}${EDITOR}`, { waitUntil: "networkidle" });
await otherPage.waitForTimeout(800);
const serverValue = await otherPage.inputValue("#title");
await frame(otherPage, "05-independent-view-server-value",
  `5 · An independent tab (separate session) opens the same editor. It reads "${serverValue}" — the restored edit was retained, not saved.`);
await other.close();
if (serverValue !== ORIGINAL) {
  console.error(`UNEXPECTED: the server value changed ("${serverValue}"). Do not publish this evidence.`);
  process.exit(1);
}

// 6. Contrast: in-app navigation still gets the approved dialog.
await page.click("#title");
await page.keyboard.press("End");
await page.waitForTimeout(400);
await page.click(`a[href="${LIST}"]`);
await page.waitForTimeout(1000);
const dialogUp = (await page.textContent("body")).includes("Discard changes");
await frame(page, "06-in-app-dialog-still-present",
  "6 · For contrast: clicking a link INSIDE the application still raises the approved dialog — Save draft and close · Discard changes · Keep editing.");
if (!dialogUp) {
  console.error("UNEXPECTED: the in-app exit dialog did not appear. Do not publish this evidence.");
  process.exit(1);
}
await page.click('button:has-text("Keep editing")');
await page.waitForTimeout(600);

// Close the recording context and keep the video under a stable name.
await ctx.close();
const videoFile = readdirSync(RAW).find((f) => f.endsWith(".webm"));
if (videoFile) {
  const named = `e-p1-back-forward-${COMMIT}.webm`;
  copyFileSync(join(RAW, videoFile), join(OUT, named));
  rmSync(join(RAW, videoFile)); // the randomly-named recording is an intermediate
  console.log(`video  ${named}`);
}

// The labelled strip: frames in order, each caption BENEATH its frame.
const dataUri = (name) =>
  `data:image/png;base64,${readFileSync(join(RAW, name)).toString("base64")}`;
const html = `<!doctype html><meta charset="utf-8"><style>
  body { font: 15px/1.5 system-ui, sans-serif; background: #ffffff; color: #12182B; margin: 32px; max-width: 1360px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .meta { color: #2A3250; margin-bottom: 24px; }
  figure { margin: 0 0 28px; }
  img { width: 100%; border: 1px solid #8A8E9C; border-radius: 6px; display: block; }
  figcaption { margin-top: 8px; color: #12182B; }
</style>
<h1>E-P1 — Browser Back and Forward with unsaved edits (B-15)</h1>
<p class="meta">Implementation commit ${COMMIT} · kkl-web, claude/phase-2-frontend · captured ${new Date().toISOString().slice(0, 10)} against <code>next build</code> + <code>next start</code> · frames are unaltered viewport captures; captions sit beneath them</p>
${frames.map((f) => `<figure><img src="${dataUri(f.name)}" alt=""><figcaption>${f.caption}</figcaption></figure>`).join("\n")}`;
const sheetPath = join(RAW, "strip.html");
writeFileSync(sheetPath, html);
const sheet = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const sheetPage = await sheet.newPage();
await sheetPage.goto(`file:///${sheetPath.replace(/\\/g, "/")}`);
const stripName = `e-p1-frame-strip-${COMMIT}.png`;
await sheetPage.screenshot({ path: join(OUT, stripName), fullPage: true });
await sheet.close();
rmSync(sheetPath); // the contact-sheet HTML is an intermediate; the PNG is the artifact
console.log(`strip  ${stripName}`);

await browser.close();
console.log(`\nE-P1 evidence complete at implementation commit ${COMMIT}.`);
console.log("The exception stays OPEN: this records the behaviour; it does not accept it.");
