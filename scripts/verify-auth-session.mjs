/**
 * Browser session against the published auth routes.
 *
 * The one-time code is read from GET /v1/dev/challenges/{id}/code with the
 * shared secret. That is the documented development channel. It is not
 * production authentication, and the page must say so when the channel is
 * `local`. The code and the refresh token must not appear in the HTML or in
 * document.cookie.
 *
 * Requires a production build already serving, with KKL_AUTH=backend and
 * KKL_ENQUIRIES=backend pointed at the same process this script calls
 * BACKEND_URL. scripts/auth-dev-stub.mjs is a stand-in for that process
 * when kkl-backend itself is not the one under test.
 *
 *   NEXT_PUBLIC_KKL_ENV=review NEXT_PUBLIC_KKL_DATA_SOURCE=sample npx next build
 *   KKL_ENV=review KKL_DATA_SOURCE=sample KKL_AUTH=backend KKL_ENQUIRIES=backend \
 *     KKL_BACKEND_BASE_URL=http://127.0.0.1:4011 npx next start -p 3811
 *   KKL_DEV_AUTH_SECRET=... PORT=4011 node scripts/auth-dev-stub.mjs
 *   PLAYWRIGHT=... BASE_URL=http://127.0.0.1:3811 BACKEND_URL=http://127.0.0.1:4011 \
 *     KKL_DEV_AUTH_SECRET=... node scripts/verify-auth-session.mjs
 */

import { pathToFileURL } from "node:url";

const playwrightSpec = process.env.PLAYWRIGHT ?? "playwright";
const playwrightHref = /^[a-zA-Z]:[\\/]/.test(playwrightSpec)
  ? pathToFileURL(playwrightSpec).href
  : playwrightSpec;
const { chromium } = await import(playwrightHref);

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3811";
const BACKEND = process.env.BACKEND_URL ?? "http://127.0.0.1:4011";
const SECRET = process.env.KKL_DEV_AUTH_SECRET ?? "";
if (!SECRET) {
  console.error("KKL_DEV_AUTH_SECRET is required");
  process.exit(1);
}

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
  if (!cookie?.httpOnly) return null;
  const raw = cookie.value.includes("%") ? decodeURIComponent(cookie.value) : cookie.value;
  return JSON.parse(raw).challengeId ?? null;
}

async function sendCode(page, mobile, { injectRole = false } = {}) {
  await page.goto(`${BASE}/auth?next=/account`, { waitUntil: "networkidle" });
  await page.fill("#auth-mobile", mobile);
  if (injectRole) {
    await page.$eval("form", (form) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "role";
      input.value = "staff";
      form.appendChild(input);
    });
  }
  await page.click('button:has-text("Send code")');
  await page.waitForSelector("#auth-code", { timeout: 15000 });
  const html = await page.content();
  const id = challengeId(await page.context().cookies());
  const code = id ? await devCode(id) : "";
  return { html, id, code };
}

async function verify(page, code) {
  await page.fill("#auth-code", code);
  const left = page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 15000 }).catch(() => null);
  await page.click('button:has-text("Verify and continue")');
  await left;
  if (page.url().includes("/auth")) {
    const text = await page.locator("body").innerText();
    console.log("      still on sign-in:\n      " + text.replace(/\s+/g, " ").slice(0, 500));
  }
}

const browser = await chromium.launch();

