/**
 * Signing in with an email address and a password, in a browser.
 *
 * WHY IT MATTERS THAT THIS IS A BROWSER CHECK
 *
 * The thing being verified is not "does the API accept the password" — the
 * backend's own suite covers that. It is that the browser ends up holding a
 * REAL session: `kkl_access` and `kkl_refresh`, httpOnly, issued by
 * kkl-backend. A frontend cookie that merely looks signed-in is what this
 * replaces, and it opened nothing; the test for the difference is whether an
 * account screen that reads from the API renders.
 *
 * It also checks the two ways this goes wrong quietly: the password reaching
 * a URL, and a refusal that says which half was wrong.
 *
 * Needs kkl-backend running with an account that has an address and a
 * password:
 *
 *   # kkl-backend, against a disposable database
 *   DATABASE_URL=... node src/bin/provision-account.mjs \
 *     --phone +919830044182 --role seller --name "Sujata Pal" \
 *     --email broker@kkl.test --reason "verification"
 *   KKL_NEW_PASSWORD='review-broker-password' DATABASE_URL=... \
 *     node src/bin/set-password.mjs --email broker@kkl.test
 *   DATABASE_URL=... KKL_ENV=development PORT=4010 node src/http/server.mjs
 *
 *   # kkl-web
 *   KKL_ENV=development KKL_DATA_SOURCE=sample KKL_AUTH=backend \
 *   KKL_PROFILES=backend KKL_BACKEND_BASE_URL=http://127.0.0.1:4010 \
 *     npx next start -p 3829
 *   KKL_BASE_URL=http://127.0.0.1:3829 KKL_EMAIL=broker@kkl.test \
 *   KKL_PASSWORD='review-broker-password' \
 *   PLAYWRIGHT=./node_modules/playwright-core node scripts/verify-password-sign-in.mjs
 *
 * Reads a locally served build against a disposable database. Nothing
 * deployed is touched and no message is sent — this path sends none.
 */
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT ?? "playwright");
const B = process.env.KKL_BASE_URL ?? "http://127.0.0.1:3829";
const CHROME = process.env.KKL_CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const EMAIL = process.env.KKL_EMAIL ?? "broker@kkl.test";
const PASSWORD = process.env.KKL_PASSWORD ?? "review-broker-password";

const checks = [];
const is = (n, a, e) =>
  checks.push(`${a === e ? "PASS" : "FAIL"}  ${n} — ${JSON.stringify(a)}${a === e ? "" : ` (expected ${JSON.stringify(e)})`}`);
const info = (d) => checks.push(`INFO  ${d}`);

const browser = await chromium.launch({ executablePath: CHROME });

const submit = async (page, email, password) => {
  await page.fill("#auth-email", email);
  await page.fill("#auth-password", password);
  await page.locator('form:has(#auth-password) button[type="submit"]').click();
};

/* -- 1. the form is offered where it can work ----------------------------- */

const first = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await first.newPage();
await page.goto(`${B}/auth`, { waitUntil: "networkidle" });
is("the sign-in page offers an email and password", await page.locator("#auth-password").count(), 1);
is(
  "the password field is a password field",
  await page.getAttribute("#auth-password", "type"),
  "password",
);
is(
  "and tells a password manager this is a sign-in",
  await page.getAttribute("#auth-password", "autocomplete"),
  "current-password",
);
is(
  "the mobile code is still offered beside it",
  await page.locator('input[name="mobile"]').count(),
  1,
);

/* -- 2. a wrong password is refused, and says nothing else ---------------- */

await submit(page, EMAIL, "definitely-not-the-password");
await page.waitForTimeout(2500);
const refusedText = await page.evaluate(() => document.body.innerText);
is("a wrong password does not sign in", new URL(page.url()).pathname, "/auth");
is(
  "and the refusal names neither half",
  /do not match an account/i.test(refusedText),
  true,
);
is(
  "no session cookie was written",
  (await first.cookies()).some((c) => /kkl_(access|refresh)/.test(c.name)),
  false,
);

/* -- 3. an address with no account gets the same answer ------------------- */

await submit(page, `nobody-${Date.now()}@example.test`, PASSWORD);
await page.waitForTimeout(2500);
const unknownText = await page.evaluate(() => document.body.innerText);
is(
  "an address with no account is refused identically",
  /do not match an account/i.test(unknownText),
  true,
);

/* -- 4. the right password opens a real session --------------------------- */

const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const signedIn = await ctx.newPage();
const urls = [];
signedIn.on("framenavigated", (frame) => {
  if (frame === signedIn.mainFrame()) urls.push(frame.url());
});
await signedIn.goto(`${B}/auth`, { waitUntil: "networkidle" });
await submit(signedIn, EMAIL, PASSWORD);
await signedIn.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 20000 });
await signedIn.waitForLoadState("networkidle");

is("the right password signs in", new URL(signedIn.url()).pathname.startsWith("/auth"), false);
info(`landed on ${new URL(signedIn.url()).pathname}`);

