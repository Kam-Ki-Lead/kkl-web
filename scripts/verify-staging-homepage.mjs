/**
 * The staging homepage and public navigation, in a browser, desktop and phone.
 *
 * WHY THIS EXISTS
 *
 * The homepage corrections are claims about what a visitor sees: that the
 * internal pricing policy is not printed on a public page, that generated
 * artwork is labelled as an illustration, that the lead search sends the
 * filters the marketplace actually reads, and that no section describes
 * published properties as leads. Every one of those is invisible to a unit
 * test and obvious in a browser.
 *
 * It checks the rendered page, not the source, and it checks the phone
 * viewport as well as the desktop one — the search card has a different
 * layout below 900px and that is where four side-by-side selects used to
 * break.
 *
 * WHAT IT WILL NOT DO
 *
 * Sign in, buy anything, send a message, or touch a deployed environment. It
 * reads public pages from a locally served build.
 *
 * FIXTURES THIS NEEDS
 *
 * Three checks read the featured row's cards by reference, so the database
 * must hold the `HOME-00x` leads with contact rows attached — attached on
 * purpose, because "no contact detail on the page" only means something when
 * there is contact detail to withhold. Without them those three fail rather
 * than passing quietly, which is the right way round: a seeding step that was
 * skipped should look like a failure, not like a pass.
 *
 * The seed is in docs/evidence/featured-leads-fixture.sql.
 *
 * Run (kkl-web and kkl-backend already up):
 *   BASE_URL=http://127.0.0.1:3813 PLAYWRIGHT=playwright-core \
 *   CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
 *   node scripts/verify-staging-homepage.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadPlaywright, revisions, WEB_ROOT } from "./repo-paths.mjs";

const chromium = loadPlaywright().chromium;
if (!chromium) throw new Error("playwright chromium export missing");

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3813";
const CHROME = process.env.CHROME ?? undefined;
const OUT = process.env.EVIDENCE ?? join(WEB_ROOT, "docs/evidence/staging-homepage.json");

const checks = [];
const ok = (name, pass, detail) => {
  checks.push({ name, pass, detail: String(detail).slice(0, 500) });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}\n      ${String(detail).slice(0, 220)}`);
};

/** Wording that belongs in the pricing policy, never on a public page. */
const INTERNAL_PRICING = [
  /2\s*%\s*per/i,
  /per\s+10\s+(qualifying\s+)?searches/i,
  /demand\s+uplift/i,
  /capped\s+at\s+20/i,
  /90%\s*off/i,
  /80%\s*off/i,
  /21\+?\s*days/i,
  /age(ing|ing)?\s+discount/i,
  /no eligible sale leads available/i,
];

const PUBLIC_ROUTES = ["/", "/search", "/support"];

/**
 * Attached to the seeded featured leads in the database.
 *
 * Checking these are absent only means something because they exist on the
 * leads the page is showing: the cards are real rows with real contact
 * records behind them, and the page withholds them.
 */
const SEEDED_CONTACT = [
  "Ritu Sengupta", "9830000000", "ritu@example.invalid", "LEAKCHECK", "Park Street",
];

const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
const evidence = { revisions: revisions(), base: BASE, checks };