try {
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();

  await pageA.goto(`${BASE}/property/greenview-residency/enquiry`, { waitUntil: "networkidle" });
  await pageA.fill("#name", "Ananya Roy");
  await pageA.fill("#mobile", "9830012345");
  const message = await pageA.$("#message");
  if (message) await message.fill("Auth session draft.");
  await Promise.all([
    pageA.waitForURL(/\/auth/, { timeout: 15000 }),
    pageA.click("form button[type=submit]"),
  ]);

  const draft = (await contextA.cookies()).find((cookie) => cookie.name === "kkl_enquiry_draft");
  const draftBody = draft ? JSON.parse(decodeURIComponent(draft.value)) : null;
  ok("1. Enquiry draft survives into sign-in",
    Boolean(draft?.httpOnly) && draftBody?.name === "Ananya Roy" && draftBody?.mobile === "9830012345",
    `httpOnly=${draft?.httpOnly}; name=${draftBody?.name}`);

  const prefill = await pageA.inputValue("#auth-mobile");
  ok("2. The number is prefilled from the draft, not the URL",
    prefill === "9830012345" && !pageA.url().includes("9830012345"),
    `field=${prefill}; url=${pageA.url()}`);

  await pageA.click('button:has-text("Send code")');
  await pageA.waitForSelector("#auth-code", { timeout: 15000 });
  const afterSend = await pageA.content();
  const idA = challengeId(await contextA.cookies());
  const codeA = idA ? await devCode(idA) : "";
  const visibleToJs = await pageA.evaluate(() => document.cookie);
  ok("3. Local channel is named as development, and the code is not on the page",
    afterSend.includes("not production sign-in")
      && !afterSend.includes("Enter any six digits")
      && codeA.length === 6
      && !afterSend.includes(codeA)
      && !visibleToJs.includes(codeA),
    `code length ${codeA.length}; sample banner absent`);

  const draftStill = (await contextA.cookies()).find((cookie) => cookie.name === "kkl_enquiry_draft");
  ok("4. Asking for a code does not drop the enquiry draft",
    draftStill?.value === draft?.value,
    "draft cookie unchanged");

  await verify(pageA, codeA);
  const confirmed = pageA.url();
  const receipt = confirmed.split("/enquiry/")[1]?.replace("/confirmed", "") ?? "";
  const sessionCookies = await contextA.cookies();
  const access = sessionCookies.find((cookie) => cookie.name === "kkl_access");
  const refresh = sessionCookies.find((cookie) => cookie.name === "kkl_refresh");
  const jsAfter = await pageA.evaluate(() => document.cookie);
  const htmlAfter = await pageA.content();
  ok("5. Verification establishes httpOnly tokens and returns to the enquiry",
    /\/enquiry\/[0-9a-f-]{36}\/confirmed/.test(confirmed)
      && access?.httpOnly === true
      && refresh?.httpOnly === true
      && !jsAfter.includes(access?.value ?? "missing-access")
      && !jsAfter.includes(refresh?.value ?? "missing-refresh")
      && !htmlAfter.includes(refresh?.value ?? "missing-refresh"),
    `url=${confirmed}; access httpOnly=${access?.httpOnly}; refresh httpOnly=${refresh?.httpOnly}`);

  const draftGone = (await contextA.cookies()).find((cookie) => cookie.name === "kkl_enquiry_draft");
  ok("6. The draft is cleared only after the enquiry is recorded",
    !draftGone && htmlAfter.includes("Enquiry sent"),
    `draft present=${Boolean(draftGone)}`);

  const meA = await fetch(`${BACKEND}/v1/me`, { headers: { authorization: `Bearer ${access.value}` } });
  const profileA = await meA.json();
  ok("7. The session's account comes from the service, and the injected role was not sent",
    meA.status === 200 && profileA.role === "buyer" && profileA.phone?.endsWith("2345"),
    `HTTP ${meA.status}; role=${profileA.role}; phone=${profileA.phone}`);

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  const sentB = await sendCode(pageB, "9830012399", { injectRole: true });
  ok("8. A client-supplied staff role does not change the code request",
    Boolean(sentB.id) && sentB.html.includes("not production sign-in"),
    `challenge=${sentB.id ?? "missing"}`);
  await verify(pageB, sentB.code);
  await pageB.waitForURL(/\/account/, { timeout: 15000 });
  const accessB = (await contextB.cookies()).find((cookie) => cookie.name === "kkl_access");
  const meB = await (await fetch(`${BACKEND}/v1/me`, {
    headers: { authorization: `Bearer ${accessB.value}` },
  })).json();
  const otherConfirmation = await pageB.goto(confirmed, { waitUntil: "networkidle" });
  const listPage = await contextB.newPage();
  await listPage.goto(`${BASE}/account/enquiries`, { waitUntil: "networkidle" });
  const listHtml = await listPage.content();
  ok("9. Another account cannot read the first enquiry",
    meB.accountId !== profileA.accountId
      && otherConfirmation?.status() === 404
      && !listHtml.includes(receipt),
    `B=${meB.accountId}; A=${profileA.accountId}; confirmation HTTP ${otherConfirmation?.status()}`);

  const refreshBefore = (await contextA.cookies()).find((cookie) => cookie.name === "kkl_refresh")?.value;
  const accessBefore = (await contextA.cookies()).find((cookie) => cookie.name === "kkl_access")?.value;
  await fetch(`${BACKEND}/__test/expire-access`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ accessToken: accessBefore }),
  });
  await pageA.goto(`${BASE}/account`, { waitUntil: "networkidle" });
  const accessAfter = (await contextA.cookies()).find((cookie) => cookie.name === "kkl_access");
  const refreshAfter = (await contextA.cookies()).find((cookie) => cookie.name === "kkl_refresh");
  ok("10. An expired access token is refreshed without showing the refresh token",
    pageA.url().startsWith(`${BASE}/account`)
      && accessAfter?.value
      && accessAfter.value !== accessBefore
      && refreshAfter?.httpOnly === true
      && refreshAfter.value !== refreshBefore
      && !(await pageA.evaluate(() => document.cookie)).includes(refreshAfter.value),
    `url=${pageA.url()}`);

  const reused = await fetch(`${BACKEND}/v1/auth/sessions/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken: refreshBefore }),
  });
  await pageA.goto(`${BASE}/account`, { waitUntil: "networkidle" });
  ok("11. Reusing a rotated refresh token ends the session",
    reused.status === 401 && pageA.url().includes("/auth"),
    `replay HTTP ${reused.status}; url=${pageA.url()}`);

  const contextC = await browser.newContext();
  const pageC = await contextC.newPage();
  await pageC.goto(`${BASE}/auth`, { waitUntil: "networkidle" });
  await pageC.fill("#auth-mobile", "9000000001");
  await pageC.click('button:has-text("Send code")');
  await pageC.waitForFunction(() => document.body.innerText.includes("Too many codes"), null, { timeout: 15000 });
  const limited = await pageC.content();
  ok("12. A rate limit stays on the number step",
    limited.includes("Too many codes") && limited.includes("60") && await pageC.$("#auth-mobile"),
    "mobile field still present");

  const pageS = await contextC.newPage();
  const sentS = await sendCode(pageS, "9000000002");
  await pageS.fill("#auth-code", sentS.code);
  await pageS.click('button:has-text("Verify and continue")');
  await pageS.waitForFunction(() => /suspended/i.test(document.body.innerText), null, { timeout: 15000 });
  const suspendedHtml = await pageS.content();
  const suspendedAccess = (await contextC.cookies()).find((cookie) => cookie.name === "kkl_access" && cookie.value);
  ok("13. A suspended account is refused and no session cookie is kept",
    suspendedHtml.includes("suspended") && !suspendedAccess,
    `access cookie=${Boolean(suspendedAccess)}`);

  await pageC.goto(`${BASE}/auth`, { waitUntil: "networkidle" });
  await pageC.fill("#auth-mobile", "9000000003");
  await pageC.click('button:has-text("Send code")');
  await pageC.waitForFunction(() => document.body.innerText.includes("No delivery provider"), null, { timeout: 15000 });
  const unavailable = await pageC.content();
  ok("14. No delivery provider does not fall back to the sample code step",
    unavailable.includes("No delivery provider") && !unavailable.includes("Enter any six digits"),
    "sample instructions absent");

  const pageE = await contextC.newPage();
  const sentE = await sendCode(pageE, "9830010004");
  await fetch(`${BACKEND}/__test/expire-challenge`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ challengeId: sentE.id }),
  });
  await pageE.fill("#auth-code", sentE.code);
  await pageE.click('button:has-text("Verify and continue")');
  await pageE.waitForFunction(() => /expired/i.test(document.body.innerText), null, { timeout: 15000 });
  const expiredHtml = await pageE.content();
  ok("15. An expired code is refused",
    /expired/i.test(expiredHtml) && !expiredHtml.includes("Enquiry sent"),
    "expired sentence shown");

  const contextD = await browser.newContext();
  const pageD = await contextD.newPage();
  const sentD = await sendCode(pageD, "9830012222");
  await verify(pageD, sentD.code);
  await pageD.waitForURL(/\/account/, { timeout: 15000 });
  await Promise.all([
    pageD.waitForURL(/\/auth/, { timeout: 15000 }),
    pageD.click('button:has-text("Sign out of every session")'),
  ]);
  const afterSignOut = await contextD.cookies();
  ok("16. Signing out everywhere revokes the session and drops the cookies",
    pageD.url().includes("/auth")
      && !afterSignOut.some((cookie) => cookie.name === "kkl_access" && cookie.value)
      && !afterSignOut.some((cookie) => cookie.name === "kkl_refresh" && cookie.value),
    pageD.url());

  await fetch(`${BACKEND}/__test/shutdown`, { method: "POST" });
  await pageC.goto(`${BASE}/auth`, { waitUntil: "networkidle" });
  await pageC.fill("#auth-mobile", "9830011111");
  await pageC.click('button:has-text("Send code")');
  await pageC.waitForFunction(() => document.body.innerText.includes("Verification is not available"), null, { timeout: 15000 });
  const down = await pageC.content();
  ok("17. An unreachable service does not accept any six digits",
    down.includes("Verification is not available") && !down.includes("Enter any six digits") && await pageC.$("#auth-mobile"),
    "still on the number step");
} finally {
  await browser.close();
}

const failed = results.filter((result) => !result.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) process.exit(1);
