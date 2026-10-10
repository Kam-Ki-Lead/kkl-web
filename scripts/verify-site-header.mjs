/**
 * The header, in a browser: does it still look like the approved design, and
 * does every control in it now do something?
 *
 * TWO HALVES
 *
 * A. Geometry parity. The approved prototype is loaded from a file beside
 *    this script and the rendered component from the running build, and the
 *    computed styles of the matching elements are compared property by
 *    property. This is the half that catches a transposition mistake, which
 *    is the real risk when CSS moves from one file into a module.
 *
 * B. Behaviour. The listbox, the search panel, the drawer's focus trap, the
 *    badge, the sticky shadow, the touch targets and reduced motion. These
 *    are the things the prototype only looked like it did.
 *
 * It reads a locally served build. It signs nothing in, buys nothing and
 * touches no deployed environment.
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeFileSync, mkdirSync } from "node:fs";
import { loadPlaywright, revisions } from "./repo-paths.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.KKL_BASE_URL ?? "http://127.0.0.1:3814";
/* The approved direction, kept beside this script so the comparison is
   reproducible rather than depending on a file in somebody's home folder. */
const REFERENCE =
  process.env.KKL_HEADER_REFERENCE ?? resolve(here, "reference/header.html");
const CHROME = process.env.KKL_CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const { chromium } = loadPlaywright();

