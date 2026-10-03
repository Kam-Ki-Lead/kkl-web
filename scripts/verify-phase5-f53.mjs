/**
 * F5-3 browser check. One seller sign-in against the synthetic pending order
 * ORD-P5-F53-PENDING. Does not buy, recharge, export, or call a provider.
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
const ORDER = "756b70e8-5b09-43fd-af28-dd4113d668af";
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
  await page.goto(`${BASE}/auth?next=${encodeURIComponent("/seller/orders")}`, { waitUntil: "networkidle" });
  await page.fill("#auth-mobile", "9800005011");
  await page.click('button:has-text("Send code")');
  await page.waitForSelector("#auth-code", { timeout: 20000 });
  const id = challengeId(await page.context().cookies());
  if (!id) throw new Error("challenge cookie missing");
  await page.fill("#auth-code", await devCode(id));
  await page.click('button:has-text("Verify and continue")');
  await page.waitForURL((url) => url.pathname === "/seller/orders", { timeout: 20000 });
  const chip = page.locator(`[data-order-status="pending"]`).first();
  await chip.waitFor({ timeout: 15000 });
  const listText = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  const chipText = (await chip.innerText()).trim();
  ok(
    "Seller order list shows Pending",
    chipText === "Pending"
      && listText.includes(ORDER)
      && !/Failed/.test(chipText),
    `chip=${chipText} url=${page.url()}`,
  );

  await page.goto(`${BASE}/seller/orders/${ORDER}`, { waitUntil: "networkidle" });
  const detailChip = page.locator(`[data-order-status="pending"]`).first();
  const detailChipText = (await detailChip.innerText()).trim();
  const detail = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  const openLead = await page.locator('a:has-text("Open the lead")').count();
  const cancel = await page.locator('button:has-text("Cancel"), a:has-text("Cancel order"), a:has-text("Request refund")').count();
  ok(
    "Seller order detail stays pending and releases nothing",
    page.url().endsWith(`/seller/orders/${ORDER}`)
      && detailChipText === "Pending"
      && /Nothing was released for this order/.test(detail)
      && /This order is not paid/.test(detail)
      && /This order is pending/.test(detail)
      && !/what paid for it/i.test(detail)
      && /not shown as a paid or failed charge/.test(detail)
      && !/Credits were deducted/.test(detail)
      && !/Failed/.test(detail)
      && openLead === 0
      && cancel === 0
      && !/\+91/.test(detail)
      && !/9800005012/.test(detail),
    `chip=${detailChipText} openLead=${openLead} cancel=${cancel} ${detail.slice(detail.indexOf(ORDER.slice(0, 8)), detail.indexOf(ORDER.slice(0, 8)) + 420)}`,
  );
} catch (error) {
  ok("F5-3 browser check", false, error instanceof Error ? error.message : error);
} finally {
  writeFileSync("docs/phase-5/f53-pending-order.json", JSON.stringify({
    category: "review-browser",
    at: new Date().toISOString(),
    orderId: ORDER,
    orderRef: "ORD-P5-F53-PENDING",
    fixture: "synthetic pending row written as the seller; no wallet entry; consent left unknown",
    results,
  }, null, 2));
  await browser.close();
  if (results.some((row) => !row.pass)) process.exitCode = 1;
}
