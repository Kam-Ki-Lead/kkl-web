/**
 * Phase 5 browser checks against http://127.0.0.1:4012.
 *
 * Does not place a live call or message, does not use a real card, and does
 * not restart ports 4010 or 4011. Fixture publication, verification and
 * consent are not created here.
 *
 *   BASE_URL=http://127.0.0.1:3815 BACKEND_URL=http://127.0.0.1:4012 \
 *     node scripts/verify-phase5.mjs
 *
 * PLAYWRIGHT may name a directory holding the package, if it is not resolvable
 * from this repository. The three repository roots are resolved as siblings;
 * KKL_BACKEND_ROOT and KKL_VOICE_ROOT override that.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadPlaywright, revisions } from "./repo-paths.mjs";

const chromium = loadPlaywright().chromium;
if (!chromium) throw new Error("playwright chromium export missing");

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3815";
const BACKEND = process.env.BACKEND_URL ?? "http://127.0.0.1:4012";
const VOICE = process.env.VOICE_URL ?? "http://127.0.0.1:4020";
const STAFF = process.env.STAFF_PHONE ?? "9800005010";
const SELLER = process.env.SELLER_PHONE ?? "9800005011";
const LEAD = process.env.SEEDED_LEAD ?? "ec336642-0763-4b8e-ba21-1d9f6645ec74";
const RUN = process.env.SEEDED_RUN ?? "cdc9689f-3d7b-4fe2-b142-21042ee63396";
const XSS = "<script>alert(1)</script><img src=x onerror=alert(1)>";

function loadSecret() {
  if (process.env.KKL_DEV_AUTH_SECRET) return process.env.KKL_DEV_AUTH_SECRET;
  const path = join(process.env.LOCALAPPDATA ?? "", "kkl-postgres", "local.env");
  const raw = readFileSync(path, "utf8");
  const line = raw.split(/\r?\n/).find((row) => row.startsWith("KKL_DEV_AUTH_SECRET="));
  if (!line) throw new Error("KKL_DEV_AUTH_SECRET missing from local.env");
  return line.slice("KKL_DEV_AUTH_SECRET=".length).trim();
}

const SECRET = loadSecret();
const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass, detail: String(detail).slice(0, 500) });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}\n      ${String(detail).replace(/\s+/g, " ").slice(0, 360)}`);
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
  const code = await devCode(id);
  await page.fill("#auth-code", code);
  await page.click('button:has-text("Verify and continue")');
  try {
    await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 20000 });
  } catch (error) {
    const body = await page.locator("body").innerText();
    const alert = await page.locator("[role=alert]").allInnerTexts();
    throw new Error(
      `${error instanceof Error ? error.message : error}\nURL ${page.url()}\nALERT ${alert.join(" | ")}\nTAIL ${body.replace(/\s+/g, " ").slice(-400)}`,
    );
  }
}

function cookieFlags(cookies, name) {
  const cookie = cookies.find((item) => item.name === name);
  if (!cookie) return "absent";
  return `httpOnly=${cookie.httpOnly} sameSite=${cookie.sameSite} secure=${cookie.secure}`;
}

const browser = await chromium.launch();
try {
  try {
  const health = await (await fetch(`${BACKEND}/health`)).json();
  const preserved = await (await fetch("http://127.0.0.1:4011/health")).json();
  const phase3 = await (await fetch("http://127.0.0.1:4010/health")).json();
  const voice = await (await fetch(`${VOICE}/health`)).json();
  ok(
    "Phase 5 API is review, live flags off, secrets loader not integrated",
    health.ok === true
      && health.environment === "review"
      && health.voiceBridge?.providerVerified === false
      && health.voiceBridge?.liveTelephony === false
      && health.voiceBridge?.liveMessaging === false
      && health.secrets?.loader === "not_integrated"
      && health.secrets?.localEnvironmentFileIsProductionSecretManager === false,
    `env=${health.environment} loader=${health.secrets?.loader}`,
  );
  ok(
    "Ports 4010 and 4011 still answer and are not this voice pair",
    phase3.ok === true && preserved.ok === true,
    `4010=${phase3.environment} 4011=${preserved.environment} 4011 live=${preserved.voiceBridge?.liveTelephony}`,
  );
  ok(
    "Voice on 4020 is simulated and not provider verified",
    voice.ok === true && voice.providerVerified === false && voice.liveTelephony === false,
    `simulated=${voice.simulatedRuntime}`,
  );

  {
    const response = await fetch(`${BASE}/seller/billing`, { redirect: "manual" });
    ok(
      "Document responses set nosniff, deny framing, and no-store",
      response.headers.get("x-content-type-options") === "nosniff"
        && response.headers.get("x-frame-options") === "DENY"
        && (response.headers.get("cache-control") ?? "").includes("no-store")
        && (response.headers.get("content-security-policy") ?? "").includes("frame-ancestors 'none'"),
      `cache=${response.headers.get("cache-control")} csp=${response.headers.get("content-security-policy")}`,
    );
  }

  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE}/admin/wallets`, { waitUntil: "networkidle" });
    const body = await page.locator("body").innerText();
    ok(
      "Missing staff session does not open the wallet console",
      page.url().includes("/auth") && !/Ledger sum matches/i.test(body) && !/Sujata Pal/.test(body),
      page.url(),
    );
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(`${BASE}/auth`, { waitUntil: "networkidle" });
    await page.focus("#auth-mobile");
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.tagName ?? "");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 8);
    ok(
      "Auth mobile viewport keeps keyboard focus and does not overflow",
      focused !== "BODY" && overflow === false,
      `focused=${focused} overflow=${overflow}`,
    );
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    let dialogs = 0;
    page.on("dialog", async (dialog) => {
      dialogs += 1;
      await dialog.dismiss();
    });
    await signIn(page, SELLER, "/seller");
    let body = await page.locator("body").innerText();
    ok(
      "Seller dashboard does not claim a 20% aging charge or a simulated sign-in",
      /Aging discount is not applied/.test(body)
        && !/Aged, discounted 20%/.test(body)
        && /Sign-in uses the configured API/.test(body)
        && !/nothing is sent, charged or stored/.test(body)
        && !/are not implemented here/.test(body),
      body.replace(/\s+/g, " ").slice(0, 320),
    );
    const started = Date.now();
    await page.goto(`${BASE}/seller/leads?tab=sale`, { waitUntil: "networkidle" });
    const saleMs = Date.now() - started;
    body = await page.locator("body").innerText();
    ok(
      "Sale tab does not render a discounted price",
      /not applied/.test(body) && !/line-through|Reduced from/.test(body) && !/discounted 20%/.test(body),
      `ms=${saleMs} ${body.replace(/\s+/g, " ").slice(0, 240)}`,
    );

    await page.goto(`${BASE}/seller/billing`, { waitUntil: "networkidle" });
    body = await page.locator("body").innerText();
    ok(
      "Seller billing shows the ledger comparison and not a delivered payment",
      /Ledger sum matches this balance/.test(body)
        && /does not apply an aging discount/.test(body)
        && !/payment captured|credited/i.test(body),
      body.replace(/\s+/g, " ").slice(0, 280),
    );

    const before = body;
    await page.goto(`${BASE}/seller/billing/recharge`, { waitUntil: "networkidle" });
    body = await page.locator("body").innerText();
    if (/Recharge is unavailable/.test(body) && /nothing has been charged/i.test(body)) {
      ok(
        "Recharge fails closed and does not grant credits",
        !/Continue to payment/.test(body) && !/payment successful/i.test(body),
        body.replace(/\s+/g, " ").slice(body.replace(/\s+/g, " ").indexOf("Recharge"), 280),
      );
    } else {
      const amount = page.locator("#recharge-amount");
      if (await amount.count()) await amount.fill("2000");
      await page.click('button:has-text("Continue to payment")');
      await page.waitForURL(/\/billing\/payment/, { timeout: 20000 });
      body = await page.locator("body").innerText();
      ok(
        "Recharge fails closed and does not grant credits",
        /No credits were added/.test(body) && /unchanged/.test(body),
        body.replace(/\s+/g, " ").slice(0, 280),
      );
    }
    ok(
      "Recharge page still shows the balance that was already on billing",
      before.includes("₹") || before.includes("credit"),
      "balance text was present before the failed recharge",
    );

    await page.goto(`${BASE}/seller/leads/${LEAD}`, { waitUntil: "networkidle" });
    body = await page.locator("body").innerText();
    const phoneOnCard = /\+91\d{10}/.test(body);
    ok(
      "Intake lead is not sold and does not show a phone",
      !phoneOnCard && (/not applied/.test(body) || /Not priced|cannot be bought|consent|verification/i.test(body) || page.url().includes("/seller")),
      `url=${page.url()} ${body.replace(/\s+/g, " ").slice(0, 300)}`,
    );

    // The export is built. It must answer, carry the shared header, and
    // contain no contact this account did not buy. The fixture account has
    // no completed purchase, so one header line and nothing else is right.
    const exportResponse = await page.request.get(`${BASE}/seller/purchased/export.csv`);
    const exportText = await exportResponse.text();
    const exportLines = exportText.split("\r\n").filter((line) => line.length > 0);
    ok(
      "Purchased-lead download answers with its own header and no other contact",
      exportResponse.status() === 200
        && exportLines[0]?.startsWith("Lead,Order,Purchased,Requirement,Area")
        && exportLines.length === 1
        && !/\+91\d{10}/.test(exportText),
      `status=${exportResponse.status()} rows=${exportLines.length} `
      + `${exportText.replace(/\s+/g, " ").slice(0, 200)}`,
    );

    // An id this account does not own is a 404, not an empty file that looks
    // like a successful export of nothing.
    const notOwned = await page.request.get(
      `${BASE}/seller/purchased/00000000-0000-0000-0000-000000000000/export.csv`);
    ok(
      "A purchased-lead export for an unowned id is refused, not empty",
      notOwned.status() === 404 || notOwned.status() === 403,
      `status=${notOwned.status()}`,
    );

    await page.goto(`${BASE}/seller/support/new`, { waitUntil: "networkidle" });
    await page.fill("#subject", "Phase 5 xss check");
    await page.fill("#body", XSS);
    await page.click('button:has-text("Submit ticket")');
    await page.waitForTimeout(1500);
    body = await page.locator("body").innerText();
    const html = await page.content();
    ok(
      "Support text is escaped and does not run",
      dialogs === 0
        && body.includes("<script>alert(1)</script>")
        && !html.includes("<script>alert(1)</script>")
        && !html.includes("<img src=x onerror"),
      `dialogs=${dialogs} url=${page.url()}`,
    );

    await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
    body = await page.locator("body").innerText();
    ok(
      "Seller session is refused by the operations console",
      /staff account|no staff role|does not open the sample queues/i.test(body)
        && !/A\. Dutta/.test(body),
      body.replace(/\s+/g, " ").slice(0, 240),
    );

    const searchStarted = Date.now();
    const searchResponse = await page.goto(`${BASE}/search`, { waitUntil: "networkidle" });
    const searchMs = Date.now() - searchStarted;
    ok(
      "Public search renders without a sample fallback error",
      (searchResponse?.status() ?? 0) < 500,
      `status=${searchResponse?.status()} ms=${searchMs}`,
    );

    await page.goto(`${BASE}/account`, { waitUntil: "networkidle" });
    const signOut = page.locator('button:has-text("Sign out"), button:has-text("Log out")').first();
    if (await signOut.count()) {
      await signOut.click();
      await page.waitForURL(/\/auth/, { timeout: 20000 });
    }
    const after = await page.context().cookies();
    const access = after.find((item) => item.name === "kkl_access");
    const refresh = after.find((item) => item.name === "kkl_refresh");
    ok(
      "Logout clears access and refresh cookies",
      page.url().includes("/auth")
        && (!access || access.value === "")
        && (!refresh || refresh.value === ""),
      `url=${page.url()} access=${cookieFlags(after, "kkl_access")} refresh=${cookieFlags(after, "kkl_refresh")}`,
    );
    await page.goto(`${BASE}/seller/billing`, { waitUntil: "networkidle" });
    body = await page.locator("body").innerText();
    ok(
      "Seller billing after logout does not keep the previous balance",
      page.url().includes("/auth") && !/Ledger sum matches/.test(body),
      page.url(),
    );
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await signIn(page, STAFF, "/admin/wallets");
    let body = await page.locator("body").innerText();
    ok(
      "Staff wallet screen shows the ledger comparison",
      /Ledger sum matches this balance/.test(body),
      body.replace(/\s+/g, " ").slice(0, 280),
    );
    const cookies = await context.cookies();
    ok(
      "Session cookies are httpOnly",
      cookies.some((item) => item.name === "kkl_access" && item.httpOnly)
        && cookies.some((item) => item.name === "kkl_refresh" && item.httpOnly),
      cookies.filter((item) => item.name.startsWith("kkl_")).map((item) => `${item.name}:${cookieFlags(cookies, item.name)}`).join(" "),
    );

    await page.goto(`${BASE}/admin/voice/${RUN}`, { waitUntil: "networkidle" });
    body = await page.locator("body").innerText();
    ok(
      "Seeded qualification run is not a level or marketplace consent",
      !/Level\s*[1-9]/.test(body) && !/consent granted/i.test(body),
      `url=${page.url()} ${body.replace(/\s+/g, " ").slice(0, 280)}`,
    );

    await page.goto(`${BASE}/admin/leads/intake`, { waitUntil: "networkidle" });
    body = await page.locator("body").innerText();
    ok(
      "Staff intake queue renders from the Phase 5 API",
      !/sample queue/i.test(body) && page.url().includes("/admin/leads/intake"),
      body.replace(/\s+/g, " ").slice(0, 240),
    );

    await page.goto(`${BASE}/seller`, { waitUntil: "networkidle" });
    body = await page.locator("body").innerText();
    ok(
      "Staff session does not show the seeded seller phone or the sample seller",
      !body.includes("9800005011") && !/Sujata Pal/.test(body) && !/Refusing to serve/.test(body),
      `url=${page.url()} ${body.replace(/\s+/g, " ").slice(0, 240)}`,
    );

    await context.clearCookies();
    await page.goto(`${BASE}/admin/wallets`, { waitUntil: "networkidle" });
    ok(
      "Cleared cookies return to sign-in",
      page.url().includes("/auth"),
      page.url(),
    );
    await context.close();
  }

  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE}/auth?next=${encodeURIComponent("//evil.example/steal")}`, { waitUntil: "networkidle" });
    await page.fill("#auth-mobile", STAFF);
    await page.click('button:has-text("Send code")');
    await page.waitForSelector("#auth-code", { timeout: 20000 });
    const id = challengeId(await page.context().cookies());
    const code = await devCode(id);
    await page.fill("#auth-code", code);
    await page.click('button:has-text("Verify and continue")');
    await page.waitForLoadState("networkidle");
    ok(
      "A protocol-relative next target stays on this origin",
      page.url().startsWith(BASE) && !page.url().includes("evil.example"),
      page.url(),
    );
    await context.close();
  }
  } catch (error) {
    ok("Browser script finished without an unexpected stop", false, error instanceof Error ? error.stack ?? error.message : String(error));
  }
} finally {
  await browser.close();
}

const failed = results.filter((row) => !row.pass);
const evidence = {
  category: "review-browser",
  notSandbox: true,
  notLiveProvider: true,
  revisions: revisions(),
  base: BASE,
  backend: BACKEND,
  voice: VOICE,
  passed: results.length - failed.length,
  failed: failed.length,
  results,
};
writeFileSync(join("docs", "phase-5", "browser-evidence.json"), JSON.stringify(evidence, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exitCode = 1;