const checks = [];
const ok = (name, detail = "") => checks.push({ name, pass: true, detail });
const bad = (name, detail) => checks.push({ name, pass: false, detail });
const is = (name, actual, expected) =>
  actual === expected
    ? ok(name, String(actual))
    : bad(name, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

/* Properties that describe how a thing looks, and that do not move when the
   web font differs between the two documents. */
const VISUAL = [
  "height", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "backgroundColor", "color", "borderRadius", "borderBottomWidth",
  "borderBottomColor", "borderTopWidth", "boxShadow", "fontSize", "fontWeight",
  "display", "alignItems", "columnGap", "marginLeft", "maxWidth",
];

/* The approved element, and how to find the same element in the component. */
const PAIRS = [
  { name: "utility strip", ref: ".util", app: "header > div:nth-of-type(1)" },
  { name: "utility row", ref: ".util .row", app: "header > div:nth-of-type(1) > div" },
  { name: "main row", ref: ".main .row", app: "header > div:nth-of-type(2) > div" },
  { name: "tab group", ref: ".seg", app: 'header nav[aria-label="Main"]' },
  { name: "active tab", ref: ".seg a[aria-current]", app: 'header nav[aria-label="Main"] a[aria-current="page"]' },
  { name: "inactive tab", ref: ".seg a:not([aria-current])", app: 'header nav[aria-label="Main"] a:not([aria-current])' },
  { name: "icon button", ref: "button.ic:not(.menu-btn)", app: 'header button[aria-label="Search"]' },
  { name: "solid button", ref: ".btn", app: 'header a[href="/builders"].kh-solid, header div:nth-of-type(2) a[href="/builders"]' },
  /*
   * The logo is deliberately NOT compared.
   *
   * The reference draws a placeholder mark and a wordmark in its own type.
   * The brief is explicit that the real logo is kept exactly as it is, so the
   * two are supposed to differ. It is checked below instead, by asset.
   *
   * The badge is not compared either: it only exists when somebody has
   * shortlisted something, and this page is loaded as a guest. Its shape is
   * covered by the unit tests and its absence is asserted below.
   */
];

/*
 * Colour substitutions the palette mapping makes on purpose.
 *
 * The stylesheet points --kh-* at the application's own brand tokens instead
 * of restating the direction's hexes. That is a deliberate difference from
 * the reference, so it is declared here rather than being silently tolerated:
 * a drift that matches one of these rows is reported as a mapping, and any
 * other drift still fails.
 */
const MAPPED = new Map([
  ["rgb(91, 45, 142)", "rgb(90, 49, 138)"],   // brand    #5B2D8E -> --color-brand-deep
  ["rgb(245, 154, 31)", "rgb(255, 178, 51)"], // accent   #F59A1F -> --color-saffron
  ["rgb(246, 244, 250)", "rgb(246, 248, 253)"], // surface #F6F4FA -> --color-tint
  ["rgb(29, 22, 48)", "rgb(18, 24, 43)"],     // ink      #1D1630 -> --color-ink
  ["rgb(107, 100, 128)", "rgb(90, 100, 128)"], // muted   #6B6480 -> --color-muted
  ["rgb(231, 227, 239)", "rgb(225, 228, 238)"], // line    #E7E3EF -> --color-line
  ["rgb(239, 232, 248)", "rgb(228, 216, 239)"], // soft    #EFE8F8 -> --color-brand-mist
]);

const computed = (page, selector, props) =>
  page.evaluate(
    ([sel, keys]) => {
      const node = document.querySelector(sel);
      if (!node) return null;
      const style = getComputedStyle(node);
      const out = {};
      for (const key of keys) out[key] = style[key];
      return out;
    },
    [selector, props],
  );

const browser = await chromium.launch({ executablePath: CHROME });
const evidence = { revisions: revisions(), base: BASE, checks };

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const reference = await context.newPage();
  await reference.goto(pathToFileURL(REFERENCE).href, { waitUntil: "load" });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

  /* ------------------------------------------------- A. geometry parity -- */

  /*
   * Both documents measured on the same font.
   *
   * The reference is a local file and cannot fetch Plus Jakarta Sans, so it
   * renders in system-ui. `line-height: normal` is a font metric, so every
   * text box in it came out 1px shorter than the component's — a difference
   * in the typeface, not in the CSS. Pinning both to system-ui for the
   * comparison isolates the stylesheet, which is what this half is for.
   *
   * The check below makes sure that cannot hide a font that failed to load.
   */
  const resolvedFont = await page.evaluate(
    () => getComputedStyle(document.querySelector("header")).fontFamily.split(",")[0].replace(/"/g, ""));
  is("the header really is in Plus Jakarta Sans", resolvedFont, "Plus Jakarta Sans");
  const pin = (target) =>
    target.evaluate(() => {
      const node = document.querySelector("header");
      node.style.fontFamily = "system-ui";
      document.body.style.fontFamily = "system-ui";
    });
  await pin(reference);
  await pin(page);

  for (const pair of PAIRS) {
    const before = await computed(reference, pair.ref, VISUAL);
    const after = await computed(page, pair.app, VISUAL);
    if (!before) { bad(`parity: ${pair.name}`, `reference selector matched nothing: ${pair.ref}`); continue; }
    if (!after) { bad(`parity: ${pair.name}`, `component selector matched nothing: ${pair.app}`); continue; }
    const drift = Object.keys(before).filter((key) => before[key] !== after[key]);
    const mapped = drift.filter((key) => MAPPED.get(before[key]) === after[key]);
    const real = drift.filter((key) => !mapped.includes(key));
    const note = mapped.length ? `; ${mapped.length} declared colour mapping(s)` : "";
    if (real.length === 0) ok(`parity: ${pair.name}`, `${VISUAL.length} properties match${note}`);
    else bad(`parity: ${pair.name}`,
      real.map((key) => `${key}: ${before[key]} -> ${after[key]}`).join("; "));
  }

  /* ------------------------------------------------------- B. behaviour -- */

  // 6. sticky, with a shadow only once scrolled
  const restShadow = await page.evaluate(() => getComputedStyle(document.querySelector("header")).boxShadow);
  is("no shadow at rest", restShadow, "none");
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(250);
  const scrolledTop = await page.evaluate(() => document.querySelector("header").getBoundingClientRect().top);
  is("header stays at the top when scrolled", Math.round(scrolledTop), 0);
  const liftShadow = await page.evaluate(() => getComputedStyle(document.querySelector("header")).boxShadow);
  liftShadow !== "none" ? ok("shadow appears once scrolled", liftShadow) : bad("shadow appears once scrolled", "still none");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
  is("shadow goes again at the top", await page.evaluate(() => getComputedStyle(document.querySelector("header")).boxShadow), "none");

  // 5. the active tab comes from the route
  is("Home is current on /", await page.textContent('header nav[aria-label="Main"] a[aria-current="page"]'), "Home");
  await page.goto(`${BASE}/search`, { waitUntil: "networkidle" });
  is("Projects is current on /search", await page.textContent('header nav[aria-label="Main"] a[aria-current="page"]'), "Projects");
  await page.goto(`${BASE}/search?possession=new_launch`, { waitUntil: "networkidle" });
  is("New launches is current on ?possession=new_launch",
    await page.textContent('header nav[aria-label="Main"] a[aria-current="page"]'), "New launches");
  await page.goto(`${BASE}/support`, { waitUntil: "networkidle" });
  is("no tab is current off the tab set",
    await page.locator('header nav[aria-label="Main"] a[aria-current="page"]').count(), 0);

  // 1. the city selector
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const cityButton = page.locator('header button[aria-haspopup="listbox"]');
  is("the city button starts closed", await cityButton.getAttribute("aria-expanded"), "false");
  await cityButton.click();
  is("it opens a listbox", await page.locator('header [role="listbox"]').count(), 1);
  is("six cities", await page.locator('header [role="option"]').count(), 6);
  is("Kolkata is the selected option",
    await page.locator('header [role="option"][aria-selected="true"]').textContent(), "Kolkata");
  // keyboard: down three, enter -> Bengaluru (index 3)
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(120);
  is("arrow keys and Enter choose a city", (await cityButton.textContent()).trim(), "Bengaluru");
  is("focus returns to the button",
    await page.evaluate(() => document.activeElement?.getAttribute("aria-haspopup")), "listbox");
  // persistence across a full reload
  await page.reload({ waitUntil: "networkidle" });
  is("the choice is remembered", (await cityButton.textContent()).trim(), "Bengaluru");
  // and before first paint, not after: the server HTML says Kolkata, the DOM says Bengaluru
  const served = await (await fetch(`${BASE}/`)).text();
  served.includes(">Kolkata<")
    ? ok("the server still renders the default", "so the stored value is a client correction")
    : bad("the server still renders the default", "the default was not in the served HTML");
  // Escape closes and restores focus
  await cityButton.click();
  await page.keyboard.press("Escape");
  is("Escape closes the listbox", await page.locator('header [role="listbox"]').count(), 0);
  is("Escape restores focus to the button",
    await page.evaluate(() => document.activeElement?.getAttribute("aria-haspopup")), "listbox");
  // outside click closes
  await cityButton.click();
  await page.mouse.click(700, 500);
  await page.waitForTimeout(120);
  is("an outside click closes it", await page.locator('header [role="listbox"]').count(), 0);
  await page.evaluate(() => localStorage.clear());

  // 2. the search panel
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const searchButton = page.locator('header button[aria-label="Search"]');
  is("no panel until asked", await page.locator('header form[role="search"]').count(), 0);
  await searchButton.click();
  is("the panel opens", await page.locator('header form[role="search"]').count(), 1);
  is("the input holds the placeholder the brief specified",
    await page.getAttribute("header form[role=search] input", "placeholder"), "project, builder or locality");
  is("the input takes focus",
    await page.evaluate(() => document.activeElement?.tagName.toLowerCase()), "input");
  await page.keyboard.press("Escape");
  is("Escape closes the panel", await page.locator('header form[role="search"]').count(), 0);
  is("and focus returns to the icon",
    // The label is "Search" again, because the panel it would close is shut.
    await page.evaluate(() => {
      const active = document.activeElement;
      return active === document.querySelector('header button[aria-label="Search"]');
    }), true);
  // and it reaches a real filter
  await searchButton.click();
  await page.fill("header form[role=search] input", "Ivy");
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/search\?q=Ivy/, { timeout: 5000 });
  ok("the search reaches the results page", page.url());
  /*
   * A negative control, because "the term appears on the page" also passes on
   * a results page that simply echoes what you typed. A filter is only a
   * filter if a term that matches nothing returns nothing.
   */
  await page.waitForLoadState("networkidle");
  const hit = await page.locator('[data-testid="property-card"], article').count();
  await page.goto(`${BASE}/search?q=zzzznomatch`, { waitUntil: "networkidle" });
  const miss = await page.locator('[data-testid="property-card"], article').count();
  hit > 0 && miss === 0
    ? ok("and the results are filtered by the term", `"Ivy" -> ${hit} cards, nonsense -> ${miss}`)
    : bad("and the results are filtered by the term",
        `"Ivy" -> ${hit} cards, nonsense -> ${miss}: the term is not narrowing anything`);

  // 3. the badge, and the logo
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  /* A guest has shortlisted nothing, so there is no badge to draw. This used
     to assert "3", which only passed because the layout handed the component
     a placeholder count. */
  is("an empty shortlist draws no badge",
    await page.locator('header a[aria-label^="Shortlist"] span').count(), 0);
  is("and says so in the accessible name",
    await page.getAttribute('header a[aria-label^="Shortlist"]', "aria-label"), "Shortlist, empty");

  /* The supplied logo, not a redrawing of it. */
  is("the header renders the real logo file",
    await page.getAttribute('header a[aria-label="Kaam Ki Lead — home"] img', "src"),
    "/brand/kkl-logo.jpg");
  is("and no mark is drawn in its place",
    await page.locator('header a[aria-label="Kaam Ki Lead — home"] svg').count(), 0);
  const logoBox = await page.evaluate(() => {
    const img = document.querySelector('header a[aria-label="Kaam Ki Lead — home"] img');
    const rect = img.getBoundingClientRect();
    return { h: Math.round(rect.height), w: Math.round(rect.width) };
  });
  logoBox.h >= 30 && logoBox.h <= 40
    ? ok("the logo sits at about 34px tall", `${logoBox.w}x${logoBox.h}`)
    : bad("the logo sits at about 34px tall", `${logoBox.w}x${logoBox.h}`);
  is("the shortlist control is in the bar at desktop width",
    await page.locator('header a[aria-label^="Shortlist"]').isVisible(), true);

  /* ---------------------------------------------------------- tablet ----- */
  /* The 1100px rule: the bar's button goes, the strip's link stays. */
  const tablet = await browser.newContext({ viewport: { width: 1000, height: 800 } });
  const mid = await tablet.newPage();
  await mid.goto(`${BASE}/`, { waitUntil: "networkidle" });
  is("at 1000px the bar's button is hidden",
    await mid.locator('header > div:nth-of-type(2) a[href="/builders"]').isVisible().catch(() => false), false);
  is("and the strip still carries List a project",
    await mid.locator('header > div:nth-of-type(1) a[href="/builders"]').isVisible(), true);
  is("the tabs are still a tab group at 1000px",
    await mid.locator('header nav[aria-label="Main"]').first().isVisible(), true);
  is("Help is still there at 1000px",
    await mid.locator('header a[href="/support"]').isVisible(), true);
  await tablet.close();

  /* ----------------------------------------------------------- phone ----- */
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const small = await phone.newPage();
  await small.goto(`${BASE}/`, { waitUntil: "networkidle" });

  is("the tab group collapses", await small.locator('header nav[aria-label="Main"]').first().isVisible(), false);
  const menu = small.locator('header button[aria-label="Menu"]');
  is("the hamburger appears", await menu.isVisible(), true);
  is("the wide button is hidden",
    await small.locator('header div:nth-of-type(2) a[href="/builders"]').isVisible().catch(() => false), false);
  is("the bar's shortlist icon is hidden",
    await small.locator('header > div:nth-of-type(2) a[aria-label^="Shortlist"]').isVisible().catch(() => false), false);
  is("so is Help", await small.locator('header a[href="/support"]').isVisible().catch(() => false), false);

  // 4. the drawer
  await menu.click();
  await small.waitForTimeout(150);
  const inDrawer = async (sel) => small.locator(`header [id$="-drawer"] ${sel}`).count();
  is("the drawer carries the tabs", await inDrawer('a[href="/"]'), 1);
  is("the drawer carries the city selector", await inDrawer('button[aria-expanded]'), 1);
  is("the drawer carries Sign in", await inDrawer('a[href="/auth"]'), 1);
  is("the drawer carries List a project", await inDrawer('a[href="/builders"]'), 1);
  is("the drawer carries Shortlist", await inDrawer('a[aria-label^="Shortlist"]'), 1);
  is("focus moves into the drawer",
    await small.evaluate(() => !!document.activeElement?.closest('[id$="-drawer"]')), true);
  // focus trap: shift+tab from the first item lands on the last, not the page
  await small.keyboard.press("Shift+Tab");
  is("Shift+Tab is trapped",
    await small.evaluate(() => !!document.activeElement?.closest('[id$="-drawer"]')), true);
  await small.keyboard.press("Escape");
  await small.waitForTimeout(150);
  is("Escape closes the drawer", await small.locator('header [id$="-drawer"]').count(), 0);
  is("and focus returns to the hamburger",
    await small.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Menu");
  // a link tap closes it
  await menu.click();
  await small.waitForTimeout(150);
  await small.locator('header [id$="-drawer"] a[href="/search"]').first().click();
  await small.waitForTimeout(400);
  is("a link tap closes the drawer", await small.locator('header [id$="-drawer"]').count(), 0);

  // 7. touch targets — the painted box is 42px, the hit area must be 44
  await small.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const target = await small.evaluate(() => {
    const button = document.querySelector('header button[aria-label="Search"]');
    const box = button.getBoundingClientRect();
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    const hits = (x, y) => button.contains(document.elementFromPoint(x, y));
    return {
      painted: Math.round(box.height),
      top: hits(cx, cy - 21.5),
      bottom: hits(cx, cy + 21.5),
      left: hits(cx - 21.5, cy),
      right: hits(cx + 21.5, cy),
    };
  });
  is("the painted icon button is the approved 42px", target.painted, 42);
  target.top && target.bottom && target.left && target.right
    ? ok("its hit area is 44px", "all four edges of a 44px box hit the control")
    : bad("its hit area is 44px", JSON.stringify(target));

  const drawerRow = await small.evaluate(async () => {
    document.querySelector('header button[aria-label="Menu"]').click();
    await new Promise((r) => setTimeout(r, 200));
    const row = document.querySelector('[id$="-drawer"] a');
    return row ? Math.round(row.getBoundingClientRect().height) : 0;
  });
  drawerRow >= 44 ? ok("drawer rows are at least 44px", `${drawerRow}px`)
                  : bad("drawer rows are at least 44px", `${drawerRow}px`);

  // 7. reduced motion
  const calm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const calmPage = await calm.newPage();
  await calmPage.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const durations = await calmPage.evaluate(() =>
    Array.from(document.querySelectorAll("header, header *"))
      .map((node) => getComputedStyle(node).transitionDuration)
      .filter((value) => value && value !== "0s"));
  is("nothing in the header animates under prefers-reduced-motion", durations.length, 0);

  // 8. the font is self-hosted and size-adjusted, so the bar does not reflow
  const fontEvidence = await calmPage.evaluate(() => {
    let adjusted = 0;
    let faces = 0;
    for (const sheet of Array.from(document.styleSheets)) {
      let rules;
      try { rules = Array.from(sheet.cssRules); } catch { continue; }
      for (const rule of rules) {
        if (rule.constructor.name !== "CSSFontFaceRule") continue;
        faces += 1;
        const text = rule.cssText;
        if (text.includes("size-adjust") || text.includes("ascent-override")) adjusted += 1;
      }
    }
    return { faces, adjusted };
  });
  fontEvidence.adjusted > 0
    ? ok("a size-adjusted fallback face is emitted", `${fontEvidence.adjusted} of ${fontEvidence.faces} @font-face rules`)
    : bad("a size-adjusted fallback face is emitted", JSON.stringify(fontEvidence));

  const external = await calmPage.evaluate(() =>
    Array.from(document.querySelectorAll('link[rel="stylesheet"], link[rel="preconnect"]'))
      .map((node) => node.getAttribute("href"))
      .filter((href) => href && /fonts\.(googleapis|gstatic)\.com/.test(href)));
  is("no runtime request to Google Fonts", external.length, 0);
} finally {
  await browser.close();
}

const failed = checks.filter((check) => !check.pass);
for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"}  ${check.name}${check.detail ? `  — ${check.detail}` : ""}`);
}
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);

const out = join(here, "../docs/evidence/site-header-verification.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(evidence, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
