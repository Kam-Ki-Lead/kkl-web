/**
 * The review sign-in shortcut, against the servers that must refuse it.
 *
 * The gate is unit-tested exhaustively. This is the half a unit test cannot
 * see: whether the shortcut is *offered* and whether it *acts*, on a running
 * server shaped like the deployment in question.
 *
 * Three configurations, all local, none deployed:
 *
 *   off, not opted in — sign-in switched to kkl-backend, no KKL_DEMO_SIGNIN.
 *     The numbers must fall through to the real code path, which here cannot
 *     send a code and says so.
 *
 *       KKL_ENV=development KKL_DATA_SOURCE=sample KKL_AUTH=backend \
 *       KKL_BACKEND_BASE_URL=http://127.0.0.1:1 npx next start -p 3826
 *       KKL_BASE_URL=http://127.0.0.1:3826 KKL_EXPECT=off \
 *         PLAYWRIGHT=./node_modules/playwright-core node scripts/verify-demo-signin-gate.mjs
 *
 *   off, opted in — the same server with KKL_DEMO_SIGNIN=on. It must STILL
 *     refuse, because its console screens read the signed-in profile from the
 *     API and a review session carries no token for that read: pointed at one,
 *     they rendered a header, a footer and an empty middle. The opt-in cannot
 *     override that, and the page says which build does open them. Add
 *     KKL_OPTED=on so this run checks for that sentence.
 *
 *   on — a build serving sample fixtures, where the consoles do open.
 *
 *       KKL_ENV=development KKL_DATA_SOURCE=sample npx next start -p 3828
 *       KKL_BASE_URL=http://127.0.0.1:3828 KKL_EXPECT=on \
 *         PLAYWRIGHT=./node_modules/playwright-core node scripts/verify-demo-signin-gate.mjs
 *
 * The refusing servers point at a backend that does not exist. That is the
 * point: if the shortcut ever started depending on the API, this check would
 * hang or error instead of refusing cleanly.
 *
 * Signs in only as the review accounts, which are synthetic, and touches no
 * deployed environment. All four accounts are walked by
 * verify-demo-accounts.mjs.
 */
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT ?? "playwright");
const B = process.env.KKL_BASE_URL ?? "http://127.0.0.1:3826";
const CHROME = process.env.KKL_CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
/** "on" when the shortcut must work on this server, "off" when it must not. */
const EXPECT = process.env.KKL_EXPECT === "on" ? "on" : "off";
/** "on" when this server set KKL_DEMO_SIGNIN, which changes what "off" says. */
const OPTED = process.env.KKL_OPTED === "on";
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
  is("and lands on the Buyer's own console", new URL(page.url()).pathname, "/account");
  // Nothing was asked of any API, so this returns in milliseconds rather than
  // waiting on a request.
  is("without waiting on a backend at all", took < 6000, true);
  info(`signed in in ${took}ms, landed on ${new URL(page.url()).pathname}`);

  const cookie = (await ctx.cookies()).find((c) => c.name === "kkl_demo_session");
  is("a demo session exists", Boolean(cookie), true);
  is("it is httpOnly", cookie?.httpOnly, true);
  is("and carries no token, only the role it stands for", cookie?.value, "buyer");
  is(
    "no access or refresh token was written",
    (await ctx.cookies()).some((c) => /access|refresh/i.test(c.name)),
    false,
  );

  await page.goto(B, { waitUntil: "networkidle" });
  is(
    "the header reflects the session",
    /Buyer|My account/.test(await page.evaluate(() => document.querySelector("header").innerText)),
    true,
  );
} else {
  // This server must treat the number like any other and go to the real code
  // path — which here cannot send a code, and says so.
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
  if (OPTED) {
    // The opt-in IS set here, so somebody deliberately switched the shortcut
    // on and must be told why it is not there — not left guessing.
    is(
      "the page explains that the opt-in cannot open these consoles",
      /read from the API|sample fixtures/i.test(text),
      true,
    );
  }
  info(`refused on ${new URL(page.url()).pathname}${OPTED ? " (opted in)" : ""}`);
}

await browser.close();

const failed = checks.filter((c) => c.startsWith("FAIL"));
console.log(checks.join("\n"));
const total = checks.filter((c) => !c.startsWith("INFO")).length;
console.log(`\n${total - failed.length}/${total} checks passed (shortcut ${EXPECT}${OPTED ? ", opted in" : ""})`);
process.exit(failed.length === 0 ? 0 : 1);
