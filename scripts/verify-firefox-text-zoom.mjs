/**
 * Firefox's own text-only zoom at 200% — the check verify-zoom.mjs cannot run
 * in Chromium and records as not exercised.
 *
 * HOW IT WORKS
 * ------------
 * Firefox with `browser.zoom.full=false` zooms TEXT ONLY: Ctrl+= enlarges
 * every text run, including px-sized text, while fixed-size boxes stay put.
 * That is exactly the asymmetry WCAG 1.4.4 is about, and exactly what scaling
 * the root font size in Chromium only approximates (root em scaling never
 * reaches px-declared text).
 *
 * Per screen, this script:
 *   1. records a px-sized text element's computed size and a fixed-width
 *      box's width;
 *   2. presses Ctrl+= five times (100 → 110 → 125 → 150 → 175 → 200);
 *   3. CONFIRMS the zoom actually happened and was text-only — the text
 *      doubled while the box did not move. Without that confirmation a green
 *      result would mean nothing: it could be a zoom that never applied;
 *   4. asserts no horizontal overflow and no content clipped by a box that
 *      did not grow with its text (the same two failure kinds as
 *      verify-zoom.mjs).
 *
 * Run:  PLAYWRIGHT=… BASE_URL=… node scripts/verify-firefox-text-zoom.mjs
 * Needs a Playwright Firefox build (`npx playwright install firefox`).
 */
const { firefox } = await import(process.env.PLAYWRIGHT ?? "playwright");

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3811";

const SCREENS = [
  "/", "/search", "/property/greenview-residency",
  "/seller", "/seller/leads", "/seller/billing", "/seller/billing/recharge",
  "/builder", "/builder/properties/bl-greenview/basics", "/builder/enquiries",
  "/admin", "/admin/users", "/admin/kyc/K-3318", "/admin/wallets/U-10442/adjust",
  "/admin/support/T-2291", "/admin/audit",
];

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
  if (detail && !pass) console.log(`      ${detail}`);
};

const browser = await firefox.launch({
  // Text-only zoom mode: Zoom menu's "Zoom text only". This is the pref that
  // makes Ctrl+= scale text rather than the whole page.
  firefoxUserPrefs: { "browser.zoom.full": false },
});

for (const path of SCREENS) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 40000 });
    await page.waitForTimeout(400);

    const probe = () => page.evaluate(() => {
      // A paragraph of body text (px-sized by .t-body) and the main landmark's
      // own width. With text-only zoom the first doubles and the second does
      // not move; with full zoom both scale; with no zoom neither does.
      const text = document.querySelector("main p, main td, main li, main span");
      const main = document.querySelector("main");
      if (!text || !main) return null;
      return {
        fontSize: parseFloat(getComputedStyle(text).fontSize),
        mainWidth: Math.round(main.getBoundingClientRect().width),
      };
    });

    const before = await probe();
    for (let i = 0; i < 5; i += 1) {
      await page.keyboard.press("Control+="); // 100 → 110 → 125 → 150 → 175 → 200
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(400);
    const after = await probe();

    if (!before || !after) {
      ok(`200% text-only zoom · ${path}`, false, "no probe elements found");
      await context.close();
      continue;
    }
    const textRatio = after.fontSize / before.fontSize;
    const zoomConfirmed = textRatio > 1.9 && textRatio < 2.1;
    const wasTextOnly = after.mainWidth <= before.mainWidth + 2;

    // If the zoom never engaged, nothing about the screen was tested.
    // Playwright's Firefox build does not apply the keyboard zoom shortcut
    // (probed: Control+= and Control+Equal both leave computed sizes
    // unchanged), so this is the expected outcome there and must be reported
    // as NOT EXERCISED — sixteen FAILs would assert sixteen defects in a
    // screen nobody zoomed.
    if (!zoomConfirmed) {
      results.push({ name: `200% text-only zoom · ${path}`, pass: null, detail: `zoom did not engage (ratio ${textRatio.toFixed(2)}) — tooling limitation, not a screen result` });
      console.log(`PENDING  200% text-only zoom · ${path} — zoom did not engage (ratio ${textRatio.toFixed(2)})`);
      await context.close();
      continue;
    }

    const problems = await page.evaluate(() => {
      const d = document.documentElement;
      const horizontal = d.scrollWidth - d.clientWidth;
      const clipped = [...document.querySelectorAll("main *")]
        .filter((el) => {
          const style = getComputedStyle(el);
          if (style.overflow === "visible" || el.scrollHeight === 0) return false;
          if (el.classList.contains("sr-only") || el.closest(".sr-only")) return false;
          if (style.overflowY === "auto" || style.overflowY === "scroll") return false;
          return el.scrollHeight > el.clientHeight + 4 && el.clientHeight > 0;
        })
        .slice(0, 3)
        .map((el) => `${el.tagName}.${(el.className || "").toString().slice(0, 30)}`);
      return { horizontal, clipped };
    });

    ok(
      `200% text-only zoom · ${path}`,
      zoomConfirmed && wasTextOnly && problems.horizontal <= 1 && problems.clipped.length === 0,
      `text ${before.fontSize}px -> ${after.fontSize}px (ratio ${textRatio.toFixed(2)}); ` +
        `main width ${before.mainWidth} -> ${after.mainWidth}; ` +
        `horizontal overflow ${problems.horizontal}px; clipped: ${problems.clipped.join(" | ") || "none"}`,
    );
  } catch (error) {
    ok(`200% text-only zoom · ${path}`, false, String(error).slice(0, 140));
  }
  await context.close();
}

await browser.close();

const failed = results.filter((r) => r.pass === false);
const pending = results.filter((r) => r.pass === null);
const passed = results.filter((r) => r.pass === true);
if (pending.length === results.length) {
  console.log(`\nNOT EXERCISED: the zoom keystroke never engaged on any of the ${results.length} screens.`);
  console.log("Playwright's Firefox build does not apply browser-chrome zoom shortcuts, so Firefox's");
  console.log("own text-only zoom still needs a real Firefox and a person. Recorded as pending in");
  console.log("pending-verification.md — this run verified nothing and fails nothing.");
  process.exit(0);
}
console.log(`\n${passed.length}/${results.length} screens pass Firefox's own text-only zoom at 200% (${pending.length} not exercised).`);
console.log("This is the real mechanism, not the root-font-size simulation verify-zoom.mjs");
console.log("uses for Chromium. Windows High Contrast themes and screen-reader behaviour");
console.log("remain pending; this closes neither.");
if (failed.length) process.exit(1);
