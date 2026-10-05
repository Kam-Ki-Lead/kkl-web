/**
 * Completes browser checks that remain after mutation fixtures were exercised
 * (review/resume already applied). Does not reseed or click retry.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadPlaywright } from "./repo-paths.mjs";

const chromium = loadPlaywright().chromium;

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3812";
const BACKEND = process.env.BACKEND_URL ?? "http://127.0.0.1:4011";
const STAFF = process.env.STAFF_PHONE ?? "9800004030";
const SELLER = process.env.SELLER_PHONE ?? "9800004011";
const SUPPRESSED = "ee7883aa-61bd-49f2-9aad-8c002bd1189d";
const INTERRUPTED = "4498f44b-1a19-453c-924a-3fb0722d4f75";

function loadSecret() {
  if (process.env.KKL_DEV_AUTH_SECRET) return process.env.KKL_DEV_AUTH_SECRET;
  const raw = readFileSync(join(process.env.LOCALAPPDATA ?? "", "kkl-postgres", "local.env"), "utf8");
  return raw.split(/\r?\n/).find((r) => r.startsWith("KKL_DEV_AUTH_SECRET=")).slice("KKL_DEV_AUTH_SECRET=".length).trim();
}
const SECRET = loadSecret();
const results = [];
const ok = (n, p, d) => { results.push({ n, p }); console.log(`${p ? "PASS" : "FAIL"}  ${n}\n      ${d}`); };

async function apiLogin(phone) {
  const codeRes = await fetch(`${BACKEND}/v1/auth/code`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: `+91${phone}` }),
  });
  const { challengeId } = await codeRes.json();
  const code = (await (await fetch(`${BACKEND}/v1/dev/challenges/${challengeId}/code`, {
    headers: { "x-kkl-dev-secret": SECRET },
  })).json()).code;
  const sess = await (await fetch(`${BACKEND}/v1/auth/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ challengeId, code }),
  })).json();
  return sess.accessToken;
}

async function getRun(token, id) {
  return (await (await fetch(`${BACKEND}/v1/admin/qualification/runs/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })).json());
}

async function recover(token, id, action) {
  const res = await fetch(`${BACKEND}/v1/admin/qualification/runs/${id}/recover`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ action }),
  });
  return { status: res.status, body: await res.json() };
}

async function devCode(id) {
  return (await (await fetch(`${BACKEND}/v1/dev/challenges/${id}/code`, {
    headers: { "x-kkl-dev-secret": SECRET },
  })).json()).code;
}
function challengeId(cookies) {
  const c = cookies.find((i) => i.name === "kkl_auth_challenge");
  const raw = c.value.includes("%") ? decodeURIComponent(c.value) : c.value;
  return JSON.parse(raw).challengeId;
}
async function signIn(page, mobile, nextPath) {
  await page.goto(`${BASE}/auth?next=${encodeURIComponent(nextPath)}`, { waitUntil: "networkidle" });
  await page.fill("#auth-mobile", mobile);
  await page.click('button:has-text("Send code")');
  await page.waitForSelector("#auth-code", { timeout: 20000 });
  await page.fill("#auth-code", await devCode(challengeId(await page.context().cookies())));
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 20000 }),
    page.click('button:has-text("Verify and continue")'),
  ]);
}

const token = await apiLogin(STAFF);
const interrupted = await getRun(token, INTERRUPTED);
ok(
  "Interrupted after-state is collecting without dispatch",
  interrupted.state === "collecting"
    && interrupted.capabilities?.resume?.allowed === false
    && (interrupted.providerDispatch == null || interrupted.providerDispatch.dispatched === false),
  JSON.stringify({
    state: interrupted.state,
    reviewStatus: interrupted.reviewStatus,
    failureReason: interrupted.failureReason,
    resume: interrupted.capabilities?.resume,
    providerDispatch: interrupted.providerDispatch,
  }),
);

const suppressedTry = await recover(token, SUPPRESSED, "resume");
ok(
  "Suppressed resume refused by server",
  suppressedTry.status === 409 && /suppression/i.test(JSON.stringify(suppressedTry.body)),
  JSON.stringify(suppressedTry),
);

const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, STAFF, `/admin/voice/${SUPPRESSED}`);
  await page.goto(`${BASE}/admin/voice/${SUPPRESSED}`, { waitUntil: "networkidle" });
  let body = await page.locator("body").innerText();
  ok(
    "Suppressed run UI blocks recovery controls",
    /suppression|suppressed|opted out|opted_out/i.test(body)
      && !/Resume incomplete run/i.test(body),
    body.replace(/\s+/g, " ").slice(0, 400),
  );

  await page.goto(`${BASE}/admin/voice/${INTERRUPTED}`, { waitUntil: "networkidle" });
  body = await page.locator("body").innerText();
  ok(
    "Interrupted run reload shows collecting after resume",
    /collecting/i.test(body) && !/Resume incomplete run/i.test(body),
    body.replace(/\s+/g, " ").slice(0, 300),
  );

  await page.goto(`${BASE}/admin/system`, { waitUntil: "networkidle" });
  body = await page.locator("body").innerText();
  ok(
    "System page does not submit due retries",
    /invoke dial|not submitted|simulated-provider/i.test(body)
      && !/Process due provider retries/i.test(body),
    "ok",
  );
  await context.close();

  const sellerCtx = await browser.newContext();
  const sellerPage = await sellerCtx.newPage();
  await signIn(sellerPage, SELLER, "/admin/leads");
  await sellerPage.goto(`${BASE}/admin/leads`, { waitUntil: "networkidle" });
  body = await sellerPage.locator("body").innerText();
  ok(
    "Seller denied staff lead inventory",
    /staff|seller account|operations console/i.test(body) && !/inventory:\s*true/i.test(body),
    body.replace(/\s+/g, " ").slice(0, 300),
  );
  await sellerCtx.close();

  const p4 = await (await fetch(`${BACKEND}/health`)).json();
  const p3 = await (await fetch("http://127.0.0.1:4010/health")).json();
  ok(
    "Phase 4 origin 4011 separate; liveTelephony false",
    p4.ok && p3.ok && p4.voiceBridge?.liveTelephony === false && p4.voiceBridge?.providerVerified === false,
    `pv=${p4.voiceBridge?.providerVerified}`,
  );
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.p);
console.log(`\n${results.length - failed.length}/${results.length} completion checks passed`);
process.exit(failed.length ? 1 : 0);
