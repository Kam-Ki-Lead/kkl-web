/**
 * The "Popular localities" pill cloud, in a browser.
 *
 * Four things no unit test can see.
 *
 * That white text on the brand pill, and the brand number on the light-purple
 * badge, actually clear 4.5:1 — composited, not assumed. The reference's
 * translucent badge sits at 4.36:1 over the brand, which is why this card
 * draws it differently; without this check that would have shipped.
 *
 * That the pills wrap with no horizontal scroll at three widths.
 *
 * That each pill's accessible name carries its count once, with the badge out
 * of the tree, rather than twice.
 *
 * That no image was introduced into a section that never had one.
 *
 * Reads a locally served build. Signs nothing in, buys nothing, touches no
 * deployed environment.
 *
 *   KKL_ENV=development KKL_DATA_SOURCE=sample npx next start -p 3814
 *   PLAYWRIGHT=./node_modules/playwright-core node scripts/verify-locality-pills.mjs
 */
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT ?? "playwright");
const OUT = process.argv[2] ?? null;
const B = process.env.KKL_BASE_URL ?? "http://127.0.0.1:3814";
const CHROME = process.env.KKL_CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const SECTION = 'section:has(h2:text("Popular localities"))';

const inPage = () => {
  const section = () =>
    [...document.querySelectorAll("h2")]
      .find((e) => e.textContent.trim() === "Popular localities")
      .closest("section");
  const probe = document.createElement("canvas");
  probe.width = 1;
  probe.height = 1;
  const pg = probe.getContext("2d", { willReadFrequently: true });
  Object.assign(window, {
    __section: section,
    __pills: () => [...section().querySelectorAll("li > a")],
    /** Any CSS colour, in 0..255 plus alpha — whatever syntax the browser hands back. */
    __colour: (css) => {
      pg.clearRect(0, 0, 1, 1);
      pg.fillStyle = css;
      pg.fillRect(0, 0, 1, 1);
      const d = pg.getImageData(0, 0, 1, 1).data;
      return { rgb: [d[0], d[1], d[2]], alpha: d[3] / 255 };
    },
  });
};

const checks = [];
const is = (n, a, e) =>
  checks.push(`${a === e ? "PASS" : "FAIL"}  ${n} — ${JSON.stringify(a)}${a === e ? "" : ` (expected ${JSON.stringify(e)})`}`);
const atLeast = (n, a, e) =>
  checks.push(`${a >= e ? "PASS" : "FAIL"}  ${n} — ${JSON.stringify(a)}${a >= e ? "" : ` (expected at least ${JSON.stringify(e)})`}`);
const info = (d) => checks.push(`INFO  ${d}`);

const lum = (r, g, b) => {
  const f = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
};

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.addInitScript(inPage);
await page.goto(B, { waitUntil: "networkidle" });

/*
 * The section is behind SHOW_POPULAR_LOCALITIES, which is off at the client's
 * request. With it off there is nothing to measure, so this reports that and
 * stops — rather than failing, which would read as the component being broken,
 * or passing silently, which would hide that the checks are not running.
 */
if ((await page.locator(SECTION).count()) === 0) {
  console.log('SKIP  the pill cloud is hidden by SHOW_POPULAR_LOCALITIES — 0 of its checks ran');
  console.log('      Turn the flag on in src/lib/domain/locality-pills.ts to run them again.');
  await browser.close();
  process.exit(0);
}

await page.locator(SECTION).scrollIntoViewIfNeeded();
await page.waitForTimeout(400);

/* -- 1. the section, the heading, the subtitle --------------------------- */

