/**
 * A-25 in a browser: a run held for review, settled on the real screen.
 *
 * WHY THIS EXISTS
 *
 * A run with two answers against the same question used to be a dead end.
 * The conflict was visible and there was no action that ended it. The
 * backend now takes a resolution and the Admin run page offers one, and the
 * difference between "the contract exists" and "a staff member can use it"
 * is exactly what a unit test cannot tell you.
 *
 * It also checks what must NOT happen when somebody settles an answer: no
 * visit request is altered, no consent is recorded, nothing is dispatched to
 * a provider.
 *
 * WHAT IT WILL NOT DO
 *
 * Send a message, place a call, or touch a review database. The run is seeded
 * through the ordinary voice-bridge contract against whatever DATABASE_URL
 * the backend was started with, and the caller is responsible for that being
 * a disposable one.
 *
 * Run (kkl-backend and kkl-web already up):
 *   BASE_URL=http://127.0.0.1:3813 BACKEND_URL=http://127.0.0.1:4013 \
 *   KKL_DEV_AUTH_SECRET=... STAFF_PHONE=9800005050 \
 *   PLAYWRIGHT=playwright-core CHROME=/path/to/chrome \
 *   node scripts/verify-contradiction-resolution.mjs
 */
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadPlaywright, revisions, WEB_ROOT } from "./repo-paths.mjs";

const chromium = loadPlaywright().chromium;
if (!chromium) throw new Error("playwright chromium export missing");

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3813";
const BACKEND = process.env.BACKEND_URL ?? "http://127.0.0.1:4013";
const SECRET = process.env.KKL_DEV_AUTH_SECRET;
const STAFF = process.env.STAFF_PHONE ?? "9800005050";
const CHROME = process.env.CHROME ?? undefined;
const OUT = process.env.EVIDENCE
  ?? join(WEB_ROOT, "docs/evidence/contradiction-resolution.json");
if (!SECRET) throw new Error("KKL_DEV_AUTH_SECRET is required");

const QUESTIONS = JSON.parse(readFileSync(
  join(process.env.KKL_BACKEND_ROOT ?? join(WEB_ROOT, "../kkl-backend"),
    "data/qualification-questions.client.v1.json"), "utf8"));

