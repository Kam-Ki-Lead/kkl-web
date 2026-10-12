/**
 * Two things, in a browser.
 *
 * The search page's filter row, which is now the same bar as the homepage's —
 * same chrome, same dropdowns, same five fields. The check compares the two
 * bars' computed geometry rather than their class names, because "they look
 * alike" is the claim and class names are not evidence of it.
 *
 * And the review sign-in shortcut: that one number signs in in one step, with
 * no code, and that the session it leaves is real enough for the header to
 * change. The gate around it is unit-tested; this is the half a unit test
 * cannot see.
 *
 * Reads a locally served build. Signs in only as the review number, which is
 * synthetic, and touches no deployed environment.
 *
 *   KKL_ENV=development KKL_DATA_SOURCE=sample npx next start -p 3814
 *   PLAYWRIGHT=./node_modules/playwright-core node scripts/verify-search-bar-and-demo.mjs
 */
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT ?? "playwright");
const OUT = process.argv[2] ?? null;
const B = process.env.KKL_BASE_URL ?? "http://127.0.0.1:3814";
const CHROME = process.env.KKL_CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const DEMO = "8971741611";

const checks = [];
const is = (n, a, e) =>
  checks.push(`${a === e ? "PASS" : "FAIL"}  ${n} — ${JSON.stringify(a)}${a === e ? "" : ` (expected ${JSON.stringify(e)})`}`);
const info = (d) => checks.push(`INFO  ${d}`);

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

/** The bar's shape, read off whatever is rendered. */
const measure = () => {
  const bar = document.querySelector('form[action="/search"]')
    ?? [...document.querySelectorAll("div")].find(
      (d) => d.querySelector('[role="combobox"]') && getComputedStyle(d).borderTopLeftRadius === "999px",
    );
  if (!bar) return null;
  const s = getComputedStyle(bar);
  const fields = [...bar.children].filter((c) => c.querySelector("[role=combobox], input, button"));
  return {
    radius: s.borderTopLeftRadius,
    padding: s.paddingTop,
    background: s.backgroundColor,
    shadow: s.boxShadow,
    comboboxes: bar.querySelectorAll('[role="combobox"]').length,
    // The field's own label, which is its first span — not every span whose
    // text happens to match, because an unset dropdown's VALUE reads the same
    // as its label ("Buy or rent") and was counted twice.
    labels: fields.map((f) => f.querySelector("span")?.textContent.trim() ?? ""),
    dividers: fields.filter((f) => getComputedStyle(f).borderRightWidth !== "0px").length,
    fieldWidths: fields.map((f) => Math.round(f.getBoundingClientRect().width)),
  };
};

/* -- 1. the two bars are the same bar ------------------------------------ */