const shell = await page.evaluate(() => {
  const s = window.__section();
  const h = s.querySelector("h2");
  const sub = s.querySelector("p");
  const totals = s.querySelector("[data-locality-totals]")?.dataset.localityTotals ?? null;
  return {
    labelled: s.getAttribute("aria-labelledby") === h.id && Boolean(h.id),
    heading: h.textContent.trim(),
    headingSize: getComputedStyle(h).fontSize,
    headingWeight: getComputedStyle(h).fontWeight,
    subtitle: sub?.textContent.trim() ?? null,
    totals,
    list: s.querySelector("ul") ? s.querySelector("ul").tagName : "none",
    itemsAreListItems: [...s.querySelectorAll("ul > *")].every((e) => e.tagName === "LI"),
    oldGrid: /Browse by locality/.test(document.body.innerText),
  };
});
is("the heading is the new one", shell.heading, "Popular localities");
is("and the old one is gone from the page", shell.oldGrid, false);
is("the section is labelled by its heading", shell.labelled, true);
is("the heading is 36px at desktop", shell.headingSize, "36px");
is("and bold", shell.headingWeight, "700");
is("the pills are a list", shell.list, "UL");
is("of list items", shell.itemsAreListItems, true);
is(
  "the subtitle still quotes the page's own totals",
  shell.subtitle,
  `${shell.totals.split("/")[0]} listings across ${shell.totals.split("/")[1]} localities`,
);
info(`subtitle: "${shell.subtitle}" (totals ${shell.totals})`);

/* -- 2. no image was introduced ------------------------------------------ */

const imagery = await page.evaluate(() => {
  const s = window.__section();
  return {
    imgs: s.querySelectorAll("img, picture, svg").length,
    backgrounds: [...s.querySelectorAll("*")].filter((e) => {
      const b = getComputedStyle(e).backgroundImage;
      return b && b !== "none";
    }).length,
  };
});
is("the section draws no image element", imagery.imgs, 0);
is("and no background picture", imagery.backgrounds, 0);

/* -- 3. the pills: data, order, destinations ----------------------------- */

const pills = await page.evaluate(() =>
  window.__pills().map((a) => {
    const badge = a.querySelector("[aria-hidden='true']");
    const name = a.firstElementChild;
    return {
      href: a.getAttribute("href"),
      label: a.getAttribute("aria-label"),
      text: a.textContent.trim().replace(/\s+/g, " "),
      name: name?.textContent.trim() ?? null,
      badge: badge?.textContent.trim() ?? null,
      badgeHidden: badge?.getAttribute("aria-hidden") === "true",
      bg: getComputedStyle(a).backgroundColor,
      colour: getComputedStyle(a).color,
      badgeBg: badge ? getComputedStyle(badge).backgroundColor : null,
      badgeColour: badge ? getComputedStyle(badge).color : null,
      height: Math.round(a.getBoundingClientRect().height),
      radius: getComputedStyle(a).borderTopLeftRadius,
      dashed: getComputedStyle(a).borderTopStyle === "dashed",
      ellipsis: getComputedStyle(name ?? a).textOverflow,
    };
  }));

const locality = pills.filter((p) => (p.href ?? "").startsWith("/search?locality="));
const more = pills.filter((p) => p.href === "/search");
atLeast("there are locality pills", locality.length, 1);
is("each one goes where its card went", locality.every((p) => /^\/search\?locality=[^&]+$/.test(p.href)), true);
is(
  "each one is named for a screen reader as 'name, N listing(s)'",
  locality.every((p) => /^.+, (1 listing|\d+ listings)$/.test(p.label ?? "")),
  true,
);
is("the count badge is out of the accessibility tree", locality.every((p) => p.badgeHidden), true);
is(
  "so the count is announced once, not twice",
  locality.every((p) => (p.label.match(/\d+/g) ?? []).length === 1),
  true,
);
is("every pill clears a 48px tap target", locality.every((p) => p.height >= 48), true);
is("every pill is fully rounded", locality.every((p) => parseFloat(p.radius) >= 24), true);
is("a long name would ellipsis rather than break the pill", locality.every((p) => p.ellipsis === "ellipsis"), true);
is("exactly one overflow pill", more.length, 1);
is("it is dashed", more[0]?.dashed, true);
is("and it reads as a count of what is not shown", /^\+\d+ more localit(y|ies)$/.test(more[0]?.text ?? ""), true);
is(
  "whose number is the subtitle's total minus the pills shown",
  Number(more[0].text.match(/\d+/)[0]),
  Number(shell.totals.split("/")[1]) - locality.length,
);
for (const p of locality) info(`${p.name} ${p.badge} -> ${p.href} ("${p.label}")`);
info(`overflow: "${more[0].text}" -> ${more[0].href}`);