const checks = [];
const ok = (name, pass, detail) => {
  checks.push({ name, pass, detail: String(detail).slice(0, 600) });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}\n      ${String(detail).slice(0, 300)}`);
};

// ------------------------------------------------------------- backend ----

async function api(token, path, init = {}) {
  const response = await fetch(`${BACKEND}${path}`, {
    ...init,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

async function devCode(challengeId) {
  const response = await fetch(`${BACKEND}/v1/dev/challenges/${challengeId}/code`, {
    headers: { "x-kkl-dev-secret": SECRET },
  });
  if (!response.ok) throw new Error(`dev code ${response.status}`);
  return (await response.json()).code;
}

async function loginApi(phone) {
  const code = await api(null, "/v1/auth/code", {
    method: "POST", body: { phone: phone.startsWith("+") ? phone : `+91${phone}` },
  });
  if (code.status >= 400) throw new Error(`auth/code ${code.status}`);
  const challengeId = code.body.challengeId;
  const session = await api(null, "/v1/auth/sessions", {
    method: "POST", body: { challengeId, code: await devCode(challengeId) },
  });
  if (session.status >= 400) throw new Error(`sessions ${session.status}`);
  return session.body.accessToken;
}

/**
 * A run that ends with two different answers to the same question.
 *
 * Seeded through the ordinary voice-bridge contract, so the conflict is the
 * one the application produces rather than rows written behind its back.
 */
async function seedContradictedRun(token, setId) {
  const reference = `WF-${randomUUID().slice(0, 8)}`;
  const lead = await api(token, "/v1/leads/intake", {
    method: "POST",
    body: {
      source: "manual",
      items: [{
        reference, fullName: "Conflicted Person",
        phone: `+91555${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`,
        summary: "Synthetic fixture for the A-25 browser check. Not a real enquiry.",
        budgetBand: "25l_50l",
      }],
    },
  });
  const leadId = lead.body?.accepted?.[0]?.id;
  if (!leadId) throw new Error(`lead intake: ${JSON.stringify(lead.body).slice(0, 400)}`);

  const started = await api(token, "/v1/admin/qualification/runs", {
    method: "POST",
    body: { channel: "voice", leadId, questionSetId: setId, idempotencyKey: `wf-${randomUUID()}` },
  });
  if (started.status !== 201) throw new Error(`start run ${started.status} ${JSON.stringify(started.body)}`);
  const runId = started.body.id;
  const callId = started.body.calls[0].id;

  let sequence = 0;
  const say = async (questionKey, value) => {
    sequence += 1;
    const res = await fetch(`${BACKEND}/v1/voice-bridge/calls/${callId}/segments`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.KKL_VOICE_BRIDGE_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sequence, speaker: "caller", text: "spoken",
        extracted: { questionKey, status: "answered", value },
      }),
    });
    if (!res.ok) throw new Error(`segment ${questionKey}: ${res.status} ${await res.text()}`);
  };
  await say("q01_full_name", "Conflicted Person");
  await say("q02_mobile_number", "+915550007070");
  await say("q04_city", { optionId: "q04_kolkata" });
  await say("q04_city", { optionId: "q04_hooghly" });
  return { runId, leadId, reference };
}

// -------------------------------------------------------------- browser ---

function challengeIdFrom(cookies) {
  const cookie = cookies.find((item) => item.name === "kkl_auth_challenge");
  if (!cookie) return null;
  const raw = cookie.value.includes("%") ? decodeURIComponent(cookie.value) : cookie.value;
  return JSON.parse(raw).challengeId ?? null;
}

async function signIn(page, mobile, nextPath) {
  await page.goto(`${BASE}/auth?next=${encodeURIComponent(nextPath)}`, { waitUntil: "networkidle" });
  await page.fill("#auth-mobile", mobile);
  await page.click('button:has-text("Send code")');
  await page.waitForSelector("#auth-code", { timeout: 30000 });
  const id = challengeIdFrom(await page.context().cookies());
  if (!id) throw new Error("challenge cookie missing");
  await page.fill("#auth-code", await devCode(id));
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 30000 }),
    page.click('button:has-text("Verify and continue")'),
  ]);
}

// ----------------------------------------------------------------- run ----

const token = await loginApi(STAFF);

// R-ACC-02: no request promotes an account to staff, with any secret. The
// phone below must already be staff, which the operator tool does:
//   node src/bin/provision-account.mjs --phone +91<STAFF_PHONE> --role staff \
//     --name "…" --reason "…"
const sets = await api(token, "/v1/admin/qualification/question-sets");
if (sets.status === 403) {
  throw new Error(
    `+91${STAFF} is not a staff account on this backend. Promote it with `
    + "src/bin/provision-account.mjs before running this script.",
  );
}
let setId = sets.body?.questionSets?.find((s) => s.provenance === "client_supplied"
  && s.status === "active")?.id;
if (!setId) {
  const registered = await api(token, "/v1/admin/qualification/question-sets", {
    method: "POST",
    body: {
      versionLabel: `client-browser-${randomUUID().slice(0, 8)}`,
      provenance: "client_supplied", activate: true,
      questions: QUESTIONS.questions.map((q) => ({
        key: q.key, prompt: q.prompt, required: q.required,
        answerSchema: q.answerSchema, collects: q.collects,
      })),
    },
  });
  if (registered.status !== 201) {
    throw new Error(`question set ${registered.status} ${JSON.stringify(registered.body)}`);
  }
  setId = registered.body.id;
}

const seeded = await seedContradictedRun(token, setId);
const runPath = `/admin/voice/${seeded.runId}`;
const before = await api(token, `/v1/admin/qualification/runs/${seeded.runId}`);
ok("A run with two answers to one question is held for review",
  before.body.state === "incomplete" && before.body.failureReason === "contradictory_answers",
  `state=${before.body.state} failureReason=${before.body.failureReason}`);

const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
const evidence = { revisions: revisions(), runId: seeded.runId, checks };
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, STAFF, runPath);
  await page.goto(`${BASE}${runPath}`, { waitUntil: "networkidle" });

  const body = () => page.locator("body").innerText();
  // The run page also carries a review form with a field named `reason`, so
  // every control here is addressed through the conflict's own form.
  const form = page.locator('form:has(#reason-q04_city)');
  const reason = form.locator("#reason-q04_city");

  // 1 — the conflict is on screen, with both sides and their evidence.
  const screen = await body();
  ok("The conflict is shown with the client's own question",
    screen.includes("Contradictions") && screen.includes("Which city are you looking to buy in"),
    screen.split("\n").filter((l) => /Contradict|Which city/.test(l)).join(" | "));
  ok("Both answers are offered as labels, not option ids",
    screen.includes("Kolkata") && screen.includes("Hooghly") && !screen.includes("q04_kolkata"),
    screen.split("\n").filter((l) => /Kolkata|Hooghly/.test(l)).slice(0, 4).join(" | "));
  ok("Resolving is said not to contact anybody",
    /does not contact anybody/i.test(screen),
    screen.split("\n").find((l) => /does not contact anybody/i.test(l)) ?? "absent");

  // 2 — validation: a missing reason is refused beside the field.
  await form.locator('input[name="keepAnswerId"]').first().check();
  await form.locator('button:has-text("Record this resolution")').click();
  await page.waitForTimeout(1200);
  const invalidReason = await reason
    .evaluate((el) => el.validationMessage || (el.checkValidity() ? "" : "invalid"));
  ok("An empty reason never reaches the service",
    invalidReason !== "" || /reason/i.test(await body()),
    `browser validation: ${invalidReason || "(custom message shown)"}`);

  // 3 — a reason shorter than the service accepts is caught on the screen,
  //     with what was typed still in the box.
  await reason.fill("x");
  await form.locator('button:has-text("Record this resolution")').click();
  await page.waitForTimeout(1500);
  const afterShort = await body();
  const kept = await reason.inputValue();
  ok("A too-short reason is rejected without losing what was typed",
    /at least 3 characters/i.test(afterShort) && kept === "x",
    `${afterShort.split("\n").find((l) => /at least 3/i.test(l)) ?? "no message"} · kept="${kept}"`);

  // 4 — the real save.
  await reason.fill("She confirmed Hooghly when we rang back on 7 October.");
  await form.locator('input[name="keepAnswerId"]').nth(1).check();
  await form.locator('button:has-text("Record this resolution")').click();
  // The confirmation belongs to the panel, not the form: a saved resolution
  // removes the conflict and the form with it.
  await page.getByText(/Nobody was contacted/).waitFor({ timeout: 30000 });
  const saved = await body();
  ok("The resolution saves and says what did not happen",
    /Nobody was contacted/.test(saved) && /no suppression was lifted/.test(saved),
    saved.split("\n").find((l) => /Nobody was contacted/.test(l)) ?? saved.slice(0, 300));
  ok("Resuming is reported, and not as a call",
    /gone back to collecting/.test(saved) && !/dialled|called them/i.test(saved),
    saved.split("\n").find((l) => /collecting/.test(l)) ?? "absent");

  // 5 — the record, read back from the service.
  const after = await api(token, `/v1/admin/qualification/runs/${seeded.runId}`);
  ok("The run went back to collecting",
    after.body.state === "collecting" && after.body.failureReason === null,
    `state=${after.body.state} failureReason=${after.body.failureReason}`);
  const conflicts = await api(token,
    `/v1/admin/qualification/runs/${seeded.runId}/contradictions`);
  ok("Nothing is left unresolved, and the decision is recorded with who made it",
    conflicts.body.unresolved.length === 0 && conflicts.body.resolved.length === 1
      && conflicts.body.resolved[0].actorRole === "staff",
    JSON.stringify(conflicts.body.resolved[0] ?? null).slice(0, 300));
  ok("The original answers are kept as evidence",
    after.body.answers.filter((a) => a.questionKey === "q04_city").length === 3,
    after.body.answers.filter((a) => a.questionKey === "q04_city")
      .map((a) => `${a.status}${a.supersededReason ? `/${a.supersededReason}` : ""}`).join(", "));
  ok("No consent was recorded by resolving",
    (after.body.consentEvidence ?? []).length === 0,
    `${(after.body.consentEvidence ?? []).length} evidence rows`);

  // 6 — the resolved panel, reloaded.
  await page.reload({ waitUntil: "networkidle" });
  const reloaded = await body();
  ok("The settled decision survives a reload and reads as append-only",
    /Already settled/.test(reloaded) && /cannot be edited or removed/.test(reloaded),
    reloaded.split("\n").filter((l) => /Already settled|append|cannot be edited/i.test(l)).join(" | "));
  ok("Staleness is reported without the page recomputing anything",
    /Recommendations/.test(reloaded) && /out of date|up to date/.test(reloaded),
    reloaded.split("\n").find((l) => /out of date|up to date/.test(l)) ?? "absent");

  // 7 — the refresh, as an action.
  await page.locator('button:has-text("Recompute from the current answers")').click();
  await page.waitForTimeout(2500);
  const refreshed = await body();
  ok("Recomputing says what it did not touch",
    /No visit request was cancelled, replaced or duplicated/.test(refreshed),
    refreshed.split("\n").find((l) => /visit request was cancelled/.test(l)) ?? refreshed.slice(0, 300));

  // 8 — role isolation on the screen, not only in the service.
  const customer = await browser.newContext();
  const customerPage = await customer.newPage();
  await customerPage.goto(`${BASE}${runPath}`, { waitUntil: "networkidle" });
  ok("A signed-out visitor is sent to sign in rather than shown the conflict",
    customerPage.url().includes("/auth"), customerPage.url());
  await customer.close();

  // 9 — a service error reads as one, not as a blank panel.
  //
  // Checked with the backend unreachable, which is the service failure a
  // browser can actually produce here: the conflicts read runs inside the
  // Next server, so a page-level route interception never sees it. The
  // conflicts-specific message is covered in tests/contradiction-resolution.
  if (process.env.UNREACHABLE_RUN_PATH) {
    const page2 = await context.newPage();
    await page2.goto(`${BASE}${process.env.UNREACHABLE_RUN_PATH}`, { waitUntil: "networkidle" });
    const text = await page2.locator("body").innerText();
    ok("A run that cannot be loaded says so rather than rendering an empty page",
      /could not be loaded|not found/i.test(text), text.slice(0, 200));
    await page2.close();
  } else {
    checks.push({
      name: "A service failure on the conflicts read",
      pass: null,
      detail: "Not exercised in a browser: the read happens inside the Next server, where a "
        + "page-level route interception does not reach. Covered by "
        + "tests/contradiction-resolution.test.mjs instead.",
    });
    console.log("SKIP  A service failure on the conflicts read (server-side fetch, see tests)");
  }

  await context.close();
} finally {
  await browser.close();
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(evidence, null, 2)}\n`);
const failed = checks.filter((c) => c.pass === false);
const skipped = checks.filter((c) => c.pass === null);
console.log(`\n${checks.length - failed.length - skipped.length}/${
  checks.length - skipped.length} checks passed`
  + (skipped.length ? `, ${skipped.length} not exercised in a browser` : "")
  + `. Evidence: ${OUT}`);
if (failed.length) process.exit(1);