try {
  // ------------------------------------------------------------ desktop ----
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await desktop.newPage();
  // Real resources only.
  //
  // The App Router prefetches every visible link as an `_rsc=` request and the
  // browser cancels the ones it no longer needs, so a homepage load normally
  // produces a handful of aborted prefetches and, in a race, the odd 404 from
  // one that was cancelled mid-flight. Counting those makes the check flaky
  // without telling anybody anything: every route they point at was confirmed
  // to answer (`/`, `/search`, `/builders`, `/auth`, a property page and
  // `/find-my-match` all 200; `/seller/leads` 307s to sign-in while signed
  // out). What matters is that the documents, scripts, stylesheets and images
  // the page actually needs all arrive.
  const badResponses = [];
  page.on("response", (response) => {
    if (response.status() < 400) return;
    if (response.url().includes("_rsc=")) return;
    badResponses.push(`${response.status()} ${response.url()}`);
  });

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const home = await page.locator("body").innerText();

  // Recorded here, before this script navigates anywhere it expects to fail.
  const homepageBadResponses = [...badResponses];
  ok("Every resource the homepage needs loads",
    homepageBadResponses.length === 0,
    homepageBadResponses.slice(0, 3).join(" | ") || "no failed document, script, style or image request");

  // 1 — the internal pricing policy is not public copy.
  const leaked = INTERNAL_PRICING.filter((pattern) => pattern.test(home));
  ok("No internal pricing policy wording on the homepage",
    leaked.length === 0,
    leaked.length === 0 ? "none of 9 patterns present" : `leaked: ${leaked.join(", ")}`);

  // 2 — the removed banner stayed removed.
  //
  // Matched case-sensitively and against the banner's own sentences. An
  // earlier version of this check used /i, which matched the footer's
  // ordinary description ("A real estate lead marketplace for brokers,
  // agencies and builders") and reported a banner that is not there.
  const bannerPhrases = [
    "REAL ESTATE LEAD MARKETPLACE",
    "Buy Leads. Connect with property buyers",
  ];
  const bannerFound = bannerPhrases.filter((phrase) => home.includes(phrase));
  ok("The marketplace policy banner is gone",
    bannerFound.length === 0,
    bannerFound.length === 0
      ? "neither banner sentence appears"
      : `still present: ${bannerFound.join(" | ")}`);

  // 3 — the property row is not the one called "Leads".
  //
  // "Featured Leads" is now a real section backed by /v1/leads/featured, so
  // its presence is correct. What must still hold is that the property row
  // has its own property heading rather than borrowing the lead one.
  ok("The property row has a property heading, not a lead one",
    /Featured properties/i.test(home),
    home.split("\n").filter((l) => /^Featured/i.test(l.trim())).join(" | ") || "(no Featured heading)");

  // 4 — the empty sale feed renders nothing rather than an apology.
  ok("An empty sale feed renders nothing at all",
    !/Lead offers/i.test(home) || /credits/i.test(home),
    /Lead offers/i.test(home)
      ? "sale section present with priced rows"
      : "no sale section, as expected when the feed is empty");

  // 5 — one search, no tab strip, and no control that filters nothing.
  //
  // The card used to split into "Projects" and "Buy/Rent" tabs, and carried a
  // "Search type" box that sat in the row with the real fields, looked like a
  // control and filtered nothing. It was reported as not working, which it
  // was not: it was a styled div displaying which tab you were on.
  const card = page.locator("form").first();
  const cardText = await card.innerText();
  const tabs = await page.locator("button[aria-pressed]").count();
  ok("The search is one section, not two tabs",
    tabs === 0,
    `tab buttons: ${tabs}`);
  ok("The dead Search type box is gone",
    !/Builder projects/.test(cardText) && !/Buyer requirements/.test(cardText),
    cardText.split("\n").filter((l) => /Search type|Searching/.test(l)).join(" | ")
      || "no Search type field");

  // 6 — the buy/rent control, and the thing that matters about it: it filters.
  const transactions = await page.locator("#home-transaction").count();
  ok("Buy or rent is a dropdown on that one section",
    transactions === 1,
    `buy/rent selects: ${transactions}`);

  const searchLabel = async () =>
    (await card.locator('button[type="submit"]').innerText()).trim();
  const countIn = (label) => Number(/Search (\d+)/.exec(label)?.[1] ?? "-1");

  const either = countIn(await searchLabel());
  await page.selectOption("#home-transaction", "rent");
  await page.waitForTimeout(900);
  const renting = countIn(await searchLabel());
  await page.selectOption("#home-transaction", "sale");
  await page.waitForTimeout(900);
  const buying = countIn(await searchLabel());

  ok("Choosing buy or rent changes the result count",
    renting > 0 && buying > 0 && renting !== either && buying !== either,
    `either ${either}, rent ${renting}, buy ${buying}`);
  ok("and the two together account for everything",
    renting + buying === either,
    `${renting} + ${buying} = ${renting + buying}, either = ${either}`);

  // 7 — the query it navigates to, and the results page honouring it.
  await page.selectOption("#home-transaction", "rent");
  await page.waitForTimeout(500);
  await card.locator('button[type="submit"]').click();
  await page.waitForURL(/\/search/, { timeout: 20000 });
  const url = new URL(page.url());
  ok("Search carries the choice into the query",
    url.searchParams.get("transaction") === "rent",
    `query: ${url.search || "(empty)"}`);
  // The applied-filter chips are drawn by the client filter bar, so they
  // appear after hydration rather than in the first paint.
  await page.getByText(/To rent|To buy/).first()
    .waitFor({ timeout: 15000 }).catch(() => {});
  const results = await page.locator("body").innerText();
  ok("and the results page shows it applied rather than dropping it",
    /To rent/.test(results),
    results.split("\n").filter((l) => /To rent|To buy/.test(l)).join(" | ") || "no chip");

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

  // 7a — Featured Leads is backed by leads.
  const featured = page.locator("section:has(h2:text-is('Featured Leads'))");
  const featuredCount = await featured.count();
  ok("The homepage has a Featured Leads section",
    featuredCount === 1,
    `sections titled "Featured Leads": ${featuredCount}`);

  if (featuredCount === 1) {
    const cards = featured.locator("ul > li");
    const cardCount = await cards.count();
    ok("It renders lead cards",
      cardCount > 0,
      `${cardCount} cards`);

    const featuredText = await featured.innerText();
    ok("Every card's action says Buy Leads",
      (await featured.locator('a:has-text("Buy Leads")').count()) === cardCount && cardCount > 0,
      `${await featured.locator('a:has-text("Buy Leads")').count()} of ${cardCount} cards`);

    // Into the marketplace, not the property search.
    const viewAll = await featured.locator('a:has-text("View all")').getAttribute("href");
    ok("View all opens Buy Leads, not the property search",
      viewAll === "/seller/leads",
      `View all -> ${viewAll}`);

    const firstCta = await featured.locator('a:has-text("Buy Leads")').first().getAttribute("href");
    ok("A card leads into the existing lead purchase route",
      typeof firstCta === "string" && /^\/seller\/leads\/[^/]+$/.test(firstCta),
      `card -> ${firstCta}`);

    // The seeded leads, by reference, so these really are those rows.
    ok("The cards are the seeded leads, shown by reference",
      /HOME-00\d/.test(featuredText),
      featuredText.split("\n").filter((l) => /HOME-00\d/.test(l)).join(" | "));

    ok("A recorded qualification level is shown and an unrecorded one is simply absent",
      /Qualification 8000/.test(featuredText)
        && !/Qualification 0\b/.test(featuredText)
        && !/Qualification (—|-|null|undefined)/.test(featuredText),
      featuredText.split("\n").filter((l) => /Qualification/.test(l)).join(" | ") || "none shown");

    ok("A discounted lead carries a discount badge and a credit price",
      /% off/.test(featuredText) && /credits/.test(featuredText),
      featuredText.split("\n").filter((l) => /% off|credits/.test(l)).slice(0, 4).join(" | "));

    ok("No contact detail from the seeded leads appears on the page",
      SEEDED_CONTACT.every((secret) => !home.includes(secret)),
      SEEDED_CONTACT.filter((secret) => home.includes(secret)).join(", ") || "none of 5 present");

    ok("No pricing mechanic appears on the page",
      !/baseCredits|demandPercent|policyVersion|originalPrice/i.test(home)
        && !/\buplift\b/i.test(home),
      "no base price, demand uplift, pre-discount price or policy version");

    // And the property row keeps its own honest heading beneath it.
    ok("The property row is still present, under a property heading",
      /Featured properties/.test(home) && /Featured projects/.test(home),
      home.split("\n").filter((l) => /^Featured/.test(l.trim())).join(" | "));
  }

  // 8 — generated artwork is labelled wherever it stands in for a photograph.
  const illustrations = await page.locator('img[alt*="Architectural illustration"]').count();
  const badges = await page.getByText("Illustration", { exact: true }).count();
  ok("Generated artwork is labelled an illustration, in the badge and the alt text",
    illustrations === 0 || badges > 0,
    `illustration images: ${illustrations}, visible "Illustration" badges: ${badges}`);

  // 9 — navigation.
  const nav = await page.locator("header").innerText();
  ok("Navigation leads with Home and Buy Leads, and no longer offers Find my match",
    /Home/.test(nav) && /Buy Leads/.test(nav) && !/Find my match/i.test(nav),
    nav.replace(/\n+/g, " | ").slice(0, 200));

  // 10 — the route behind the removed navbar item still answers.
  const matchPath = "/find-my-match";
  const match = await page.goto(`${BASE}${matchPath}`, { waitUntil: "networkidle" });
  ok("The Find my match route still works for an old link",
    match !== null && match.status() < 400,
    `GET ${matchPath} -> ${match?.status()}`);

  // 11 — a nested route activates the right navigation item.
  //
  // Checked on a PUBLIC nested route. Signed out, /seller/leads redirects to
  // sign-in and "Sign in" is then correctly the current page, so that route
  // cannot tell us whether nested matching works.
  await page.goto(`${BASE}/search?type=project`, { waitUntil: "networkidle" });
  const active = page.locator('header a[aria-current="page"]');
  const activeCount = await active.count();
  const activeText = activeCount ? (await active.first().innerText()).trim() : "(none)";
  const activeColour = activeCount
    ? await active.first().evaluate((el) => getComputedStyle(el).color)
    : "";
  ok("A public nested route marks a navigation item as the current page",
    activeCount > 0,
    `aria-current on "${activeText}"`);
  ok("and the active item's text is white, not purple on purple",
    activeColour.replace(/\s/g, "") === "rgb(255,255,255)",
    `computed colour: ${activeColour}`);

  await desktop.close();

  // -------------------------------------------------------------- phone ----
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  });
  const small = await phone.newPage();

  for (const route of PUBLIC_ROUTES) {
    await small.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
    const overflow = await small.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    ok(`No sideways scrolling at 390px on ${route}`,
      overflow.scrollWidth <= overflow.clientWidth + 1,
      `scrollWidth ${overflow.scrollWidth} vs clientWidth ${overflow.clientWidth}`);
  }

  await small.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const phoneForm = await small.locator("form").first().innerText();
  ok("The phone gets the same one search, with the buy/rent dropdown",
    (await small.locator("button[aria-pressed]").count()) === 0
      && (await small.locator("#home-transaction").count()) === 1,
    phoneForm.split("\n").slice(0, 6).join(" | "));

  // Every control a thumb has to hit is at least 44px tall (C-04).
  const shortControls = await small.evaluate(() => {
    const nodes = [...document.querySelectorAll("form select, form button, form input")];
    return nodes
      .filter((node) => node.getBoundingClientRect().height > 0)
      .filter((node) => node.getBoundingClientRect().height < 44)
      .map((node) => `${node.tagName.toLowerCase()}#${node.id || "(no id)"} ${
        Math.round(node.getBoundingClientRect().height)}px`);
  });
  ok("Every search control on a phone is at least 44px tall",
    shortControls.length === 0,
    shortControls.join(", ") || "all controls >= 44px");

  const phoneBody = await small.locator("body").innerText();
  const phoneLeaks = INTERNAL_PRICING.filter((pattern) => pattern.test(phoneBody));
  ok("No internal pricing wording on the phone homepage either",
    phoneLeaks.length === 0,
    phoneLeaks.join(", ") || "none of 9 patterns present");

  await phone.close();
} finally {
  await browser.close();
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(evidence, null, 2)}\n`);
const failed = checks.filter((c) => !c.pass);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed. Evidence: ${OUT}`);
if (failed.length) process.exit(1);
