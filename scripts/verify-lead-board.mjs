/**
 * The public lead board on /brokers, in a browser.
 *
 * The check that matters is the first one: this page is served to anyone, so
 * it must not carry what the signed-in console carries. A contact value, a
 * mask, an age in days or an intent score on this page is a disclosure, not a
 * layout bug, and no unit test can see what the rendered HTML actually ships.
 *
 * The rest keep the browse working: the filters are URLs, so Back works and a
 * filtered board can be shared; "show more" adds a page rather than replacing
 * one; and the whole thing fits three widths without scrolling sideways.
 *
 * Reads a locally served build. Signs nothing in, buys nothing, touches no
 * deployed environment.
 *
 *   KKL_ENV=development KKL_DATA_SOURCE=sample npx next start -p 3814
 *   PLAYWRIGHT=./node_modules/playwright-core node scripts/verify-lead-board.mjs
 */
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT ?? "playwright");
const OUT = process.argv[2] ?? null;
const B = process.env.KKL_BASE_URL ?? "http://127.0.0.1:3814";
const CHROME = process.env.KKL_CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const BROKERS = `${B}/brokers`;

const checks = [];
const is = (n, a, e) =>
  checks.push(`${a === e ? "PASS" : "FAIL"}  ${n} — ${JSON.stringify(a)}${a === e ? "" : ` (expected ${JSON.stringify(e)})`}`);
const atLeast = (n, a, e) =>
  checks.push(`${a >= e ? "PASS" : "FAIL"}  ${n} — ${JSON.stringify(a)}${a >= e ? "" : ` (expected at least ${JSON.stringify(e)})`}`);
const info = (d) => checks.push(`INFO  ${d}`);

const inPage = () => {
  Object.assign(window, {
    __board: () => document.querySelector("#leads"),
    __cards: () => [...document.querySelectorAll("#leads ul li")],
    __shownLine: () =>
      [...document.querySelectorAll("#leads p")]
        .map((p) => p.textContent.trim())
        .find((t) => /^(Showing |\d+ of \d+ leads match)/.test(t)) ?? null,
  });
};

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.addInitScript(inPage);
await page.goto(BROKERS, { waitUntil: "networkidle" });

/* -- 1. the page leads with inventory, not prose ------------------------- */

const board = await page.evaluate(() => {
  const leads = document.querySelector("#leads");
  const steps = [...document.querySelectorAll("h2")].find((h) =>
    /How buying a lead works/.test(h.textContent ?? ""));
  return {
    exists: Boolean(leads),
    labelled: leads?.getAttribute("aria-labelledby") === "leads-heading",
    heading: leads?.querySelector("h2")?.textContent.trim() ?? null,
    boardTop: leads ? Math.round(leads.getBoundingClientRect().top + window.scrollY) : null,
    stepsTop: steps ? Math.round(steps.getBoundingClientRect().top + window.scrollY) : null,
  };
});
is("the board is on the page", board.exists, true);
is("and labelled by its heading", board.labelled, true);
is("whose words are the inventory's", board.heading, "Leads available now");
is("the leads come before the how-it-works steps", board.boardTop < board.stepsTop, true);

const cards = await page.evaluate(() => window.__cards().length);
atLeast("there are lead cards", cards, 1);
info(`${cards} cards; ${await page.evaluate(() => window.__shownLine())}`);

/* -- 2. nothing on this page may be private ------------------------------ */

/*
 * Against the served HTML, not the component. A field that reaches the page
 * through a prop nobody expected still lands in this string.
 */
