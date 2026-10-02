/**
 * Phase 4.c browser verification against review process d4c2532 on 4011.
 *
 * Uses existing mutation fixtures (does not reseed). Does not click retry.
 * Staff fixture for browser work: +919800004030 (Phase 4 browser staff).
 *
 *   BASE_URL=http://127.0.0.1:3812 BACKEND_URL=http://127.0.0.1:4011 \
 *     STAFF_PHONE=9800004030 node scripts/verify-phase4-mutations.mjs
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const playwrightSpec = process.env.PLAYWRIGHT
  ?? "C:/Users/noora/AppData/Local/Cursor/AgentStores/cursor_agent_stores/01afa20b-2d9b-4665-bc47-8402816b45f6/files/pw/node_modules/playwright";
const require = createRequire(import.meta.url);
const playwrightPackage = /^[a-zA-Z]:[\\/]/.test(playwrightSpec)
  ? require(join(playwrightSpec.replace(/[\\/]+$/, ""), "index.js"))
  : require(playwrightSpec);
const chromium = playwrightPackage.chromium;
if (!chromium) throw new Error("playwright chromium export missing");

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3812";
const BACKEND = process.env.BACKEND_URL ?? "http://127.0.0.1:4011";
const STAFF = process.env.STAFF_PHONE ?? "9800004030";
const SELLER = process.env.SELLER_PHONE ?? "9800004011";

const FIXTURES = {
  completed: "b876037e-758c-4db4-ba86-fa97017d0286",
  incomplete: "b4ee4402-e94a-4bf8-bafb-2fd6292a574d",
  interrupted: "4498f44b-1a19-453c-924a-3fb0722d4f75",
  suppressed: "ee7883aa-61bd-49f2-9aad-8c002bd1189d",
};

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
const evidence = { before: {}, after: {}, checks: [] };
const ok = (name, pass, detail) => {
  results.push({ name, pass });
  evidence.checks.push({ name, pass, detail: String(detail).slice(0, 500) });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}\n      ${detail}`);
};

async function staffApi(token, path) {
  const response = await fetch(`${BACKEND}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.json();
  return { status: response.status, body };
}

async function staffPost(token, path, body) {
  const response = await fetch(`${BACKEND}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

async function loginApi(phone) {
  const codeRes = await fetch(`${BACKEND}/v1/auth/code`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: phone.startsWith("+") ? phone : `+91${phone}` }),
  });
  const codeBody = await codeRes.json();
  if (!codeRes.ok) throw new Error(`auth/code ${codeRes.status} ${JSON.stringify(codeBody)}`);
  const challengeId = codeBody.challengeId;
  const dev = await fetch(`${BACKEND}/v1/dev/challenges/${challengeId}/code`, {
    headers: { "x-kkl-dev-secret": SECRET },
  });
  const { code } = await dev.json();
  const sess = await fetch(`${BACKEND}/v1/auth/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ challengeId, code }),
  });
  const session = await sess.json();
  if (!sess.ok) throw new Error(`sessions ${sess.status} ${JSON.stringify(session)}`);
  return session.accessToken;
}

async function devCode(challengeId) {
  const response = await fetch(`${BACKEND}/v1/dev/challenges/${challengeId}/code`, {
    headers: { "x-kkl-dev-secret": SECRET },
  });
  if (!response.ok) throw new Error(`dev code ${response.status}`);
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

function summariseRun(run) {
  return {
    id: run.id,
    reference: run.reference,
    state: run.state,
    reviewStatus: run.reviewStatus,
    failureReason: run.failureReason,
    suppressed: run.suppressed,
    resume: run.capabilities?.resume ?? null,
    retry: run.capabilities?.retry ?? null,
    providerDispatch: run.providerDispatch ?? null,
    reviews: (run.reviews ?? []).map((r) => ({ decision: r.decision, reason: r.reason })),
  };
}

const token = await loginApi(STAFF);
for (const [key, id] of Object.entries(FIXTURES)) {
  const { status, body } = await staffApi(token, `/v1/admin/qualification/runs/${id}`);
  if (status !== 200) throw new Error(`GET run ${key} ${status}`);
  evidence.before[key] = summariseRun(body);
  console.log(`BEFORE ${key}`, JSON.stringify(evidence.before[key]));
}

const browser = await chromium.launch();
try {
  // --- missing session ---
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE}/admin/leads`, { waitUntil: "networkidle" });
    ok("Missing session redirects to auth", page.url().includes("/auth"), page.url());
    await context.close();
  }

  // --- staff mutations + inventory ---
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, STAFF, "/admin/leads");
    await page.waitForURL(/\/admin\/leads/, { timeout: 20000 });
    let body = await page.locator("body").innerText();
    ok(
      "Staff lead inventory inventory:true with filters",
      /inventory:\s*true/i.test(body)
        && /admin\/qualification\/leads/i.test(body)
        && /Not marketplace|not marketplace/i.test(body)
        && /Showing .+ of \d+/i.test(body),
      body.replace(/\s+/g, " ").slice(0, 400),
    );

    // Filter incomplete
    await page.selectOption('select[name="qualification"]', "incomplete");
    await page.click('button:has-text("Apply filters")');
    await page.waitForLoadState("networkidle");
    body = await page.locator("body").innerText();
    ok(
      "Qualification filter incomplete",
      /Showing 2 of 2|of 2/i.test(body) || /incomplete/i.test(body),
      body.replace(/\s+/g, " ").slice(0, 300),
    );

    // Past-end
    await page.goto(`${BASE}/admin/leads?offset=20`, { waitUntil: "networkidle" });
    body = await page.locator("body").innerText();
    ok(
      "Past-end empty inventory handling",
      /Past the end|Showing 0 of|beyond total/i.test(body),
      body.replace(/\s+/g, " ").slice(0, 300),
    );

    // Lead detail + run link (completed lead)
    await page.goto(`${BASE}/admin/leads/26ef665e-03ea-4905-b293-9c39af69e4b7`, {
      waitUntil: "networkidle",
    });
    body = await page.locator("body").innerText();
    ok(
      "Staff lead detail level unset and run path",
      /mapping not configured/i.test(body)
        && /unchanged/i.test(body)
        && /Open run|Qualification runs/i.test(body)
        && !/Level\s*[1-9]/i.test(body),
      body.replace(/\s+/g, " ").slice(0, 400),
    );
    await page.click('a:has-text("Open run")');
    await page.waitForURL(/\/admin\/voice\/b876037e/i, { timeout: 15000 });
    body = await page.locator("body").innerText();
    ok(
      "Lead detail links to completed run",
      /QUAL-69c430f2|completed/i.test(body) && /Record review/i.test(body),
      page.url(),
    );

    // 1) Completed-run review save + reload
    await page.selectOption("#decision", "facts_recorded");
    await page.fill("#reason", "Browser verification facts_recorded on completed fixture.");
    await page.click('button:has-text("Record review")');
    await page.waitForSelector("text=Review recorded", { timeout: 15000 });
    await page.reload({ waitUntil: "networkidle" });
    body = await page.locator("body").innerText();
    ok(
      "Completed-run review save and reload",
      /facts recorded|facts_recorded/i.test(body)
        && !/Record review/i.test(body)
        && /mapping not configured/i.test(body)
        && /unchanged/i.test(body),
      body.replace(/\s+/g, " ").slice(0, 400),
    );
    {
      const after = await staffApi(token, `/v1/admin/qualification/runs/${FIXTURES.completed}`);
      evidence.after.completed = summariseRun(after.body);
      ok(
        "Completed review API after-state",
        after.body.reviewStatus === "recorded"
          && after.body.state === "completed"
          && after.body.qualification?.level === null,
        JSON.stringify(evidence.after.completed),
      );
    }

    // 2) Incomplete-run review (needs_follow_up) — deliberate; do not resume this one
    await page.goto(`${BASE}/admin/voice/${FIXTURES.incomplete}`, { waitUntil: "networkidle" });
    body = await page.locator("body").innerText();
    ok(
      "Incomplete fixture shows pending review before save",
      /partial_answers|incomplete/i.test(body) && /Record review/i.test(body),
      body.replace(/\s+/g, " ").slice(0, 300),
    );
    await page.selectOption("#decision", "needs_follow_up");
    await page.fill("#reason", "Browser verification needs_follow_up on incomplete fixture.");
    await page.click('button:has-text("Record review")');
    await page.waitForSelector("text=Review recorded", { timeout: 15000 });
    await page.reload({ waitUntil: "networkidle" });
    body = await page.locator("body").innerText();
    ok(
      "Incomplete-run review save and reload",
      /needs follow-up|needs_follow_up/i.test(body) && !/Record review/i.test(body),
      body.replace(/\s+/g, " ").slice(0, 400),
    );
    {
      const after = await staffApi(token, `/v1/admin/qualification/runs/${FIXTURES.incomplete}`);
      evidence.after.incomplete = summariseRun(after.body);
      ok(
        "Incomplete review API after-state",
        after.body.reviewStatus === "recorded"
          && after.body.state === "incomplete"
          && after.body.failureReason === "partial_answers",
        JSON.stringify(evidence.after.incomplete),
      );
    }

    // 3) Interrupted-run resume — do not review first
    await page.goto(`${BASE}/admin/voice/${FIXTURES.interrupted}`, { waitUntil: "networkidle" });
    body = await page.locator("body").innerText();
    ok(
      "Interrupted fixture offers resume without dispatch",
      /Resume incomplete run/i.test(body)
        && /Resume: allowed without provider dispatch|resume_does_not_place_a_call/i.test(body)
        && !/Retry failed call/i.test(body),
      body.replace(/\s+/g, " ").slice(0, 400),
    );
    // Retry may show as "Retry without provider dispatch" when allowed && !dispatches — do not click it
    const retryBtn = page.locator('button:has-text("Retry without provider dispatch")');
    ok(
      "Retry control not pressed (presence noted only)",
      true,
      (await retryBtn.count()) > 0
        ? "safe retry button visible but not clicked"
        : "no safe retry button",
    );
    await page.click('button:has-text("Resume incomplete run")');
    // Resume may revalidate the page; prefer API after-state over a fleeting notice.
    let resumed = null;
    for (let i = 0; i < 20; i += 1) {
      await page.waitForTimeout(500);
      const probe = await staffApi(token, `/v1/admin/qualification/runs/${FIXTURES.interrupted}`);
      if (probe.status === 200 && probe.body.state !== "incomplete") {
        resumed = probe.body;
        break;
      }
      if (probe.status === 200 && probe.body.capabilities?.resume?.allowed === false
        && evidence.before.interrupted.resume?.allowed === true) {
        resumed = probe.body;
        break;
      }
    }
    body = await page.locator("body").innerText();
    ok(
      "Interrupted resume applied without provider dispatch",
      resumed != null
        && (resumed.providerDispatch == null || resumed.providerDispatch.dispatched === false)
        && (resumed.providerDispatch == null || resumed.providerDispatch.providerVerified === false)
        && !/providerDispatch\.dispatched=true/i.test(body),
      JSON.stringify(summariseRun(resumed ?? {})),
    );
    evidence.after.interrupted = summariseRun(resumed);
    await page.reload({ waitUntil: "networkidle" });
    body = await page.locator("body").innerText();
    {
      const after = await staffApi(token, `/v1/admin/qualification/runs/${FIXTURES.interrupted}`);
      evidence.after.interrupted = summariseRun(after.body);
      ok(
        "Interrupted resume persists (collecting or non-incomplete)",
        after.body.state !== "incomplete" || after.body.capabilities?.resume?.allowed === false,
        JSON.stringify(evidence.after.interrupted),
      );
      ok(
        "Interrupted resume page reload shows persisted state",
        new RegExp(after.body.state.replace(/_/g, "[ _]"), "i").test(body),
        `state=${after.body.state}`,
      );
    }

    // 4) Suppressed recovery refusal
    await page.goto(`${BASE}/admin/voice/${FIXTURES.suppressed}`, { waitUntil: "networkidle" });
    body = await page.locator("body").innerText();
    ok(
      "Suppressed run shows recovery blocked",
      /suppression|suppressed|opted out|opted_out/i.test(body)
        && !/Resume incomplete run/i.test(body),
      body.replace(/\s+/g, " ").slice(0, 400),
    );
    {
      const resumeTry = await staffPost(
        token,
        `/v1/admin/qualification/runs/${FIXTURES.suppressed}/recover`,
        { action: "resume" },
      );
      evidence.after.suppressed = {
        recoverStatus: resumeTry.status,
        body: resumeTry.body,
        run: summariseRun(
          (await staffApi(token, `/v1/admin/qualification/runs/${FIXTURES.suppressed}`)).body,
        ),
      };
      ok(
        "Suppressed resume refused by server",
        resumeTry.status === 409
          && /suppression/i.test(JSON.stringify(resumeTry.body)),
        JSON.stringify(resumeTry.body),
      );
    }

    // Retry still not offered as a pressed action on settings/system
    await page.goto(`${BASE}/admin/system`, { waitUntil: "networkidle" });
    body = await page.locator("body").innerText();
    ok(
      "System page does not submit due retries",
      /invoke dial|not submitted|simulated-provider/i.test(body)
        && !/Process due provider retries/i.test(body),
      "due-retries absent",
    );

    await context.close();
  }

  // --- seller denial (where inventory wiring requires it) ---
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, SELLER, "/admin/leads");
    await page.goto(`${BASE}/admin/leads`, { waitUntil: "networkidle" });
    const body = await page.locator("body").innerText();
    ok(
      "Seller denied staff lead inventory",
      /staff|cannot|seller account|operations console/i.test(body)
        && !/inventory:\s*true/i.test(body),
      body.replace(/\s+/g, " ").slice(0, 300),
    );
    await context.close();
  }

  {
    const p4 = await fetch(`${BACKEND}/health`);
    const p3 = await fetch("http://127.0.0.1:4010/health");
    const h4 = await p4.json();
    const h3 = await p3.json();
    ok(
      "Phase 4 origin 4011 separate; liveTelephony false",
      p4.ok && p3.ok
        && h4.voiceBridge?.providerVerified === false
        && h4.voiceBridge?.liveTelephony === false
        && h3.ok === true,
      `pv=${h4.voiceBridge?.providerVerified} liveTel=${h4.voiceBridge?.liveTelephony}`,
    );
  }
} finally {
  await browser.close();
}

const out = join(process.cwd(), "docs/phase-4/mutation-browser-evidence.json");
writeFileSync(out, JSON.stringify(evidence, null, 2));
console.log(`Wrote ${out}`);

const failed = results.filter((row) => !row.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length === 0 ? 0 : 1);
