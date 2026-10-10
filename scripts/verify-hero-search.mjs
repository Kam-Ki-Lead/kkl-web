/**
 * The hero's glass pill bar, in a browser.
 *
 * Two things it is here to catch. First, that the hero image is still the
 * application's own and not the reference's placeholder — the brief's first
 * constraint, and the easiest to break while restyling the thing next to it.
 * Second, that the custom range refuses the same input the server refuses:
 * the inline message and the 400 come from two implementations of one set of
 * rules, and they are only worth having if they agree.
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
const FORM = 'form[action="/search"]';
const browser = await chromium.launch({ executablePath: process.env.KKL_CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const checks = [];
const is = (n, a, e) => checks.push(`${a === e ? "PASS" : "FAIL"}  ${n} — ${JSON.stringify(a)}${a === e ? "" : ` (expected ${JSON.stringify(e)})`}`);

const ctx = await browser.newContext({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto(B, { waitUntil: "networkidle" });

const img = await page.$eval("section img", (el) => el.getAttribute("src") ?? "");
is("the hero still renders its own image", img.length > 0 && !img.includes("/images/hero.jpg"), true);
checks.push(`INFO  hero image src — ${img.slice(0, 90)}`);
is("five fields in the bar", await page.locator(`${FORM} > div`).count(), 5);
is("the button shows a live count", /Search \d+/.test(await page.textContent(`${FORM} button[type=submit]`)), true);

if (OUT) await page.locator(FORM).screenshot({ path: `${OUT}/hero-bar-desktop.png` });
if (OUT) await page.screenshot({ path: `${OUT}/hero-full-desktop.png`, clip: { x: 0, y: 0, width: 1440, height: 620 } });

await page.selectOption("select[name=qty]", "custom");
await page.waitForTimeout(250);
is("the popover opens", await page.locator('[role=group][aria-label="Custom lead quantity"]').count(), 1);
is("focus moves to Min", await page.evaluate(() => document.activeElement?.getAttribute("name")), "qtyMin");
await page.fill("input[name=qtyMin]", "900");
await page.fill("input[name=qtyMax]", "100");
await page.waitForTimeout(400);
is("min>max shows the error", (await page.textContent("[role=group] p")).trim(), "Min cannot be more than max.");
is("and marks the inputs invalid", await page.getAttribute("input[name=qtyMin]", "aria-invalid"), "true");
const before = await page.textContent(`${FORM} button[type=submit]`);
await page.fill("input[name=qtyMax]", "abc");
await page.waitForTimeout(400);
is("a non-number shows its own error", (await page.textContent("[role=group] p")).trim(), "Use whole numbers only.");
is("no request is sent while invalid", await page.textContent(`${FORM} button[type=submit]`), before);
if (OUT) await page.locator(FORM).screenshot({ path: `${OUT}/hero-bar-custom.png` });

await page.fill("input[name=qtyMin]", "1");
await page.fill("input[name=qtyMax]", "");
await page.waitForTimeout(600);
is("a valid range refreshes the count", /Search \d+/.test(await page.textContent(`${FORM} button[type=submit]`)), true);
await page.click(`${FORM} button[type=submit]`);
await page.waitForURL(/\/search\?/, { timeout: 5000 });
is("only fields with a value are sent", new URL(page.url()).search, "?qty=custom&qtyMin=1");
await ctx.close();

const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const small = await phone.newPage();
await small.goto(B, { waitUntil: "networkidle" });
is("the bar stacks on a phone", await small.$eval(FORM, (el) => getComputedStyle(el).flexDirection), "column");
is("the button is a full-width block", await small.$eval(`${FORM} button[type=submit]`, (el) => el.getBoundingClientRect().height >= 44), true);
is("every select clears 44px", await small.$$eval(`${FORM} select`, (els) => els.every((e) => e.getBoundingClientRect().height >= 44)), true);
if (OUT) await small.locator(FORM).screenshot({ path: `${OUT}/hero-bar-phone.png` });
await phone.close();

await browser.close();
console.log(checks.join("\n"));
const pass = checks.filter((c) => c.startsWith("PASS")).length;
const total = checks.filter((c) => !c.startsWith("INFO")).length;
console.log(`\n${pass}/${total} checks passed`);

process.exit(checks.some((c) => c.startsWith("FAIL")) ? 1 : 0);
