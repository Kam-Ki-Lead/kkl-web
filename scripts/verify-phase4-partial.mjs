/**
 * Partial Phase 4.c checks that do not require the sole staff OTP
 * (+919800004010 is daily rate-limited on this host).
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const playwrightSpec = process.env.PLAYWRIGHT
  ?? "C:/Users/noora/AppData/Local/Cursor/AgentStores/cursor_agent_stores/01afa20b-2d9b-4665-bc47-8402816b45f6/files/pw/node_modules/playwright";
const require = createRequire(import.meta.url);
const playwrightPackage = /^[a-zA-Z]:[\\/]/.test(playwrightSpec)
  ? require(join(playwrightSpec, "index.js"))
  : require(playwrightSpec);
const chromium = playwrightPackage.chromium;
if (!chromium) throw new Error("playwright chromium export missing");

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3812";
const BACKEND = process.env.BACKEND_URL ?? "http://127.0.0.1:4011";
const SELLER = "9800004011";

function loadSecret() {
  if (process.env.KKL_DEV_AUTH_SECRET) return process.env.KKL_DEV_AUTH_SECRET;
  const path = join(process.env.LOCALAPPDATA ?? "", "kkl-postgres", "local.env");
  const raw = readFileSync(path, "utf8");
  const line = raw.split(/\r?\n/).find((row) => row.startsWith("KKL_DEV_AUTH_SECRET="));
  if (!line) throw new Error("KKL_DEV_AUTH_SECRET missing");
  return line.slice("KKL_DEV_AUTH_SECRET=".length).trim();
}

const SECRET = loadSecret();
const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}\n      ${detail}`);
};

async function devCode(challengeId) {
  const response = await fetch(`${BACKEND}/v1/dev/challenges/${challengeId}/code`, {
    headers: { "x-kkl-dev-secret": SECRET },
  });
  if (!response.ok) throw new Error(`dev code read failed: HTTP ${response.status}`);
  return (await response.json()).code;
}

function challengeId(cookies) {
  const cookie = cookies.find((item) => item.name === "kkl_auth_challenge");
  if (!cookie) return null;
  const raw = cookie.value.includes("%") ? decodeURIComponent(cookie.value) : cookie.value;
  return JSON.parse(raw).challengeId ?? null;
}

async function signIn(page, mobile, nextPath) {
  await page.goto(`${BASE}/auth?next=${encodeURIComponent(nextPath)}`, { waitUntil: "networkidle" });
  await page.fill("#auth-mobile", mobile);
  await page.click('button:has-text("Send code")');
  await page.waitForSelector("#auth-code", { timeout: 20000 });
  const id = challengeId(await page.context().cookies());
  if (!id) throw new Error("challenge cookie missing");
  await page.fill("#auth-code", await devCode(id));
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 20000 }),
    page.click('button:has-text("Verify and continue")'),
  ]);
}

const browser = await chromium.launch();
try {
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE}/admin/leads`, { waitUntil: "networkidle" });
    ok("Missing session redirects to auth (leads)", page.url().includes("/auth"), page.url());
    await context.close();
  }

  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, SELLER, "/admin/leads");
    await page.goto(`${BASE}/admin/leads`, { waitUntil: "networkidle" });
    const leadsBody = await page.locator("body").innerText();
    ok(
      "Seller denied staff lead inventory",
      /could not be loaded|staff|Only staff|cannot|forbidden|not authorised|not authorized/i.test(leadsBody)
        && !/inventory:\s*true/i.test(leadsBody),
      leadsBody.replace(/\s+/g, " ").slice(0, 400),
    );
    await page.goto(`${BASE}/admin/voice`, { waitUntil: "networkidle" });
    const voiceBody = await page.locator("body").innerText();
    ok(
      "Seller denied qualification runs",
      /could not be loaded|staff|Only staff|cannot|forbidden/i.test(voiceBody),
      voiceBody.replace(/\s+/g, " ").slice(0, 400),
    );
    await context.close();
  }

  {
    const p4 = await fetch(`${BACKEND}/health`);
    const p3 = await fetch("http://127.0.0.1:4010/health");
    const h4 = await p4.json();
    const h3 = await p3.json();
    ok(
      "Phase 4 origin 4011 separate from Phase 3 4010",
      p4.ok && p3.ok
        && h4.voiceBridge?.providerVerified === false
        && h4.voiceBridge?.liveTelephony === false
        && h3.ok === true,
      `4011 liveTelephony=${h4.voiceBridge?.liveTelephony}`,
    );
  }

  // Document staff OTP block for the full script.
  const staffProbe = await fetch(`${BACKEND}/v1/auth/code`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: "+919800004010" }),
  });
  const staffBody = await staffProbe.json();
  ok(
    "Staff fixture OTP still daily-limited (expected blocker)",
    staffProbe.status === 429 && /too many codes today/i.test(staffBody.error ?? ""),
    JSON.stringify(staffBody),
  );
} finally {
  await browser.close();
}

const failed = results.filter((row) => !row.pass);
console.log(`\n${results.length - failed.length}/${results.length} partial passed`);
process.exit(failed.length === 0 ? 0 : 1);