/* -- 4. the badge agrees with the label ---------------------------------- */

is(
  "the badge number is the number in the accessible name",
  locality.every((p) => p.label.includes(` ${p.badge} listing`)),
  true,
);
is(
  "and one listing is singular",
  locality.filter((p) => p.badge === "1").every((p) => p.label.endsWith(", 1 listing")),
  true,
);

/* -- 5. highlighting ------------------------------------------------------ */

const brand = await page.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue("--color-brand").trim());
const brandRgb = await page.evaluate((hex) => window.__colour(hex).rgb, brand);
const hot = [];
const cool = [];
for (const p of locality) {
  const rgb = await page.evaluate((css) => window.__colour(css).rgb, p.bg);
  (rgb.join() === brandRgb.join() ? hot : cool).push(p);
}
is(
  "a pill is highlighted exactly when its count reaches the threshold",
  hot.every((p) => Number(p.badge) >= 3) && cool.every((p) => Number(p.badge) < 3),
  true,
);
info(`highlighted: ${hot.map((p) => `${p.name} (${p.badge})`).join(", ") || "none"}`);
info(`plain: ${cool.map((p) => `${p.name} (${p.badge})`).join(", ") || "none"}`);

/* -- 6. contrast, composited --------------------------------------------- */

/*
 * The badge on a highlighted pill is translucent white over the brand, so its
 * number's background is neither colour on its own. Each foreground is
 * composited over what is actually behind it before measuring.
 */
const measured = await page.evaluate(() =>
  window.__pills().map((a) => {
    const read = (css) => window.__colour(css);
    const over = (fg, bg) => bg.rgb.map((c, i) => c * (1 - fg.alpha) + fg.rgb[i] * fg.alpha);
    const page = read(getComputedStyle(document.body).backgroundColor);
    const pillBg = read(getComputedStyle(a).backgroundColor);
    const behindPill = { rgb: over(pillBg, page), alpha: 1 };
    const badge = a.querySelector("[aria-hidden='true']");
    const rows = [
      { what: "name", fg: read(getComputedStyle(a).color), bg: behindPill },
    ];
    if (badge) {
      const badgeBg = read(getComputedStyle(badge).backgroundColor);
      rows.push({
        what: "badge",
        fg: read(getComputedStyle(badge).color),
        bg: { rgb: over(badgeBg, behindPill), alpha: 1 },
      });
    }
    return {
      name: (a.firstElementChild ?? a).textContent.trim(),
      rows: rows.map((r) => ({ what: r.what, fg: over(r.fg, r.bg), bg: r.bg.rgb })),
    };
  }));

for (const pill of measured) {
  for (const row of pill.rows) {
    const got = ratio(lum(...row.fg), lum(...row.bg));
    atLeast(
      `"${pill.name}" ${row.what} clears 4.5:1`,
      Number(got.toFixed(2)),
      4.5,
    );
  }
}

/* -- 7. hover, focus, reduced motion ------------------------------------- */

const first = page.locator(`${SECTION} li > a`).first();
await first.hover();
await page.waitForTimeout(300);
const hovered = await page.evaluate(() => {
  const a = window.__pills()[0];
  const s = getComputedStyle(a);
  return { lift: s.translate, border: s.borderTopColor };
});
const brandCss = await page.evaluate((hex) => {
  const { rgb } = window.__colour(hex);
  return `rgb(${rgb.join(", ")})`;
}, brand);
is("a hovered pill lifts 1px", hovered.lift, "0px -1px");
is("and its border turns brand", hovered.border, brandCss);

const ring = await page.evaluate(() => {
  const a = window.__pills()[0];
  a.focus();
  const s = getComputedStyle(a);
  return `${s.outlineWidth} ${s.outlineOffset} ${s.outlineColor}`;
});
const saffronCss = await page.evaluate(() => {
  const hex = getComputedStyle(document.documentElement).getPropertyValue("--color-saffron").trim();
  const { rgb } = window.__colour(hex);
  return `rgb(${rgb.join(", ")})`;
});
is("a focused pill carries a 3px amber outline at 2px offset", ring, `3px 2px ${saffronCss}`);

