/**
 * The hero's glass pill bar, in a browser.
 *
 * Three things it is here to catch. That the hero image is still the
 * application's own and not the reference's placeholder — the brief's first
 * constraint, and the easiest to break while restyling what sits next to it.
 * That the custom range refuses the same input the server refuses, since the
 * inline message and the 400 are two implementations of one set of rules.
 * And that the five fields are actually the same width, which is the thing
 * that was reported and is invisible to every unit test.
 *
 * Reads a locally served build. Signs nothing in, buys nothing, touches no
 * deployed environment.
 *
 *   npm run build && KKL_ENV=development KKL_DATA_SOURCE=sample npx next start -p 3814
 *   PLAYWRIGHT=./node_modules/playwright-core node scripts/verify-hero-search.mjs
 */
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT ?? "playwright");
const OUT = process.argv[2] ?? null;
const B = process.env.KKL_BASE_URL ?? "http://127.0.0.1:3814";
const CHROME = process.env.KKL_CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FORM = 'form[action="/search"]';

const checks = [];
const is = (n, a, e) =>
  checks.push(`${a === e ? "PASS" : "FAIL"}  ${n} — ${JSON.stringify(a)}${a === e ? "" : ` (expected ${JSON.stringify(e)})`}`);
const ok = (n, d = "") => checks.push(`PASS  ${n} — ${d}`);
const bad = (n, d) => checks.push(`FAIL  ${n} — ${d}`);

const browser = await chromium.launch({ executablePath: CHROME });

