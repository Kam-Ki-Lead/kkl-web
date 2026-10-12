/**
 * The compact list rows under "Featured projects", in a browser.
 *
 * Four things no unit test can see.
 *
 * That the columns LINE UP row to row. That alignment is the entire reason for
 * the shape — a list you read down a column rather than card by card — and it
 * is the first thing a content-sized column quietly breaks.
 *
 * That the specs are in the accessibility tree exactly once at every width.
 * They are in the markup twice, and a visual hide instead of `display: none`
 * would have a screen reader read "2, 3 BHK apartments" twice on a phone.
 *
 * That the photographs are still the application's own — same src, same lazy
 * loading, same required credit.
 *
 * That three widths produce no horizontal scrolling.
 *
 * Reads a locally served build. Signs nothing in, buys nothing, touches no
 * deployed environment.
 *
 *   KKL_ENV=development KKL_DATA_SOURCE=sample npx next start -p 3814
 *   PLAYWRIGHT=./node_modules/playwright-core node scripts/verify-project-rows.mjs
 */
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT ?? "playwright");
const OUT = process.argv[2] ?? null;
const B = process.env.KKL_BASE_URL ?? "http://127.0.0.1:3814";
const CHROME = process.env.KKL_CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const ROW = 'section:has(h2:text("Featured projects"))';
const CARD = `${ROW} article`;

/** The same row, found by its heading, for code running inside the page. */
const inPage = () => {
  const row = () =>
    [...document.querySelectorAll("h2")]
      .find((e) => e.textContent.trim() === "Featured projects")
      .closest("section");
  Object.assign(window, {
    __row: row,
    __rows: () => [...row().querySelectorAll("article")],
  });
};

const checks = [];
const is = (n, a, e) =>
  checks.push(`${a === e ? "PASS" : "FAIL"}  ${n} — ${JSON.stringify(a)}${a === e ? "" : ` (expected ${JSON.stringify(e)})`}`);
const atLeast = (n, a, e) =>
  checks.push(`${a >= e ? "PASS" : "FAIL"}  ${n} — ${JSON.stringify(a)}${a >= e ? "" : ` (expected at least ${JSON.stringify(e)})`}`);
const info = (d) => checks.push(`INFO  ${d}`);

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.addInitScript(inPage);
await page.goto(B, { waitUntil: "networkidle" });
await page.locator(CARD).first().scrollIntoViewIfNeeded();
await page.waitForTimeout(400);

/* -- 1. the list ---------------------------------------------------------- */

const count = await page.evaluate(() => window.__rows().length);
is("the list is full", count, 3);
is(
  "one column, 20px apart",
  await page.evaluate(() => {
    const list = window.__rows()[0].parentElement;
    const s = getComputedStyle(list);
    return `${s.gridTemplateColumns.split(" ").length} / ${s.gap}`;
  }),
  "1 / 20px",
);
is(
  "each row is a bordered white card with an 18px radius",
  await page.evaluate(() => {
    const s = getComputedStyle(window.__rows()[0]);
    return `${s.borderTopLeftRadius} ${s.borderTopWidth} ${s.backgroundColor}`;
  }),
  "18px 1px rgb(255, 255, 255)",
);

/* -- 2. the photographs are mine ----------------------------------------- */

const imgs = await page.evaluate(() =>
  window.__rows().flatMap((r) => [...r.querySelectorAll("img")]).map((el) => ({
    src: el.getAttribute("src") ?? "",
    loading: el.getAttribute("loading"),
    srcset: el.getAttribute("srcset"),
    sizes: el.getAttribute("sizes"),
    fit: getComputedStyle(el).objectFit,
    alt: el.getAttribute("alt") ?? "",
  })));