const html = await page.content();
const forbidden = [
  // An Indian mobile: ten digits starting 6-9, bounded, optionally +91.
  // Bounded on purpose — an unbounded digit run matches a font-file hash and
  // reports a disclosure that is not one.
  [/(?:\+?91[\s-]?)?\b[6-9]\d{9}\b/, "something shaped like a phone number"],
  [/[•·]{3,}/, "a contact mask"],
  [/\bintentScore\b|\bageDays\b|\bcontactMask\b/, "a console-only field name"],
  [/\b\d+\s*days?\s*old\b/i, "an age in days"],
  [/@[a-z0-9.-]+\.[a-z]{2,}/i, "something shaped like an email address"],
];
for (const [pattern, what] of forbidden) {
  const hit = pattern.exec(html);
  is(`the served page carries no ${what}`, hit ? hit[0].slice(0, 40) : null, null);
}
// The lead's own reference is the only identifier, and it is not a person.
const refs = await page.evaluate(() =>
  window.__cards().map((li) => li.querySelector("p:nth-of-type(2)")?.textContent.trim() ?? ""));
is("every card is identified by a reference", refs.every((r) => /^L-\d+$/.test(r)), true);
info(`references: ${refs.slice(0, 4).join(", ")}…`);

/* -- 3. every card offers the purchase path, not a shortcut past it ------ */

const ctas = await page.evaluate(() =>
  window.__cards().map((li) => {
    const a = li.querySelector("a");
    return { href: a?.getAttribute("href") ?? null, label: a?.getAttribute("aria-label") ?? null };
  }));
is("each card's action goes to the lead's own page", ctas.every((c) => /^\/seller\/leads\/[^/]+$/.test(c.href ?? "")), true);
is(
  "and names the lead it buys",
  ctas.every((c) => /^Buy lead L-\d+ in .+/.test(c.label ?? "")),
  true,
);
is(
  "no card claims to buy anything from here",
  await page.evaluate(() => document.querySelectorAll("#leads form, #leads button[type=submit]").length),
  0,
);

/* -- 4. the filters are URLs ---------------------------------------------- */

/**
 * Every click below is awaited by URL.
 *
 * These are client-side navigations: the App Router swaps the board without a
 * load event, so `networkidle` returns before anything has changed and the
 * check reads the old page. That is how this suite first reported a working
 * filter as broken.
 */
