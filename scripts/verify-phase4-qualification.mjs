/**
 * Phase 4.c browser checks against the review runtime on 4011.
 *
 * Does not press retry when capabilities.retry.dispatchesProvider is true.
 * Does not place a live call or message. Mutation coverage stays partial
 * until backend-created synthetic outcomes (pending review / incomplete) exist.
 *
 *   BASE_URL=http://127.0.0.1:3812 BACKEND_URL=http://127.0.0.1:4011 \
 *     node scripts/verify-phase4-qualification.mjs
 *
 * Loads KKL_DEV_AUTH_SECRET from %LOCALAPPDATA%/kkl-postgres/local.env when unset.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const playwrightSpec = process.env.PLAYWRIGHT ?? "playwright";
const require = createRequire(import.meta.url);
const playwrightPackage = /^[a-zA-Z]:[\\/]/.test(playwrightSpec)
  ? require(join(playwrightSpec.replace(/[\\/]+$/, ""), "index.js"))
  : require(playwrightSpec);
const chromium = playwrightPackage.chromium;
if (!chromium) throw new Error("playwright chromium export missing");

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3812";
const BACKEND = process.env.BACKEND_URL ?? "http://127.0.0.1:4011";
const STAFF = process.env.STAFF_PHONE ?? "9800004010";
const SELLER = process.env.SELLER_PHONE ?? "9800004011";
const SEEDED_RUN = process.env.SEEDED_RUN ?? "3fb48762-2428-4e38-b05c-dc68c8effc4a";

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
  const code = await devCode(id);
  await page.fill("#auth-code", code);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 20000 }),
    page.click('button:has-text("Verify and continue")'),
  ]);
}

const browser = await chromium.launch();
try {
  // --- missing session ---
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE}/admin/voice`, { waitUntil: "networkidle" });
    const url = page.url();
    const body = await page.locator("body").innerText();
    ok(
      "Missing session redirects to auth",
      url.includes("/auth") && !body.includes("QUAL-"),
      `url=${url}`,
    );
    await context.close();
  }

  // --- staff session ---
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, STAFF, "/admin/voice");
    await page.waitForURL(/\/admin\/voice/, { timeout: 20000 });
    let body = await page.locator("body").innerText();
    ok(
      "Staff run list shows synthetic run and inventory honesty",
      /QUAL-/i.test(body)
        && /inventory:\s*false/i.test(body)
        && /SYNTHETIC/i.test(body)
        && /not a lead|not the staff lead inventory/i.test(body)
        && /not_configured|Not configured/i.test(body),
      body.replace(/\s+/g, " ").slice(0, 400),
    );

    await page.goto(`${BASE}/admin/voice/${SEEDED_RUN}`, { waitUntil: "networkidle" });
    body = await page.locator("body").innerText();
    ok(
      "Staff run detail keeps level unset and shows synthetic provenance",
      /mapping not configured/i.test(body)
        && /marketplaceConsent|unchanged/i.test(body)
        && /SYNTHETIC/i.test(body)
        && /not_configured|Not configured/i.test(body)
        && !/Level\s*[1-9]/i.test(body),
      body.replace(/\s+/g, " ").slice(0, 500),
    );
    ok(
      "Review form gated while review is not pending",
      !/Record review/i.test(body) && /No review recorded|not required|review/i.test(body),
      /Record review/.test(body) ? "form unexpectedly present" : "form absent as expected",
    );
    ok(
      "Retry control follows capabilities (no dispatching retry offered)",
      !/Retry failed call/i.test(body)
        && (/Resume never dispatches|capabilities|would dispatch|not offered|Safe retry/i.test(body)),
      "dispatching retry absent",
    );

    await page.goto(`${BASE}/admin/whatsapp`, { waitUntil: "networkidle" });
    body = await page.locator("body").innerText();
    ok(
      "WhatsApp page does not claim delivery from fixtures",
      /inventory:\s*false|qualification runs/i.test(body)
        && !/delivered to the customer/i.test(body),
      body.replace(/\s+/g, " ").slice(0, 300),
    );

    await page.goto(`${BASE}/admin/settings`, { waitUntil: "networkidle" });
    body = await page.locator("body").innerText();
    ok(
      "Settings reloads saved calling window and opt-out with provenance",
      /Asia\/Kolkata/i.test(body)
        && /00:00/i.test(body)
        && /23:59/i.test(body)
        && /\bstop\b/i.test(body)
        && /Saved configuration/i.test(body)
        && /staff_saved|provenance/i.test(body)
        && /SYNTHETIC|synthetic-v1/i.test(body),
      body.replace(/\s+/g, " ").slice(0, 400),
    );

    // Save calling window (fixture hours) and confirm notice + reload.
    await page.fill("#timeZone", "Asia/Kolkata");
    await page.fill("#start", "00:00");
    await page.fill("#end", "23:59");
    await page.click('button:has-text("Save calling window")');
    await page.waitForSelector("text=Calling window saved", { timeout: 15000 });
    await page.reload({ waitUntil: "networkidle" });
    body = await page.locator("body").innerText();
    ok(
      "Calling window save/reload",
      /Asia\/Kolkata\s+00:00[–-]23:59/i.test(body)
        && /staff_saved|provenance/i.test(body),
      "saved block still present after reload",
    );

    await page.fill("#keywords", "stop");
    await page.fill("#dtmf", "9");
    await page.click('button:has-text("Save opt-out signals")');
    await page.waitForSelector("text=Opt-out signals saved", { timeout: 15000 });
    ok("Opt-out save", true, "notice shown");

    await page.goto(`${BASE}/admin/leads`, { waitUntil: "networkidle" });
    body = await page.locator("body").innerText();
    ok(
      "Staff lead inventory loads (inventory:true, not marketplace)",
      /inventory:\s*true/i.test(body)
        && /admin\/qualification\/leads/i.test(body)
        && /Not marketplace|not marketplace/i.test(body)
        && !/Seller marketplace rows are not substituted/i.test(body),
      body.replace(/\s+/g, " ").slice(0, 400),
    );

    // Open first lead detail if any row is linked.
    const leadLink = page.locator('a[href^="/admin/leads/"]').first();
    if (await leadLink.count()) {
      await leadLink.click();
      await page.waitForURL(/\/admin\/leads\/[0-9a-f-]{36}/i, { timeout: 15000 });
      body = await page.locator("body").innerText();
      ok(
        "Staff lead detail keeps level unset and links runs",
        /mapping not configured|marketplaceConsent|unchanged/i.test(body)
          && /Qualification runs|Open run/i.test(body)
          && !/Level\s*[1-9]/i.test(body),
        body.replace(/\s+/g, " ").slice(0, 400),
      );
    } else {
      ok(
        "Staff lead detail keeps level unset and links runs",
        /No leads match|Past the end|Showing 0 of/i.test(body),
        "empty inventory — detail deferred; list honesty still checked",
      );
    }

    await page.goto(`${BASE}/admin/system`, { waitUntil: "networkidle" });
    body = await page.locator("body").innerText();
    ok(
      "System page does not submit due retries",
      /invoke dial|not submitted|simulated-provider/i.test(body)
        && !/Process due provider retries/i.test(body),
      "due-retries button absent",
    );

    // Start a non-dispatched run from the voice page.
    await page.goto(`${BASE}/admin/voice`, { waitUntil: "networkidle" });
    await page.click('button:has-text("Start non-dispatched run")');
    await page.waitForURL(/\/admin\/voice\/[0-9a-f-]{36}/i, { timeout: 20000 });
    body = await page.locator("body").innerText();
    ok(
      "Start-run creates not_configured attempt without live dial claim",
      /not_configured|Not configured/i.test(body)
        && /mapping not configured/i.test(body)
        && /unchanged/i.test(body)
        && !/providerDispatch\.dispatched=true/i.test(body),
      page.url(),
    );

    await context.close();
  }

  // --- seller denial ---
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, SELLER, "/admin/voice");
    await page.goto(`${BASE}/admin/voice`, { waitUntil: "networkidle" });
    const body = await page.locator("body").innerText();
    ok(
      "Seller cannot open qualification runs",
      /could not be loaded|staff|cannot|forbidden|403|not authorised|not authorized/i.test(body)
        && !/QUAL-27c19c4c/i.test(body),
      body.replace(/\s+/g, " ").slice(0, 300),
    );

    await page.goto(`${BASE}/admin/leads`, { waitUntil: "networkidle" });
    const leadsBody = await page.locator("body").innerText();
    ok(
      "Seller cannot open staff lead inventory",
      /could not be loaded|staff|cannot|forbidden|403|not authorised|not authorized/i.test(leadsBody)
        && !/inventory:\s*true/i.test(leadsBody),
      leadsBody.replace(/\s+/g, " ").slice(0, 300),
    );
    await context.close();
  }

  // --- origin separation ---
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
      `4011 ok=${p4.ok} liveTelephony=${h4.voiceBridge?.liveTelephony}; 4010 ok=${p3.ok}`,
    );
  }
} finally {
  await browser.close();
}

const failed = results.filter((row) => !row.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length === 0 ? 0 : 1);