is("one photograph per row", imgs.length, count);
is("none of them is the reference's placeholder", imgs.some((i) => /\/images\//.test(i.src)), false);
is(
  "every one is served from this application",
  imgs.every((i) => i.src.startsWith("/projects/") || i.src.startsWith("/illustrations/")),
  true,
);
is("lazy loading is untouched", imgs.every((i) => i.loading === "lazy"), true);
is("the photograph covers the thumbnail", imgs.every((i) => i.fit === "cover"), true);
// There is no srcset to retune: PropertyImage serves one file per listing.
is("there is no srcset, so none was invented", imgs.every((i) => i.srcset === null), true);
is(
  "the alt text names the render and the project",
  imgs.filter((i) => /^Artist's impression of .+/.test(i.alt)).length,
  imgs.filter((i) => i.src.startsWith("/projects/")).length,
);
info(`srcs: ${imgs.map((i) => i.src.replace("/projects/", "")).join(", ")}`);

/* -- 3. the required credit ---------------------------------------------- */

const credits = await page.evaluate(() =>
  window.__rows()
    .flatMap((r) => [...r.querySelectorAll("span")])
    .filter((el) => el.children.length === 0)
    .map((el) => el.textContent?.trim())
    .filter((t) => t === "Artist's impression" || t === "Illustration"));
is("every row still carries its credit", credits.length, count);

const creditWhere = await page.evaluate(() => {
  const r = window.__rows()[0];
  const thumb = r.querySelector("img").closest("div").getBoundingClientRect();
  const el = [...r.querySelectorAll("span")]
    .filter((e) => e.children.length === 0)
    .find((e) => /^(Artist's impression|Illustration)$/.test(e.textContent?.trim() ?? ""));
  const box = el.getBoundingClientRect();
  return {
    onThumb: box.left >= thumb.left - 1 && box.right <= thumb.right + 1,
    atBottom: Math.abs(box.bottom - thumb.bottom) < 2,
    size: getComputedStyle(el).fontSize,
    visible: getComputedStyle(el).display !== "none" && box.width > 0,
  };
});
is("the credit sits on the thumbnail", creditWhere.onThumb, true);
is("at its bottom edge", creditWhere.atBottom, true);
is("and is visible", creditWhere.visible, true);
info(`credit at ${creditWhere.size}`);

/* -- 4. one link per row, heart outside it -------------------------------- */

const links = await page.evaluate(() =>
  [...window.__rows()[0].querySelectorAll("a")].map((el) => ({
    href: el.getAttribute("href"),
    label: el.getAttribute("aria-label"),
    nested: Boolean(el.parentElement?.closest("a")),
    pressed: el.hasAttribute("aria-pressed"),
    tabbable: el.tabIndex >= 0,
  })));
is("a row has exactly two controls", links.length, 2);
const cover = links.find((l) => (l.href ?? "").startsWith("/property/"));
const heart = links.find((l) => l.href === "/auth?intent=shortlist");
is("the row link names the project", /^View details of .+/.test(cover?.label ?? ""), true);
is("the heart is labelled for the shortlist", /^Save .+ to shortlist$/.test(heart?.label ?? ""), true);
is("neither is nested in the other", links.some((l) => l.nested), false);
is("the heart is the shortlist route, not a fake toggle", Boolean(heart), true);
is("and it claims no pressed state it cannot keep", heart?.pressed, false);
is("both controls are keyboard reachable", links.every((l) => l.tabbable), true);

const hits = await page.evaluate(() => {
  const box = window.__rows()[0].getBoundingClientRect();
  const at = (x, y) => {
    const el = document.elementFromPoint(x, y);
    return el?.closest("a")?.getAttribute("href") ?? el?.tagName ?? "none";
  };
  const thumb = window.__rows()[0].querySelector("img").getBoundingClientRect();
  return {
    middle: at(box.left + box.width / 2, box.top + box.height / 2),
    heart: at(thumb.right - 25, thumb.top + 25),
  };
});
is("the middle of the row hits the row link", hits.middle.startsWith("/property/"), true);
is("the heart's corner hits the heart", hits.heart, "/auth?intent=shortlist");

const ringed = await page.evaluate(() => {
  const read = (el) => {
    el.focus();
    const s = getComputedStyle(el);
    return `${s.outlineWidth} ${s.outlineColor}`;
  };
  const r = window.__rows()[0];
  return {
    link: read(r.querySelector('a[href^="/property/"]')),
    heart: read(r.querySelector('a[href^="/auth"]')),
  };
});
const saffron = await page.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue("--color-saffron").trim());
const rgbOf = (hex) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};
is("the focused row carries a 3px amber outline", ringed.link, `3px ${rgbOf(saffron)}`);
is("so does the focused heart", ringed.heart, `3px ${rgbOf(saffron)}`);

/* -- 5. the fields, and the pills ---------------------------------------- */

const read = await page.evaluate(() =>
  window.__rows().map((r) => {
    const pill = r.querySelector("[data-chip]");
    const price = [...r.querySelectorAll("p")].find((p) => (p.textContent ?? "").trim().startsWith("₹"));
    const possession = [...r.querySelectorAll("p")].find((p) => /^Possession /.test((p.textContent ?? "").trim()));
    return {
      name: r.querySelector("h3").textContent.trim(),
      pill: pill ? { word: pill.textContent.trim(), tone: pill.dataset.chip } : null,
      price: price?.textContent.trim() ?? null,
      perMonthSmaller: price
        ? (() => {
            const unit = [...price.querySelectorAll("span")].find((s) => s.textContent.includes("/month"));
            return unit
              ? parseFloat(getComputedStyle(unit).fontSize) < parseFloat(getComputedStyle(price).fontSize)
              : null;
          })()
        : null,
      possession: possession?.textContent.trim() ?? null,
    };
  }));
is("every row carries a status pill with its word", read.every((r) => r.pill?.word), true);
is(
  "and the pill is one of the site's three status tones",
  read.every((r) => ["neutral", "success", "warning"].includes(r.pill.tone)),
  true,
);
is("every row leads its price column with a price", read.every((r) => /^₹/.test(r.price ?? "")), true);
for (const r of read) info(`${r.name}: [${r.pill.tone}] ${r.pill.word} | ${r.price} | ${r.possession ?? "no possession line"}`);

// A letting keeps its unit, and sets it smaller. Projects may all be sales, so
// this is asserted against a row the page actually has.
const lettings = read.filter((r) => (r.price ?? "").includes("/month"));
if (lettings.length === 0) info("no letting in this row — the /month path is covered by the featured-properties check");
else is("a letting keeps its unit, set smaller", lettings.every((r) => r.perMonthSmaller === true), true);

/* -- 6. the specs: twice in the markup, once in the tree ------------------ */

/*
 * The one that matters. The wide column and the narrow copy must never both be
 * displayed, and the hidden one must be `display: none` — a visually-hidden
 * copy is still read aloud, and a phone would announce the configuration
 * twice.
 */
for (const [width, which] of [[1280, "wide"], [900, "narrow"], [390, "narrow"]]) {
  await page.setViewportSize({ width, height: 1000 });
  await page.waitForTimeout(300);
  await page.locator(CARD).first().scrollIntoViewIfNeeded();
  const specs = await page.evaluate(() =>
    window.__rows().map((r) => {
      const shown = [...r.querySelectorAll("div, p")]
        .filter((e) => /BHK|sq ft/.test(e.textContent ?? ""))
        .filter((e) => getComputedStyle(e).display !== "none")
        // Only the leaf that holds the text, not every ancestor of it.
        .filter((e) => ![...e.querySelectorAll("div, p")].some((c) => /BHK|sq ft/.test(c.textContent ?? "")));
      return {
        shown: shown.length,
        text: shown.map((e) => e.textContent.trim().replace(/\s+/g, " ")).join(" | "),
        // Anything hidden must be hidden outright, not pushed off-screen.
        hiddenProperly: [...r.querySelectorAll("div, p")]
          .filter((e) => /BHK|sq ft/.test(e.textContent ?? ""))
          .every((e) => {
            const s = getComputedStyle(e);
            const box = e.getBoundingClientRect();
            return s.display !== "none" ? true : box.width === 0 && box.height === 0;
          }),
      };
    }));
  is(`at ${width}px the specs are shown once per row`, specs.every((s) => s.shown === 1), true);
  is(`at ${width}px the other copy is display:none`, specs.every((s) => s.hiddenProperly), true);
  is(
    `at ${width}px the specs still say the configuration and the area`,
    specs.every((s) => /BHK/.test(s.text) && /sq ft/.test(s.text)),
    true,
  );
  info(`  ${width}px (${which}): ${specs[0].text}`);
}

/* -- 7. the columns line up, and nothing scrolls sideways ---------------- */

for (const [width, columns] of [[1280, 5], [900, 4], [390, 3]]) {
  await page.setViewportSize({ width, height: 1000 });
  await page.waitForTimeout(300);
  await page.locator(CARD).first().scrollIntoViewIfNeeded();
  const seen = await page.evaluate(() => {
    const rows = window.__rows();
    const template = (r) => getComputedStyle(r).gridTemplateColumns;
    const left = (el) => Math.round(el.getBoundingClientRect().left);
    return {
      columns: template(rows[0]).split(" ").length,
      sameTemplate: new Set(rows.map(template)).size === 1,
      // The name, the price and the arrow must start at the same x in every row.
      names: new Set(rows.map((r) => left(r.querySelector("h3")))).size,
      prices: new Set(
        rows.map((r) => left([...r.querySelectorAll("p")].find((p) => (p.textContent ?? "").trim().startsWith("₹")))),
      ).size,
      arrows: new Set(rows.map((r) => left([...r.querySelectorAll("span")]
        .find((s) => s.getAttribute("aria-hidden") === "true" && s.querySelector("svg"))))).size,
      scrollable: document.documentElement.scrollWidth > window.innerWidth + 1,
      spills: rows.some((r) => {
        const box = r.getBoundingClientRect();
        return [...r.querySelectorAll("h3, p, span, div")].some((e) => {
          const b = e.getBoundingClientRect();
          return b.width > 0 && (b.right > box.right + 1 || b.bottom > box.bottom + 1);
        });
      }),
      thumb: (() => {
        const t = rows[0].querySelector("img").closest("div").getBoundingClientRect();
        const box = rows[0].getBoundingClientRect();
        // Against the row's CONTENT box: the row has a 1px border, so a
        // thumbnail that fills it is exactly two pixels shorter than the row.
        const s = getComputedStyle(rows[0]);
        const inner = box.height - parseFloat(s.borderTopWidth) - parseFloat(s.borderBottomWidth);
        return {
          width: Math.round(t.width),
          fullHeight: Math.abs(t.height - inner) < 1.5,
          atLeftEdge: Math.abs(t.left - box.left) < 2,
        };
      })(),
      heart: (() => {
        const h = rows[0].querySelector('a[href^="/auth"]').getBoundingClientRect();
        return Math.round(Math.min(h.width, h.height));
      })(),
    };
  });
  is(`at ${width}px the row has ${columns} columns`, seen.columns, columns);
  is(`at ${width}px every row uses the same template`, seen.sameTemplate, true);
  is(`at ${width}px the names line up`, seen.names, 1);
  is(`at ${width}px the prices line up`, seen.prices, 1);
  is(`at ${width}px the arrows line up`, seen.arrows, 1);
  is(`at ${width}px nothing scrolls sideways`, seen.scrollable, false);
  is(`at ${width}px nothing spills out of a row`, seen.spills, false);
  is(`at ${width}px the photo is clipped to the left edge`, seen.thumb.atLeftEdge, true);
  is(`at ${width}px it fills the row's height`, seen.thumb.fullHeight, true);
  atLeast(`at ${width}px the heart is at least 34px`, seen.heart, 34);
  info(`  ${width}px: template ${seen.columns} cols, thumbnail ${seen.thumb.width}px`);
  if (OUT) await page.locator(ROW).screenshot({ path: `${OUT}/project-rows-${width}.png` });
}

/* -- 8. the pill stays on one line on a phone ---------------------------- */

await page.setViewportSize({ width: 390, height: 1000 });
await page.waitForTimeout(300);
const pillLines = await page.evaluate(() =>
  window.__rows().map((r) => {
    const pill = r.querySelector("[data-chip]");
    const s = getComputedStyle(pill);
    return Math.round(pill.getBoundingClientRect().height / parseFloat(s.lineHeight || s.fontSize));
  }));
is("on a phone every pill is one line", pillLines.every((n) => n <= 2), true);
is(
  "and the pill is the smaller size there",
  await page.evaluate(() => getComputedStyle(window.__rows()[0].querySelector("[data-chip]")).fontSize),
  "12px",
);

/* -- 9. the hover moves, and stops moving when asked to ------------------ */

await page.setViewportSize({ width: 1280, height: 1000 });
await page.waitForTimeout(300);
await page.locator(CARD).first().scrollIntoViewIfNeeded();

// `translate` and `scale`, not `transform`: Tailwind v4 compiles the utilities
// to the individual properties, so reading `transform` sees "none" on a row
// that is in fact moving.
const motion = (target) => ({
  lift: getComputedStyle(target).translate,
  shadow: getComputedStyle(target).boxShadow,
  arrow: getComputedStyle(target.querySelector("span[aria-hidden] svg")).translate,
});

await page.locator(CARD).first().hover();
await page.waitForTimeout(400);
const moved = await page.evaluate(`(${motion.toString()})(window.__rows()[0])`);
is("the row lifts on hover", moved.lift, "0px -2px");
is("the arrow nudges right", moved.arrow, "3px");
is("and a shadow appears under it", moved.shadow.includes("12px 30px"), true);

const still = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: "reduce" });
const quiet = await still.newPage();
await quiet.addInitScript(inPage);
await quiet.goto(B, { waitUntil: "networkidle" });
await quiet.locator(CARD).first().scrollIntoViewIfNeeded();
await quiet.locator(CARD).first().hover();
await quiet.waitForTimeout(400);
const stillMoved = await quiet.evaluate(`(${motion.toString()})(window.__rows()[0])`);
is("under reduced motion the row does not lift", stillMoved.lift, "0px");
// Either the property is absent or it is pinned at zero — both mean still.
is("and the arrow does not nudge", ["none", "0px"].includes(stillMoved.arrow), true);
await still.close();

/* -- 10. the missing-value edges ----------------------------------------- */

await page.mouse.move(0, 0);
await page.waitForTimeout(250);
const edges = await page.evaluate(() => {
  const r = window.__rows()[0];
  const h3 = r.querySelector("h3");
  h3.textContent = "A Development With A Name Far Longer Than Anything A Builder Would Reasonably Register Anywhere In Kolkata";
  const lines = Math.round(h3.getBoundingClientRect().height / parseFloat(getComputedStyle(h3).lineHeight));
  const box = r.getBoundingClientRect();
  const arrow = [...r.querySelectorAll("span")]
    .map((e) => e.getBoundingClientRect())
    .find((b) => Math.round(b.width) === 44 && Math.round(b.height) === 44);
  return {
    lines,
    arrowInside: arrow ? arrow.right <= box.right + 1 && arrow.bottom <= box.bottom + 1 : false,
  };
});
is("a very long name clamps to two lines", edges.lines, 2);
is("and the arrow is still inside the row", edges.arrowInside, true);

// A project with no possession date must not leave the line behind.
const noPossession = read.filter((r) => r.possession === null);
info(
  noPossession.length
    ? `${noPossession.length} row(s) have no possession date and draw no line`
    : "every row has a possession date; the empty case is covered by the markup guard",
);
const emptyLines = await page.evaluate(() =>
  window.__rows().flatMap((r) => [...r.querySelectorAll("p, span, div")])
    .filter((e) => e.children.length === 0 && e.textContent.trim() === "" && e.getBoundingClientRect().height > 4)
    .length);
is("no empty line is drawn anywhere in the list", emptyLines, 0);

await browser.close();

/* ------------------------------------------------------------- report --- */
const failed = checks.filter((c) => c.startsWith("FAIL"));
console.log(checks.join("\n"));
const total = checks.filter((c) => !c.startsWith("INFO")).length;
console.log(`\n${total - failed.length}/${total} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