await page.goto(B, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const home = await page.evaluate(measure);

await page.goto(`${B}/search`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const search = await page.evaluate(measure);

is("the homepage bar was found", Boolean(home), true);
is("the search bar was found", Boolean(search), true);
is("same corner radius", search.radius, home.radius);
is("same inner padding", search.padding, home.padding);
is("same surface", search.background, home.background);
is("same lift", search.shadow, home.shadow);
is("five dropdowns, as on the homepage", search.comboboxes, 5);
is(
  "with the page's own field labels",
  search.labels.join(" | "),
  "Location | Buy or rent | Property type | BHK | Budget",
);
is("four dividers between five fields", search.dividers, 4);
// Within a pixel: five flex children of a fractional width do not land on
// the same integer, and a check that demands they do fails on arithmetic.
is(
  "and the fields are equal width",
  Math.max(...search.fieldWidths) - Math.min(...search.fieldWidths) <= 1,
  true,
);
info(`home ${home.radius} / ${home.shadow.slice(0, 32)}…`);
info(`search fields ${search.fieldWidths.join(", ")}`);

/* -- 2. the panels open downward, not off the top ------------------------ */

const trigger = page.locator('[role="combobox"]').nth(1);
await trigger.click();
await page.waitForTimeout(250);
const panel = await page.evaluate(() => {
  const open = document.querySelector('[role="listbox"]');
  if (!open) return null;
  const box = open.getBoundingClientRect();
  const owner = open.closest("div").parentElement.getBoundingClientRect();
  return { below: box.top >= owner.top, onScreen: box.top >= 0 && box.bottom <= window.innerHeight + 400 };
});
is("a panel opens", Boolean(panel), true);
is("downward, because this bar sits at the top of the page", panel.below, true);
is("and is on screen", panel.onScreen, true);
await page.keyboard.press("Escape");

/* -- 3. choosing a value still filters ----------------------------------- */

await page.goto(`${B}/search`, { waitUntil: "networkidle" });
const before = await page.textContent("h1");
await page.locator('[role="combobox"]').nth(1).click();
await page.waitForTimeout(200);
await page.locator('[role="option"]', { hasText: /^Rent$/ }).first().click();
await page.waitForURL(/transaction=rent/, { timeout: 15000 });
await page.waitForLoadState("networkidle");
is("a choice reaches the URL", page.url().includes("transaction=rent"), true);
is(
  "and the bar shows it",
  (await page.locator('[role="combobox"]').nth(1).textContent()).trim(),
  "Rent",
);
is(
  "and it is listed as applied, removably",
  await page.evaluate(() => /To rent/.test(document.body.innerText)),
  true,
);
info(`heading before: ${before?.trim()}`);
if (OUT) await page.screenshot({ path: `${OUT}/search-bar-1440.png`, clip: { x: 0, y: 0, width: 1440, height: 520 } });

/* -- 4. an unknown value is shown, not silently read as unset ------------ */

await page.goto(`${B}/search?type=project`, { waitUntil: "networkidle" });
await page.waitForTimeout(300);
const unknown = await page.evaluate(() => {
  const triggers = [...document.querySelectorAll('[role="combobox"]')];
  return {
    type: triggers[2]?.textContent.trim() ?? null,
    chip: /project/.test(document.body.innerText),
  };
});
is("the type field shows the value the URL carries", unknown.type, "project");
is("and the applied chip agrees with it", unknown.chip, true);

/* -- 5. the review sign-in ----------------------------------------------- */

await page.goto(`${B}/auth`, { waitUntil: "networkidle" });
is(
  "the review shortcut is announced on a sample server",
  await page.evaluate((n) => document.body.innerText.includes(n), DEMO),
  true,
);

const signedInBefore = await page.evaluate(() =>
  /Sign in/.test(document.querySelector("header").innerText));
is("nobody is signed in to start with", signedInBefore, true);

await page.fill('input[name="mobile"]', DEMO);
await page.locator('button[type="submit"]').first().click();
await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 20000 });
await page.waitForLoadState("networkidle");
is("the number signs in with no code step", page.url().includes("/auth"), false);
// The public site, not /account: a demo session holds no backend token, so an
// account screen would refuse the read and bounce straight back to sign-in.
is("and lands on the public site", new URL(page.url()).pathname, "/");
info(`landed on ${new URL(page.url()).pathname}`);

await page.goto(B, { waitUntil: "networkidle" });
const header = await page.evaluate(() => document.querySelector("header").innerText);
is("and the header stops offering sign-in", /Sign in\b/.test(header), false);

// The cookie is a marker, not a credential.
const cookies = await ctx.cookies();
const demo = cookies.find((c) => c.name === "kkl_demo_session");
is("the session cookie is the demo one", Boolean(demo), true);
is("it is httpOnly", demo?.httpOnly, true);
is("it carries no token, only the number it stands for", demo?.value, DEMO);
is(
  "and no access or refresh token was written",
  cookies.some((c) => /access|refresh/i.test(c.name)),
  false,
);

/* -- 6. any other number still goes to the code step --------------------- */

const other = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const fresh = await other.newPage();
await fresh.goto(`${B}/auth`, { waitUntil: "networkidle" });
await fresh.fill('input[name="mobile"]', "9876543210");
await fresh.locator('button[type="submit"]').first().click();
await fresh.waitForTimeout(1200);
is(
  "another number still has to enter a code",
  await fresh.evaluate(() => Boolean(document.querySelector('input[name="code"]'))),
  true,
);
is(
  "and is not signed in by asking",
  (await other.cookies()).some((c) => c.name === "kkl_demo_session"),
  false,
);
await other.close();

await browser.close();

/* ------------------------------------------------------------- report --- */
const failed = checks.filter((c) => c.startsWith("FAIL"));
console.log(checks.join("\n"));
const total = checks.filter((c) => !c.startsWith("INFO")).length;
console.log(`\n${total - failed.length}/${total} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
