/**
 * One staff sign-in that retests the two rows the full suite did not finish.
 * Seller +919800005011 is at the daily OTP cap, so this does not request a
 * seller code. It does not place a call, send a message, or submit a purchase.
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(join(process.env.PLAYWRIGHT, "index.js"));
const secret = readFileSync(join(process.env.LOCALAPPDATA, "kkl-postgres", "local.env"), "utf8")
  .split(/\r?\n/)
  .find((line) => line.startsWith("KKL_DEV_AUTH_SECRET="))
  .slice("KKL_DEV_AUTH_SECRET=".length)
  .trim();
const BASE = "http://127.0.0.1:3815";
const LEAD = "ec336642-0763-4b8e-ba21-1d9f6645ec74";
const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass, detail: String(detail).slice(0, 500) });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}\n      ${String(detail).replace(/\s+/g, " ").slice(0, 400)}`);
};

async function devCode(challengeId) {
  const response = await fetch(`http://127.0.0.1:4012/v1/dev/challenges/${challengeId}/code`, {
    headers: { "x-kkl-dev-secret": secret },
  });
  if (!response.ok) throw new Error(`dev code HTTP ${response.status}`);
  return (await response.json()).code;
}

function challengeId(cookies) {
  const cookie = cookies.find((item) => item.name === "kkl_auth_challenge");
  if (!cookie) return null;
  const raw = cookie.value.includes("%") ? decodeURIComponent(cookie.value) : cookie.value;
  return JSON.parse(raw).challengeId ?? null;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
try {
  const next = "//evil.example/steal";
  await page.goto(`${BASE}/auth?next=${encodeURIComponent(next)}`, { waitUntil: "networkidle" });
  await page.fill("#auth-mobile", "9800005010");
  await page.click('button:has-text("Send code")');
  await page.waitForSelector("#auth-code", { timeout: 20000 });
  const id = challengeId(await page.context().cookies());
  if (!id) throw new Error("challenge cookie missing");
  await page.fill("#auth-code", await devCode(id));
  await page.click('button:has-text("Verify and continue")');
  try {
    await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 20000 });
  } catch (error) {
    const alert = await page.locator("[role=alert]").allInnerTexts();
    throw new Error(`${error instanceof Error ? error.message : error} URL ${page.url()} ALERT ${alert.join(" | ")}`);
  }
  const landed = new URL(page.url());
  ok(
    "Protocol-relative next stays on this origin",
    landed.origin === new URL(BASE).origin
      && landed.hostname !== "evil.example"
      && !landed.pathname.includes("steal")
      && landed.pathname === "/account",
    page.url(),
  );

  await page.goto(`${BASE}/seller/billing/recharge`, { waitUntil: "networkidle" });
  const recharge = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  const at = recharge.indexOf("Recharge is unavailable");
  ok(
    "Recharge fails closed and does not grant credits",
    page.url().endsWith("/seller/billing/recharge")
      && /Recharge is unavailable/.test(recharge)
      && /nothing has been charged/i.test(recharge)
      && !/Continue to payment/.test(recharge)
      && !/payment successful/i.test(recharge),
    at >= 0 ? recharge.slice(at, at + 320) : recharge.slice(0, 320),
  );

  await page.goto(`${BASE}/seller/leads/${LEAD}`, { waitUntil: "networkidle" });
  const lead = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  const buyLink = await page.locator(`a[href="/seller/leads/${LEAD}/buy"]`).count();
  ok(
    "Intake lead stays masked and is not offered as a completed purchase",
    !/\+91/.test(lead)
      && !/9800005012/.test(lead)
      && buyLink === 0
      && /Buy this lead/.test(lead),
    `buyLink=${buyLink} ${lead.slice(lead.indexOf("Lead price"), lead.indexOf("Lead price") + 360)}`,
  );

  // The export is built now, so the check is what it returns rather than
  // that it refuses. This account has bought nothing in this fixture, so the
  // right answer is a header and no rows — not an empty file, and not a row
  // belonging to anybody else.
  const exported = await page.request.get(`${BASE}/seller/purchased/export.csv`);
  const exportBody = await exported.text();
  const exportRows = exportBody.split("\r\n").filter((line) => line.length > 0);
  ok(
    "Purchased-lead download returns the caller's own rows and no other contact",
    exported.status() === 200
      && exportRows[0] === "Lead,Order,Purchased,Requirement,Area,Configuration,"
        + "Budget band,Intent score,Name,Mobile,Email,Best time to call,Credits paid"
      && exportRows.length === 1
      && !/\+91/.test(exportBody)
      && exported.headers()["content-disposition"]?.includes("attachment")
      && exported.headers()["cache-control"] === "no-store",
    `status=${exported.status()} rows=${exportRows.length} `
    + `cc=${exported.headers()["cache-control"]} `
    + `${exportBody.replace(/\s+/g, " ").slice(0, 200)}`,
  );
} finally {
  writeFileSync("docs/phase-5/browser-followup.json", JSON.stringify({
    category: "review-browser",
    at: new Date().toISOString(),
    results,
  }, null, 2));
  await browser.close();
}
