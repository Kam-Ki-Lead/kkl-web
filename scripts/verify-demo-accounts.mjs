/**
 * The four review accounts, each into its own console, in a browser.
 *
 * The bug this exists to catch: the shortcut signed everybody in to the same
 * place. First /account for all four — which on a backend-wired server bounced
 * to a blank /auth?next=%2Faccount — then the public homepage for all four,
 * which opened no console at all. A demo that cannot reach the Seller, Builder
 * and Admin screens is not a demo of this platform.
 *
 * So each account is signed in separately and the check is the same three
 * things every time: the URL is THAT account's console, the console actually
 * rendered rather than bouncing back to sign-in, and the header names the
 * account that is signed in.
 *
 * Run it against a fully-sample server, which is the configuration the
 * four-console demo runs on:
 *
 *   KKL_ENV=development KKL_DATA_SOURCE=sample npx next start -p 3828
 *   KKL_BASE_URL=http://127.0.0.1:3828 \
 *   PLAYWRIGHT=./node_modules/playwright-core node scripts/verify-demo-accounts.mjs
 *
 * Signs in only as the synthetic fixture accounts, reads a locally served
 * build, and touches no deployed environment.
 */
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT ?? "playwright");
const B = process.env.KKL_BASE_URL ?? "http://127.0.0.1:3828";
const CHROME = process.env.KKL_CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

/** Mirrors src/lib/auth/demo-access.ts. Duplicated so a drift fails here. */
/*
 * `marker` is the console's own heading, so a screen that rendered its own
 * refusal without moving is caught. `who` is the fixture identity that
 * console shows for this account — the initials in the rail's avatar, or the
 * name beside it. That is the part that proves the four are four accounts and
 * not one account behind four buttons.
 */
const ACCOUNTS = [
  {
    role: "buyer", mobile: "8971741611", label: "Buyer", landing: "/account",
    marker: /My account/, who: /Priya Sen|Buyer/,
  },
  {
    role: "seller", mobile: "9830044182", label: "Broker", landing: "/seller",
    marker: /Dashboard/, who: /Sujata|\bSP\b/,
  },
  {
    role: "builder", mobile: "9830072210", label: "Builder", landing: "/builder",
    marker: /Dashboard/, who: /Sandeep|\bSB\b/,
  },
  {
    role: "admin", mobile: "9830000004", label: "Admin", landing: "/admin",
    marker: /Operations dashboard/, who: /A\. Dutta|\bAD\b/,
  },
];

const checks = [];
const is = (n, a, e) =>
  checks.push(`${a === e ? "PASS" : "FAIL"}  ${n} — ${JSON.stringify(a)}${a === e ? "" : ` (expected ${JSON.stringify(e)})`}`);
const info = (d) => checks.push(`INFO  ${d}`);

const browser = await chromium.launch({ executablePath: CHROME });

/* -- 1. the panel offers all four ---------------------------------------- */

const first = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const intro = await first.newPage();
await intro.goto(`${B}/auth`, { waitUntil: "networkidle" });
const panel = await intro.evaluate(() => document.body.innerText);
for (const account of ACCOUNTS) {
  is(`the sign-in page offers the ${account.label}`, panel.includes(account.mobile), true);
}
is(
  "there are four one-click buttons, one per account",
  await intro.evaluate(() => document.querySelectorAll('input[name="role"]').length),
  4,
);
await first.close();

/* -- 2. each account, into its own console -------------------------------- */

for (const account of ACCOUNTS) {
  // A context of its own: four accounts sharing one cookie jar would pass by
  // accident, because the second click would land on a session already open.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto(`${B}/auth`, { waitUntil: "networkidle" });

  await page.locator(`form:has(input[name="role"][value="${account.role}"]) button[type="submit"]`).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 20000 });
  await page.waitForLoadState("networkidle");

  const landed = new URL(page.url()).pathname;
  is(`the ${account.label} lands on ${account.landing}`, landed, account.landing);
  // The bounce the first two attempts produced was a *redirect* to /auth, so
  // the URL catches it — but a console that renders its own empty refusal
  // would not move. The marker is the console's own heading.
  is(
    `and the ${account.label} console actually renders`,
    account.marker.test(await page.evaluate(() => document.body.innerText)),
    true,
  );
  is(
    `and the ${account.label} console names that account`,
    account.who.test(await page.evaluate(() => document.body.innerText)),
    true,
  );

  const cookie = (await ctx.cookies()).find((c) => c.name === "kkl_demo_session");
  is(`the ${account.label} session records the role and nothing else`, cookie?.value, account.role);
  is(
    `and no access or refresh token was written for the ${account.label}`,
    (await ctx.cookies()).some((c) => /access|refresh/i.test(c.name)),
    false,
  );

  // Typed into the form, the same number must reach the same console.
  const typed = await ctx.newPage();
  await typed.goto(`${B}/auth`, { waitUntil: "networkidle" });
  await typed.fill('input[name="mobile"]', account.mobile);
  await typed.locator('form:has(input[name="mobile"]) button[type="submit"]').first().click();
  await typed.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 20000 });
  is(
    `and typing ${account.mobile} reaches the same console`,
    new URL(typed.url()).pathname,
    account.landing,
  );
  await typed.close();

  info(`${account.label}: ${landed}`);
  await ctx.close();
}

/* -- 3. signing out ends it ---------------------------------------------- */

const out = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await out.newPage();
await page.goto(`${B}/auth`, { waitUntil: "networkidle" });
await page.locator('form:has(input[name="role"][value="buyer"]) button[type="submit"]').click();
await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 20000 });

const signOut = page.locator('form button:has-text("Sign out"), button:has-text("Sign out")').first();
if (await signOut.count()) {
  await signOut.click();
  await page.waitForURL((url) => url.pathname.startsWith("/auth"), { timeout: 20000 });
  is(
    "signing out clears the demo session",
    (await out.cookies()).some((c) => c.name === "kkl_demo_session" && c.value !== ""),
    false,
  );
} else {
  info("no sign-out control on the landing screen; not checked here");
}

/* -- 4. nothing else gets in --------------------------------------------- */

const other = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const stranger = await other.newPage();
await stranger.goto(`${B}/auth`, { waitUntil: "networkidle" });
await stranger.fill('input[name="mobile"]', "9876543210");
await stranger.locator('form:has(input[name="mobile"]) button[type="submit"]').first().click();
await stranger.waitForTimeout(1500);
is(
  "another number still has to enter a code",
  await stranger.evaluate(() => Boolean(document.querySelector('input[name="code"]'))),
  true,
);
is(
  "and opens no console by asking",
  (await other.cookies()).some((c) => c.name === "kkl_demo_session"),
  false,
);
await other.close();
await out.close();
await browser.close();

/* ------------------------------------------------------------- report --- */
const failed = checks.filter((c) => c.startsWith("FAIL"));
console.log(checks.join("\n"));
const total = checks.filter((c) => !c.startsWith("INFO")).length;
console.log(`\n${total - failed.length}/${total} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