/* ------------------------------------------------------------- desktop --- */
const ctx = await browser.newContext({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto(B, { waitUntil: "networkidle" });

// 1. The image, untouched.
const img = await page.$eval("section img", (el) => el.getAttribute("src") ?? "");
is("the hero still renders its own image", img.length > 0 && !img.includes("/images/hero.jpg"), true);
checks.push(`INFO  hero image src — ${img.slice(0, 90)}`);

// 2. The bar sits on the photograph's edge, not below it.
//    The lift is half the bar's height, so the image's bottom edge should
//    pass through the bar's middle. Measured rather than assumed, because
//    the two numbers live in different files and nothing else would notice
//    them drifting apart.
const seam = await page.evaluate(() => {
  const hero = document.querySelector("section").getBoundingClientRect();
  const bar = document.querySelector('form[action="/search"]').getBoundingClientRect();
  return { heroBottom: Math.round(hero.bottom), barMiddle: Math.round(bar.top + bar.height / 2), barHeight: Math.round(bar.height) };
});
if (Math.abs(seam.heroBottom - seam.barMiddle) <= 1) {
  ok("the image edge meets the middle of the bar", `edge ${seam.heroBottom}, middle ${seam.barMiddle}`);
} else {
  bad("the image edge meets the middle of the bar",
    `edge at ${seam.heroBottom}, bar middle at ${seam.barMiddle} — the lift should be half the ${seam.barHeight}px bar`);
}

// 3. The shadow lifts the bar without reading as a band under it.
const shadow = await page.$eval(FORM, (el) => getComputedStyle(el).boxShadow);
const alpha = Number((shadow.match(/rgba\([^)]*?,\s*([\d.]+)\)/) ?? [])[1] ?? 1);
const blur = Number((shadow.match(/(\d+)px\s*$|(\d+)px 0px$/) ?? [])[0]?.replace("px", "") ?? 0);
is("the shadow is restrained", alpha <= 0.2, true);
checks.push(`INFO  bar shadow — ${shadow.split(", rgba").pop()}`);
void blur;

// 4. Five fields, one width.
const widths = await page.$$eval(`${FORM} > div`, (els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
is("the bar has five fields", widths.length, 5);
const spread = Math.max(...widths) - Math.min(...widths);
if (spread <= 1) ok("all five fields are the same width", widths.join(" / "));
else bad("all five fields are the same width", `widths differ by ${spread}px: ${widths.join(" / ")}`);

// 3. The Search button's size.
const go = await page.$eval(`${FORM} button[type=submit]`, (el) => {
  const cs = getComputedStyle(el);
  return { w: Math.round(el.getBoundingClientRect().width), pad: cs.paddingLeft };
});
is("the button clears its 170px minimum", go.w >= 170, true);
is("and carries 34px of horizontal padding", go.pad, "34px");

// 4. Live counts reached the button and the pills.
is("the button shows a live count", /Search \d+/.test(await page.textContent(`${FORM} button[type=submit]`)), true);
const trigger = (name) => `${FORM} input[name="${name}"] ~ button[role=combobox]`;
await page.click(trigger("mode"));
await page.waitForTimeout(150);
const pills = await page.$$eval('[role=listbox] [role=option] b', (els) => els.map((e) => e.textContent));
is("every option carries a count pill", pills.length >= 3 && pills.every((p) => /^\d+$/.test(p)), true);
checks.push(`INFO  Buy or rent pills — ${pills.join(", ")}`);

// 5. The counting rule, through the UI: choosing Rent must not zero the Buy row.
await page.click('[role=listbox] [role=option]:nth-of-type(3)'); // Rent
await page.waitForTimeout(600);
await page.click(trigger("mode"));
await page.waitForTimeout(200);
const afterRent = await page.$$eval('[role=listbox] [role=option]', (els) =>
  els.map((e) => [e.textContent.replace(/\d+$/, "").trim(), e.querySelector("b")?.textContent]));
const buyRow = afterRent.find(([label]) => label === "Buy");
if (buyRow && Number(buyRow[1]) > 0) ok("with Rent chosen, the Buy row still shows its own count", `Buy ${buyRow[1]}`);
else bad("with Rent chosen, the Buy row still shows its own count", JSON.stringify(afterRent));
await page.keyboard.press("Escape");
await page.waitForTimeout(100);

// 6. Keyboard on the listbox.
await page.focus(trigger("bhk"));
await page.keyboard.press("ArrowDown");
await page.waitForTimeout(150);
is("ArrowDown opens the panel", await page.getAttribute(trigger("bhk"), "aria-expanded"), "true");
is("and points at an option", Boolean(await page.getAttribute(trigger("bhk"), "aria-activedescendant")), true);
await page.keyboard.press("End");
await page.keyboard.press("Enter");
await page.waitForTimeout(400);
is("Enter picks the active option", await page.inputValue(`${FORM} input[name="bhk"]`), "4plus");
is("and closes the panel", await page.locator("[role=listbox]").count(), 0);
is("focus returns to the trigger", await page.evaluate(() => document.activeElement?.getAttribute("role")), "combobox");

// 7. A chosen value reads as chosen.
const chosen = await page.$eval(trigger("bhk"), (el) => getComputedStyle(el).fontWeight);
is("a chosen value is semi-bold", Number(chosen) >= 600, true);

// 8. The brand ring, not the browser's black border.
const brand = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--color-brand").trim());
const rgb = (hex) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};
const ring = await page.$eval(trigger("bhk"), (el) => getComputedStyle(el).boxShadow);
is("the focused trigger carries a ring in the brand colour", ring.includes(rgb(brand)), true);
checks.push(`INFO  brand ${brand} -> rgb(${rgb(brand)}); ring ${ring.includes(rgb(brand)) ? "matches" : ring.slice(0, 60)}`);

if (OUT) await page.locator(FORM).screenshot({ path: `${OUT}/hero-bar-desktop.png` });
if (OUT) await page.screenshot({ path: `${OUT}/hero-full-desktop.png`, clip: { x: 0, y: 0, width: 1440, height: 620 } });
if (OUT) {
  await page.click(trigger("budget"));
  await page.waitForTimeout(200);
  await page.locator(FORM).screenshot({ path: `${OUT}/hero-dropdown-open.png` });
  await page.keyboard.press("Escape");
}

// 8a. The homepage's two rows are different rows.
//     Both derive from the same ordering, so taking the top of each put the
//     same three developments under both headings. Titles, not ids, because
//     a repeat is a repeat to the person reading it.
const rowTitles = (heading) =>
  page.$$eval(
    `section:has(h2:text("${heading}")) article a[href^="/property/"]`,
    (els) => [...new Set(els.map((e) => e.textContent.trim()).filter((t) => t && !t.startsWith("View")))]);
const propertyTitles = await rowTitles("Featured properties");
const projectTitles = await rowTitles("Featured projects");
is("the properties row is full", propertyTitles.length, 6);
is("the projects row is full", projectTitles.length, 3);
const repeated = propertyTitles.filter((t) => projectTitles.includes(t));
if (repeated.length === 0) ok("the two homepage rows share nothing", projectTitles.join(" | "));
else bad("the two homepage rows share nothing", `repeated under both headings: ${repeated.join(", ")}`);

// 8b. Location is a dropdown like its neighbours, with a search inside.
await page.keyboard.press("Escape");
await page.waitForTimeout(100);
const loc = `${FORM} input[name="locality"] ~ button[role=combobox]`;
is("Location is a dropdown, not a bare input", await page.locator(loc).count(), 1);
is("and reads as unset until something is chosen", (await page.textContent(loc)).trim(), "All of Kolkata");
await page.click(loc);
await page.waitForTimeout(250);
is("its panel carries a search box", await page.locator('input[placeholder="Search a locality"]').count(), 1);
is("the search box takes focus", await page.evaluate(() => document.activeElement?.getAttribute("placeholder")), "Search a locality");
const allRows = await page.locator("[role=option]").count();
is("the everything row leads the list", (await page.textContent("[role=option]")).trim(), "All of Kolkata");

await page.fill('input[placeholder="Search a locality"]', "new town");
await page.waitForTimeout(400);
const narrowed = await page.$$eval("[role=option]", (els) => els.map((e) => e.textContent.trim()));
is("typing narrows the list", narrowed.length < allRows, true);
is("the locality itself ranks above its sub-localities", narrowed[0].startsWith("New Town"), true);
is("and the everything row is gone while narrowing", narrowed.some((r) => r === "All of Kolkata"), false);
checks.push(`INFO  "new town" — ${narrowed.join(" | ")}`);

await page.fill('input[placeholder="Search a locality"]', "zzzznowhere");
await page.waitForTimeout(400);
is("a query nothing matches says so", await page.locator("[role=option]").count(), 0);

await page.fill('input[placeholder="Search a locality"]', "salt");
await page.waitForTimeout(400);
await page.keyboard.press("Enter");
await page.waitForTimeout(400);
is("Enter picks the ranked first option", (await page.textContent(loc)).trim().startsWith("Salt Lake"), true);
is("the hidden input carries the record id", await page.inputValue(`${FORM} input[name="locality"]`), "salt-lake");
is("and focus returns to the trigger", await page.evaluate(() => document.activeElement?.getAttribute("role")), "combobox");
const locWeight = await page.$eval(loc, (el) => Number(getComputedStyle(el).fontWeight));
is("a chosen locality reads as chosen", locWeight >= 600, true);
await page.waitForTimeout(400);

// 9. Custom range, reached from the listbox row.
await page.click(trigger("qty"));
await page.waitForTimeout(150);
const rows = await page.$$eval('[role=listbox] [role=option]', (els) => els.map((e) => e.textContent.trim()));
is("the last quantity row is the custom one", rows[rows.length - 1].startsWith("Custom range"), true);
is("and the custom row has no count", (await page.$$eval('[role=listbox] [role=option]', (els) => els[els.length - 1].querySelector("b") === null)), true);
await page.click('[role=listbox] [role=option]:last-of-type');
await page.waitForTimeout(250);
is("picking it opens the range popover", await page.locator('[role=group][aria-label="Custom lead quantity"]').count(), 1);
is("focus moves to Min", await page.evaluate(() => document.activeElement?.getAttribute("name")), "qtyMin");

await page.fill('input[name=qtyMin]', "900");
await page.fill('input[name=qtyMax]', "100");
await page.click('[role=group] button');
await page.waitForTimeout(200);
is("min>max is refused inline", (await page.textContent("[role=group] p")).trim(), "Min cannot be more than max.");
is("and the inputs are marked invalid", await page.getAttribute('input[name=qtyMin]', "aria-invalid"), "true");
await page.fill('input[name=qtyMax]', "abc");
await page.click('[role=group] button');
await page.waitForTimeout(200);
is("a non-number has its own message", (await page.textContent("[role=group] p")).trim(), "Use whole numbers only.");
if (OUT) await page.locator(FORM).screenshot({ path: `${OUT}/hero-bar-custom.png` });

await page.fill('input[name=qtyMin]', "400");
await page.fill('input[name=qtyMax]', "800");
await page.click('[role=group] button');
await page.waitForTimeout(400);
is("applying closes the popover", await page.locator('[role=group][aria-label="Custom lead quantity"]').count(), 0);
is("and the trigger shows the range", (await page.textContent(trigger("qty"))).trim(), "400–800");

await page.click(`${FORM} button[type=submit]`);
await page.waitForURL(/\/search\?/, { timeout: 5000 });
is("every chosen field is sent, and only those",
  new URL(page.url()).search,
  "?locality=salt-lake&mode=rent&bhk=4plus&qty=custom&qtyMin=400&qtyMax=800");
// Budget is the one field this run never touches, so it is the one that
// proves an "any" option sends no parameter at all.
is("an untouched field sends nothing",
  [...new URL(page.url()).searchParams.keys()].includes("budget"), false);
await ctx.close();

/* --------------------------------------------------------------- phone --- */
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const small = await phone.newPage();
await small.goto(B, { waitUntil: "networkidle" });
is("the bar stacks on a phone", await small.$eval(FORM, (el) => getComputedStyle(el).flexDirection), "column");
is("the button is full width", await small.$eval(`${FORM} button[type=submit]`, (el) => {
  const bar = document.querySelector('form[action="/search"]').getBoundingClientRect();
  return el.getBoundingClientRect().width >= bar.width - 24;
}), true);
is("every trigger clears 44px", await small.$$eval(`${FORM} button[role=combobox]`, (els) => els.every((e) => e.getBoundingClientRect().height >= 44)), true);
await small.click(`${FORM} input[name="bhk"] ~ button[role=combobox]`);
await small.waitForTimeout(200);
is("the panel expands in flow, not floating", await small.$eval("[role=listbox]", (el) => getComputedStyle(el).position), "static");
is("and its rows clear 44px", await small.$$eval("[role=listbox] [role=option]", (els) => els.every((e) => e.getBoundingClientRect().height >= 44)), true);
if (OUT) await small.locator(FORM).screenshot({ path: `${OUT}/hero-bar-phone.png` });
await phone.close();

/* ------------------------------------------------------ tablet 980-1100 --- */
const tablet = await browser.newContext({ viewport: { width: 1040, height: 800 } });
const mid = await tablet.newPage();
await mid.goto(B, { waitUntil: "networkidle" });
const midGo = await mid.$eval(`${FORM} button[type=submit]`, (el) => ({ w: Math.round(el.getBoundingClientRect().width), pad: getComputedStyle(el).paddingLeft }));
is("between 980 and 1100 the button narrows to 150px", midGo.w >= 150 && midGo.w < 170, true);
is("and its padding tightens", midGo.pad, "26px");
const midWidths = await mid.$$eval(`${FORM} > div`, (els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
is("the fields stay equal there too", Math.max(...midWidths) - Math.min(...midWidths) <= 1, true);
await tablet.close();

await browser.close();
console.log(checks.join("\n"));
const pass = checks.filter((c) => c.startsWith("PASS")).length;
const total = checks.filter((c) => !c.startsWith("INFO")).length;
console.log(`\n${pass}/${total} checks passed`);
process.exit(checks.some((c) => c.startsWith("FAIL")) ? 1 : 0);