async function go(locator, expect) {
  await locator.click();
  await page.waitForURL(expect, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
}

const firstFilter = page.locator('#leads a[aria-pressed="false"]').first();
const filterText = (await firstFilter.textContent()).trim();
await go(firstFilter, /\?/);

const filtered = await page.evaluate(() => ({
  url: location.search,
  line: window.__shownLine(),
  cards: window.__cards().length,
  pressed: [...document.querySelectorAll('#leads a[aria-pressed="true"]')].map((a) => a.textContent.trim()),
  areas: window.__cards().map((li) => li.querySelector("h3").textContent.trim()),
}));
is("choosing a filter puts it in the URL", filtered.url.includes("="), true);
is("and marks it chosen", filtered.pressed.includes(filterText), true);
is("the list narrows to it", filtered.cards <= cards, true);
is("and says what matched", /leads match$/.test(filtered.line ?? ""), true);
info(`filter "${filterText}" -> ${filtered.url} (${filtered.cards} cards)`);

// Back restores the unfiltered board, which is the whole point of URL state.
// Settled explicitly: a filter link carries a #leads fragment, so the back
// step can be a same-document move that `networkidle` does not wait out.
await page.goBack();
await page.waitForLoadState("networkidle");
await page.waitForTimeout(400);
is("Back returns to the full board", await page.evaluate(() => window.__cards().length), cards);

// And a filtered URL opened cold shows the same thing.
await page.goto(`${BROKERS}${filtered.url}`, { waitUntil: "networkidle" });
is(
  "a filtered URL opened cold shows the same board",
  await page.evaluate(() => window.__cards().length),
  filtered.cards,
);

/* -- 5. clearing, and the empty state ------------------------------------ */

await page.goto(`${BROKERS}?area=Nowhere+At+All`, { waitUntil: "networkidle" });
const empty = await page.evaluate(() => ({
  cards: window.__cards().length,
  says: document.querySelector("#leads h3")?.textContent.trim() ?? null,
  clear: Boolean([...document.querySelectorAll("#leads a")].find((a) => /Clear filters/.test(a.textContent ?? ""))),
}));
is("a filter nothing matches draws no cards", empty.cards, 0);
is("and says so rather than looking broken", empty.says, "No lead matches those filters");
is("with a way out", empty.clear, true);

/* -- 6. show more adds a page -------------------------------------------- */

await page.goto(BROKERS, { waitUntil: "networkidle" });
const more = page.locator("#leads a", { hasText: /^Show \d+ more$/ });
if ((await more.count()) > 0) {
  const before = await page.evaluate(() => window.__cards().length);
  await go(more.first(), /show=/);
  const after = await page.evaluate(() => window.__cards().length);
  is("show more adds a page rather than replacing one", after > before, true);
  is("and it is in the URL, so Back undoes it", page.url().includes("show="), true);
  info(`show more: ${before} -> ${after} cards`);
} else {
  info("the whole marketplace fits one page here, so show-more was not exercised");
}

/* -- 7. the reduced tab --------------------------------------------------- */

await page.goto(BROKERS, { waitUntil: "networkidle" });
const saleTab = page.locator("#leads a", { hasText: /^Reduced \(\d+\)$/ });
if ((await saleTab.count()) > 0) {
  await go(saleTab.first(), /tab=sale/);
  const reduced = await page.evaluate(() =>
    window.__cards().map((li) => li.textContent.includes("Reduced") || /%\s*off/.test(li.textContent)));
  is("the reduced tab lists only reduced leads", reduced.every(Boolean), true);
  atLeast("and lists some", reduced.length, 1);
  is(
    "no card says why it is reduced",
    await page.evaluate(() => /aged|ageing|aging|days? old/i.test(document.querySelector("#leads").textContent)),
    false,
  );
} else {
  info("nothing is reduced in this inventory, so the tab was not exercised");
}

/* -- 8. the unsettled terms are still disclosed --------------------------- */

await page.goto(BROKERS, { waitUntil: "networkidle" });
const pending = await page.evaluate(() =>
  [...document.querySelectorAll("h3")]
    .find((h) => h.textContent.trim() === "Still to be confirmed")
    ?.closest("section, div")
    ?.textContent ?? "");
for (const term of ["Lead prices", "Expiry period", "Refund eligibility", "Access before verification"]) {
  is(`the page still discloses: ${term}`, pending.includes(term), true);
}

/* -- 9. the homepage no longer draws the locality cloud ------------------ */

await page.goto(B, { waitUntil: "networkidle" });
is(
  "Popular localities is hidden on the homepage",
  await page.evaluate(() => /Popular localities/.test(document.body.innerText)),
  false,
);
is(
  "and the grid it replaced did not come back",
  await page.evaluate(() => /Browse by locality/.test(document.body.innerText)),
  false,
);

/* -- 10. three widths ----------------------------------------------------- */

for (const [width, columns] of [[1280, 3], [768, 2], [390, 1]]) {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto(BROKERS, { waitUntil: "networkidle" });
  const seen = await page.evaluate(() => {
    const items = window.__cards();
    const top = (el) => Math.round(el.getBoundingClientRect().top);
    return {
      perRow: items.filter((li) => top(li) === top(items[0])).length,
      scrollable: document.documentElement.scrollWidth > window.innerWidth + 1,
      spills: items.some((li) => {
        const box = li.getBoundingClientRect();
        return [...li.querySelectorAll("*")].some((e) => {
          const b = e.getBoundingClientRect();
          return b.width > 0 && b.right > box.right + 1;
        });
      }),
    };
  });
  is(`at ${width}px the cards are ${columns} across`, seen.perRow, columns);
  is(`at ${width}px nothing scrolls sideways`, seen.scrollable, false);
  is(`at ${width}px nothing spills out of a card`, seen.spills, false);
  if (OUT) await page.screenshot({ path: `${OUT}/lead-board-${width}.png`, fullPage: width !== 390 });
}

await browser.close();

/* ------------------------------------------------------------- report --- */
const failed = checks.filter((c) => c.startsWith("FAIL"));
console.log(checks.join("\n"));
const total = checks.filter((c) => !c.startsWith("INFO")).length;
console.log(`\n${total - failed.length}/${total} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
