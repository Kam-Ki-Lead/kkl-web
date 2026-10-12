/**
 * The review sign-in shortcut, against a server shaped like staging.
 *
 * The gate is unit-tested exhaustively. This is the half a unit test cannot
 * see: that on a server doing real sign-in through kkl-backend, the number
 * signs in WITHOUT the backend being involved at all — and that the same
 * server with the opt-in removed refuses it and falls through to the real
 * code path.
 *
 * Point it at a backend that does not exist. That is the point: if the
 * shortcut ever started depending on the API, this check would hang or error
 * instead of signing in, which is exactly the regression worth catching.
 *
 *   KKL_ENV=review KKL_DATA_SOURCE=sample KKL_AUTH=backend \
 *   KKL_BACKEND_BASE_URL=http://127.0.0.1:1 KKL_DEMO_SIGNIN=on \
 *     npx next start -p 3826
 *   KKL_BASE_URL=http://127.0.0.1:3826 KKL_EXPECT=on \
 *     PLAYWRIGHT=./node_modules/playwright-core node scripts/verify-demo-signin-gate.mjs
 *
 * Signs in only as the review number, which is synthetic, and touches no
 * deployed environment.
 */
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT ?? "playwright");
const B = process.env.KKL_BASE_URL ?? "http://127.0.0.1:3826";
const CHROME = process.env.KKL_CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
/** "on" when this server opted in, "off" when it did not. */
const EXPECT = process.env.KKL_EXPECT === "on" ? "on" : "off";
const DEMO = "8971741611";

const checks = [];
const is = (n, a, e) =>
  checks.push(`${a === e ? "PASS" : "FAIL"}  ${n} — ${JSON.stringify(a)}${a === e ? "" : ` (expected ${JSON.stringify(e)})`}`);
const info = (d) => checks.push(`INFO  ${d}`);

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

await page.goto(`${B}/auth`, { waitUntil: "networkidle" });
is(
  `the shortcut is ${EXPECT === "on" ? "announced" : "not announced"} on this server`,
  await page.evaluate((n) => document.body.innerText.includes(n), DEMO),
  EXPECT === "on",
);

const started = Date.now();
await page.fill('input[name="mobile"]', DEMO);
await page.locator('button[type="submit"]').first().click();

if (EXPECT === "on") {
  await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 20000 });
  const took = Date.now() - started;
  is("the number signs in with no code step", page.url().includes("/auth"), false);
  // The backend address points at a closed port. Reaching it would time out;
  // this returns immediately, which is the evidence that it was never called.
  is("without waiting on the backend it was never going to reach", took < 6000, true);
  info(`signed in in ${took}ms, landed on ${new URL(page.url()).pathname}`);

  const cookie = (await ctx.cookies()).find((c) => c.name === "kkl_demo_session");
  is("a demo session exists", Boolean(cookie), true);
  is("it is httpOnly", cookie?.httpOnly, true);
  is("and carries no token, only the number it stands for", cookie?.value, DEMO);
  is(
    "no access or refresh token was written",
    (await ctx.cookies()).some((c) => /access|refresh/i.test(c.name)),
    false,
  );

  await page.goto(B, { waitUntil: "networkidle" });
  is(
    "the header reflects the session",
    /My account/.test(await page.evaluate(() => document.querySelector("header").innerText)),
    true,
  );
} else {
  // The opt-in is absent, so this server must treat the number like any other
  // and go to the real code path — which here cannot send a code, and says so.
  await page.waitForTimeout(4000);
  is("the number does not sign in", page.url().includes("/auth"), true);
  is(
    "no demo session was written",
    (await ctx.cookies()).some((c) => c.name === "kkl_demo_session"),
    false,
  );
  const text = await page.evaluate(() => document.body.innerText);
  is(
    "and the page says why, rather than appearing to work",
    /code|provider|try again/i.test(text),
    true,
  );
  info(`refused on ${new URL(page.url()).pathname}`);
}

await browser.close();

const failed = checks.filter((c) => c.startsWith("FAIL"));
console.log(checks.join("\n"));
const total = checks.filter((c) => !c.startsWith("INFO")).length;
console.log(`\n${total - failed.length}/${total} checks passed (opt-in ${EXPECT})`);
process.exit(failed.length === 0 ? 0 : 1);