const still = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: "reduce" });
const quiet = await still.newPage();
await quiet.addInitScript(inPage);
await quiet.goto(B, { waitUntil: "networkidle" });
await quiet.locator(SECTION).scrollIntoViewIfNeeded();
await quiet.locator(`${SECTION} li > a`).first().hover();
await quiet.waitForTimeout(300);
const stillLift = await quiet.evaluate(() => getComputedStyle(window.__pills()[0]).translate);
is("under reduced motion the pill does not lift", ["none", "0px"].includes(stillLift), true);
await still.close();

/* -- 8. three widths, wrapping cleanly ----------------------------------- */

await page.mouse.move(0, 0);
for (const width of [1280, 768, 390]) {
  await page.setViewportSize({ width, height: 1000 });
  await page.waitForTimeout(300);
  await page.locator(SECTION).scrollIntoViewIfNeeded();
  const seen = await page.evaluate(() => {
    const s = window.__section();
    const box = s.getBoundingClientRect();
    const pills = window.__pills();
    const rows = new Set(pills.map((a) => Math.round(a.getBoundingClientRect().top)));
    return {
      scrollable: document.documentElement.scrollWidth > window.innerWidth + 1,
      inside: pills.every((a) => {
        const b = a.getBoundingClientRect();
        return b.left >= box.left - 1 && b.right <= box.right + 1;
      }),
      rows: rows.size,
      wraps: getComputedStyle(s.querySelector("ul")).flexWrap,
      minHeight: Math.min(...pills.map((a) => Math.round(a.getBoundingClientRect().height))),
      headingSize: getComputedStyle(s.querySelector("h2")).fontSize,
    };
  });
  is(`at ${width}px nothing scrolls sideways`, seen.scrollable, false);
  is(`at ${width}px every pill is inside the section`, seen.inside, true);
  is(`at ${width}px the row wraps`, seen.wraps, "wrap");
  atLeast(`at ${width}px every pill still clears 48px`, seen.minHeight, 48);
  info(`  ${width}px: ${seen.rows} row(s) of pills, heading ${seen.headingSize}`);
  if (OUT) await page.locator(SECTION).screenshot({ path: `${OUT}/locality-pills-${width}.png` });
}
is("the heading steps down on a phone", (await page.evaluate(() =>
  getComputedStyle(window.__section().querySelector("h2")).fontSize)), "26px");

/* -- 9. a long name and a large count ------------------------------------ */

await page.setViewportSize({ width: 1280, height: 1000 });
await page.waitForTimeout(250);
const stretched = await page.evaluate(() => {
  const a = window.__pills()[0];
  const before = Math.round(a.getBoundingClientRect().height);
  const name = a.firstElementChild;
  const badge = a.querySelector("[aria-hidden='true']");
  name.textContent = "A Locality With A Name Far Longer Than Anything Kolkata Has Ever Registered Anywhere";
  badge.textContent = "120";
  const box = a.getBoundingClientRect();
  const section = window.__section().getBoundingClientRect();
  return {
    sameHeight: Math.round(box.height) === before,
    insideSection: box.right <= section.right + 1,
    badgeWidth: Math.round(badge.getBoundingClientRect().width),
    badgeVisible: badge.getBoundingClientRect().width > 0 && badge.scrollWidth <= badge.clientWidth + 1,
  };
});
is("a very long name does not make the pill taller", stretched.sameHeight, true);
is("and does not push it out of the section", stretched.insideSection, true);
is("a three-digit count still fits its badge", stretched.badgeVisible, true);
atLeast("which grew to take it", stretched.badgeWidth, 30);

await browser.close();

/* ------------------------------------------------------------- report --- */
const failed = checks.filter((c) => c.startsWith("FAIL"));
console.log(checks.join("\n"));
const total = checks.filter((c) => !c.startsWith("INFO")).length;
console.log(`\n${total - failed.length}/${total} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
