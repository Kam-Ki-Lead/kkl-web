/**
 * Every screen the four-console demo opens, actually opening.
 *
 * WHY THIS EXISTS
 *
 * The sign-in checks prove each account reaches its own console. They say
 * nothing about the second click. Walking the rails found B-16
 * (/builder/enquiries) answering 500 on every sample build — a fixture had
 * kept a contact-access name that a rename had removed, and the screen looked
 * its copy up by that key. Nothing walked these screens, so nothing caught it.
 *
 * So this signs in as each account and opens the screens a demo opens, and
 * fails on any of: a non-200, a redirect away from the requested path, or a
 * page whose <main> came back empty — which is what a thrown render looks
 * like once the shell has already flushed.
 *
 * Run it against the build the demo runs on, which serves sample fixtures:
 *
 *   KKL_ENV=development KKL_DATA_SOURCE=sample npx next start -p 3828
 *   KKL_BASE_URL=http://127.0.0.1:3828 \
 *   PLAYWRIGHT=./node_modules/playwright-core node scripts/verify-demo-walkthrough.mjs
 *
 * Reads a locally served build, signs in only as the synthetic review
 * accounts, and touches no deployed environment.
 */
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT ?? "playwright");
const B = process.env.KKL_BASE_URL ?? "http://127.0.0.1:3828";
const CHROME = process.env.KKL_CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

/**
 * A rendered screen has more than this in its <main>.
 *
 * The 500 this check was written for served a full header and footer around
 * an empty middle, so page length proves nothing and status alone missed it
 * on the routes that answer 200 with a failed boundary.
 */
const MIN_MAIN = 80;

const WALK = {
  buyer: [
    "/account",
    "/account/shortlist",
    "/account/enquiries",
    "/account/profile",
    "/account/notifications",
  ],
  seller: [
    "/seller",
    "/seller/leads",
    "/seller/purchased",
    "/seller/requests",
    "/seller/billing",
    "/seller/orders",
    "/seller/kyc",
    "/seller/verification",
    "/seller/support",
    "/seller/profile",
  ],
  builder: [
    "/builder",
    "/builder/properties",
    "/builder/enquiries",
    "/builder/profile",
  ],
  admin: [
    "/admin",
    "/admin/leads",
    "/admin/leads/intake",
    "/admin/voice",
    "/admin/whatsapp",
    "/admin/orders",
    "/admin/verification",
    "/admin/kyc",
    "/admin/properties",
    "/admin/users",
    "/admin/wallets",
    "/admin/consent",
    "/admin/notifications",
    "/admin/support",
    "/admin/audit",
    "/admin/reports",
    "/admin/settings/pricing",
    "/admin/system",
  ],
};

const checks = [];
const is = (n, a, e) =>
  checks.push(`${a === e ? "PASS" : "FAIL"}  ${n} — ${JSON.stringify(a)}${a === e ? "" : ` (expected ${JSON.stringify(e)})`}`);
const info = (d) => checks.push(`INFO  ${d}`);

const browser = await chromium.launch({ executablePath: CHROME });

for (const [role, routes] of Object.entries(WALK)) {
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto(`${B}/auth`, { waitUntil: "networkidle" });
  await page.locator(`form:has(input[name="role"][value="${role}"]) button[type="submit"]`).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 20000 });

  for (const route of routes) {
    const response = await page.goto(`${B}${route}`, { waitUntil: "networkidle" });
    const landed = new URL(page.url()).pathname;
    const main = await page.evaluate(
      () => (document.querySelector("main")?.innerText ?? "").replace(/\s+/g, " ").trim(),
    );
    const ok = response.status() === 200 && landed === route && main.length >= MIN_MAIN;
    checks.push(
      `${ok ? "PASS" : "FAIL"}  ${role} opens ${route} — ${response.status()}${
        landed === route ? "" : ` -> ${landed}`
      }, ${main.length} characters in <main>`,
    );
    if (!ok) info(`  ${main.slice(0, 120) || "(nothing rendered)"}`);
  }
  await ctx.close();
}

await browser.close();

const failed = checks.filter((c) => c.startsWith("FAIL"));
console.log(checks.join("\n"));
const total = checks.filter((c) => !c.startsWith("INFO")).length;
console.log(`\n${total - failed.length}/${total} screens opened`);
process.exit(failed.length === 0 ? 0 : 1);