// The point of the whole exercise: a real session, not a frontend marker.
const cookies = await ctx.cookies();
const access = cookies.find((c) => c.name === "kkl_access");
is("a backend access token is held", Boolean(access), true);
is("it is httpOnly", access?.httpOnly, true);
is("a refresh token is held too", cookies.some((c) => c.name === "kkl_refresh"), true);
is(
  "and no demo marker was written",
  cookies.some((c) => c.name === "kkl_demo_session"),
  false,
);

/* -- 5. the password never reaches a URL ---------------------------------- */

is(
  "the password is in no URL this page visited",
  urls.some((url) => url.includes(PASSWORD) || /password=/.test(url)),
  false,
);
is(
  "and the address is not in one either",
  urls.some((url) => url.includes(encodeURIComponent(EMAIL)) || url.includes(EMAIL)),
  false,
);

/* -- 6. an account screen that reads from the API renders ----------------- */

for (const path of ["/account", "/account/shortlist"]) {
  const response = await signedIn.goto(`${B}${path}`, { waitUntil: "networkidle" });
  const main = await signedIn.evaluate(
    () => (document.querySelector("main")?.innerText ?? "").replace(/\s+/g, " ").trim(),
  );
  const landed = new URL(signedIn.url()).pathname;
  // A session that cannot read is exactly what this replaces: those screens
  // bounced to /auth and rendered a header, a footer and an empty middle.
  is(
    `${path} opens as the signed-in account`,
    response.status() === 200 && landed === path && main.length > 80,
    true,
  );
  if (landed !== path) info(`  ${path} went to ${landed}`);
}

/* -- 7. and each role lands in its own console ---------------------------- */

/*
 * Optional, because it needs four seeded accounts. With them, this is the
 * check that matters for a review: a Broker, a Builder and an Admin signing
 * in and arriving where they work. Every role landed on the Buyer's /account
 * until the action learned to read the role off the issued session, and
 * /account is not where three of the four do anything.
 *
 *   KKL_REVIEW_DOMAIN=review.kkl.test \
 *   KKL_REVIEW_BUYER_PASSWORD=... KKL_REVIEW_SELLER_PASSWORD=... \
 *   KKL_REVIEW_BUILDER_PASSWORD=... KKL_REVIEW_ADMIN_PASSWORD=... \
 *     node scripts/verify-password-sign-in.mjs
 */
const DOMAIN = process.env.KKL_REVIEW_DOMAIN ?? "";
const ROLES = [
  { key: "BUYER", local: "buyer", landing: "/account" },
  { key: "SELLER", local: "broker", landing: "/seller" },
  { key: "BUILDER", local: "builder", landing: "/builder" },
  { key: "ADMIN", local: "admin", landing: "/admin" },
];

if (DOMAIN && ROLES.every((r) => process.env[`KKL_REVIEW_${r.key}_PASSWORD`])) {
  for (const role of ROLES) {
    const roleCtx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const rolePage = await roleCtx.newPage();
    await rolePage.goto(`${B}/auth`, { waitUntil: "networkidle" });
    await submit(rolePage, `${role.local}@${DOMAIN}`, process.env[`KKL_REVIEW_${role.key}_PASSWORD`]);
    await rolePage.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 20000 })
      .catch(() => {});
    await rolePage.waitForLoadState("networkidle");
    const landed = new URL(rolePage.url()).pathname;
    const body = await rolePage.evaluate(() => document.body.innerText);
    /*
     * A ceiling reached is not a failure — it is the ceiling working, and
     * this script is what reached it: five attempts per address in fifteen
     * minutes, and the checks above spend several on one of them. Reported
     * rather than failed, so a run does not have to be re-read to find out
     * that it tested the rate limiter instead of the landings.
     *
     * To run this back to back, raise the limits on the server under test:
     *   KKL_PASSWORD_PER_15_MIN=1000 KKL_PASSWORD_CALLER_PER_15_MIN=1000
     * They are the API's variables, not this script's.
     */
    if (/too many sign-in attempts/i.test(body)) {
      info(`${role.local}: the sign-in ceiling was reached by this run; landing not checked`);
      await roleCtx.close();
      continue;
    }
    is(`${role.local} lands on ${role.landing}`, landed, role.landing);
    const main = await rolePage.evaluate(
      () => (document.querySelector("main")?.innerText ?? "").replace(/\s+/g, " ").trim(),
    );
    // A console that bounced renders a header, a footer and an empty middle.
    is(`and the ${role.local} console renders`, main.length > 80, true);
    await roleCtx.close();
  }
} else {
  info("the four review accounts were not configured; role landings not checked");
}

await browser.close();

const failed = checks.filter((c) => c.startsWith("FAIL"));
console.log(checks.join("\n"));
const total = checks.filter((c) => !c.startsWith("INFO")).length;
console.log(`\n${total - failed.length}/${total} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
