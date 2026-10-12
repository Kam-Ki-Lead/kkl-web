/**
 * The photo-overlay cards under "Featured properties", in a browser.
 *
 * Four things no unit test can see.
 *
 * That the photographs are still the application's own — same src, same lazy
 * loading, same required credit. A restyle that quietly swapped an image for
 * the reference's placeholder would look right and be wrong.
 *
 * That the text is readable ON THE REAL RENDERS. The scrim's alpha is only a
 * promise until it is composited over the actual pixels, so this samples each
 * photograph through a canvas at the height the text occupies, composites the
 * scrim over the brightest pixel it finds there, and computes the contrast
 * ratio the person actually gets.
 *
 * That the card is one link with the heart outside it, which is the difference
 * between a reachable control and an unreachable one.
 *
 * That three widths produce no horizontal scroll.
 *
 * Reads a locally served build. Signs nothing in, buys nothing, touches no
 * deployed environment.
 *
 *   KKL_ENV=development KKL_DATA_SOURCE=sample npx next start -p 3814
 *   PLAYWRIGHT=./node_modules/playwright-core node scripts/verify-featured-photo-cards.mjs
 */
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT ?? "playwright");
const OUT = process.argv[2] ?? null;
const B = process.env.KKL_BASE_URL ?? "http://127.0.0.1:3814";
const CHROME = process.env.KKL_CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

/** For Playwright's own locators, which understand `:text()`. */
const ROW = 'section:has(h2:text("Featured properties"))';
const CARD = `${ROW} article`;

/**
 * For code running in the page, where `:text()` is not a selector. Found by the
 * heading rather than by a class, so a restyle cannot quietly point these
 * checks at the wrong row.
 */
const inPage = () => {
  const row = () =>
    [...document.querySelectorAll("h2")]
      .find((e) => e.textContent.trim() === "Featured properties")
      .closest("section");
  /**
   * The stops of a linear-gradient as the browser reports it.
   *
   * Three shapes have to parse or a contrast check silently measures nothing:
   * the stylesheet writes `rgba()`, the build minifies it to `#rrggbbaa`, and a
   * position may be a percentage, a pixel length, or a bare `0`. Positions come
   * back with their unit so the caller can resolve both against the box the
   * gradient actually paints on.
   */
  const stops = (value) =>
    [...value.matchAll(/(#[0-9a-fA-F]{6,8}|rgba?\([^)]*\))\s*([\d.]+)(px|%)?/g)].map(
      ([, colour, pos, unit]) => {
        const at = Number(pos);
        const rest = { at, unit: unit ?? "px" };
        if (colour.startsWith("#")) {
          const n = (i) => parseInt(colour.slice(1 + i * 2, 3 + i * 2), 16);
          return { rgb: [n(0), n(1), n(2)], alpha: colour.length === 9 ? n(3) / 255 : 1, ...rest };
        }
        const parts = colour.slice(colour.indexOf("(") + 1, -1).split(",").map((v) => Number(v.trim()));
        return { rgb: parts.slice(0, 3), alpha: parts.length > 3 ? parts[3] : 1, ...rest };
      },
    );

  Object.assign(window, {
    __row: row,
    __cards: () => [...row().querySelectorAll("article")],
    __stops: stops,
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

/* -- 1. the row is there -------------------------------------------------- */

const count = await page.evaluate(() => window.__cards().length);
is("the row is full", count, 6);

/* -- 2. the photographs are mine ----------------------------------------- */

const imgs = await page.evaluate(() =>
  window.__cards().flatMap((c) => [...c.querySelectorAll("img")]).map((el) => ({
    src: el.getAttribute("src") ?? "",
    loading: el.getAttribute("loading"),
    fit: getComputedStyle(el).objectFit,
    alt: el.getAttribute("alt") ?? "",
  })));
is("one photograph per card", imgs.length, count);
is("none of them is the reference's placeholder", imgs.some((i) => /\/images\//.test(i.src)), false);
is(
  "every one is served from this application",
  imgs.every((i) => i.src.startsWith("/projects/") || i.src.startsWith("/illustrations/")),
  true,
);
is("lazy loading is untouched", imgs.every((i) => i.loading === "lazy"), true);
is("the photograph covers the new shape", imgs.every((i) => i.fit === "cover"), true);
is(
  "the alt text names the render and the property",
  imgs.filter((i) => /^Artist's impression of .+/.test(i.alt)).length,
  imgs.filter((i) => i.src.startsWith("/projects/")).length,
);
info(`srcs: ${imgs.map((i) => i.src.replace("/projects/", "")).join(", ")}`);

/* -- 3. the required credit survived the move ---------------------------- */

// The innermost element only: the credit's two wrapper spans contain nothing
// else, so their textContent is the credit too, and counting them counted
// every card three times.
const credits = await page.evaluate(() =>
  window.__cards()
    .flatMap((c) => [...c.querySelectorAll("span")])
    .filter((el) => el.children.length === 0)
    .map((el) => el.textContent?.trim())
    .filter((t) => t === "Artist's impression" || t === "Illustration"));
is("every card still carries its credit", credits.length, count);

/*
 * The credit has to be painted ABOVE the scrim, or the disclosure is a dimmed
 * smudge. It does not have to be the topmost element: the full-card link sits
 * over the whole card by design, and it is transparent.
 *
 * So: of the things stacked where the credit is, the credit must come before
 * the scrim. `elementsFromPoint` returns them front to back.
 */
const creditPainted = await page.evaluate(() => {
  const card = window.__cards()[0];
  const el = [...card.querySelectorAll("span")]
    .filter((e) => e.children.length === 0)
    .find((e) => /^(Artist's impression|Illustration)$/.test(e.textContent?.trim() ?? ""));
  if (!el) return "no credit found";
  const box = el.getBoundingClientRect();
  const stack = document.elementsFromPoint(box.left + box.width / 2, box.top + box.height / 2);
  const scrim = card.querySelector('span[aria-hidden="true"]');
  const atCredit = stack.indexOf(el);
  const atScrim = stack.indexOf(scrim);
  if (atCredit === -1) return "the credit is not where it says it is";
  if (atScrim === -1) return "above the scrim";
  return atCredit < atScrim ? "above the scrim" : "behind the scrim";
});
is("the credit is painted above the scrim", creditPainted, "above the scrim");

// The credit sits in a fixed corner while the text block grows from the
// bottom. On the rent card, whose price wraps to two lines, they met: the
// price was drawn straight through "Artist's impression".
const collides = await page.evaluate(() =>
  window.__cards()
    .map((card) => {
      const credit = [...card.querySelectorAll("span")]
        .filter((e) => e.children.length === 0)
        .find((e) => /^(Artist's impression|Illustration)$/.test(e.textContent?.trim() ?? ""));
      const block = card.querySelector("[data-scrim-block]").getBoundingClientRect();
      const r = credit.getBoundingClientRect();
      return r.bottom > block.top
        ? `${card.querySelector("h3").textContent.trim()} (credit ends ${Math.round(r.bottom - block.top)}px into its text)`
        : null;
    })
    .filter(Boolean));
is("no card draws its text over the credit", collides.join(" / "), "");

/* -- 4. one link per card, heart outside it ------------------------------- */

const links = await page.evaluate(() =>
  [...window.__cards()[0].querySelectorAll("a")].map((el) => ({
    href: el.getAttribute("href"),
    label: el.getAttribute("aria-label"),
    nested: Boolean(el.parentElement?.closest("a")),
    pressed: el.hasAttribute("aria-pressed"),
    tabbable: el.tabIndex >= 0,
  })));
is("a card has exactly two controls", links.length, 2);
const cover = links.find((l) => (l.href ?? "").startsWith("/property/"));
const heart = links.find((l) => l.href === "/auth?intent=shortlist");
is("the card link names the property", /^View details of .+/.test(cover?.label ?? ""), true);
is("the heart is labelled for the shortlist", /^Save .+ to shortlist$/.test(heart?.label ?? ""), true);
is("neither is nested in the other", links.some((l) => l.nested), false);
is("the heart is the shortlist route, not a fake toggle", Boolean(heart), true);
is("and it claims no pressed state it cannot keep", heart?.pressed, false);
is("both controls are keyboard reachable", links.every((l) => l.tabbable), true);

const hits = await page.evaluate(() => {
  const box = window.__cards()[0].getBoundingClientRect();
  const at = (x, y) => {
    const el = document.elementFromPoint(x, y);
    return el?.closest("a")?.getAttribute("href") ?? el?.tagName ?? "none";
  };
  return {
    middle: at(box.left + box.width / 2, box.top + box.height * 0.4),
    heart: at(box.right - 30, box.top + 30),
  };
});
is("the middle of the card hits the card link", hits.middle.startsWith("/property/"), true);
is("the heart's corner hits the heart", hits.heart, "/auth?intent=shortlist");

/* -- 5. the focus ring --------------------------------------------------- */

const ringed = await page.evaluate(() => {
  const read = (el) => {
    el.focus();
    const s = getComputedStyle(el);
    return { width: s.outlineWidth, colour: s.outlineColor };
  };
  const card = window.__cards()[0];
  return {
    link: read(card.querySelector('a[href^="/property/"]')),
    heart: read(card.querySelector('a[href^="/auth"]')),
  };
});
const saffron = await page.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue("--color-saffron").trim());
const rgbOf = (hex) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};
is("the focused card carries a 3px outline", ringed.link.width, "3px");
is("in the amber the rest of the site uses", ringed.link.colour, rgbOf(saffron));
is("the focused heart carries one too", ringed.heart.width, "3px");
is("in the same amber", ringed.heart.colour, rgbOf(saffron));

/* -- 6. the fields, and the chips that hide when empty ------------------- */

const read = await page.evaluate(() =>
  window.__cards().map((c) => {
    const chipRow = [...c.querySelectorAll("p")].find((p) => /BHK|sq ft/.test(p.textContent ?? ""));
    const status = [...c.querySelectorAll("p")].find((p) =>
      /Ready to move|Under construction|New launch/.test(p.textContent ?? ""));
    const price = [...c.querySelectorAll("p")].find((p) => (p.textContent ?? "").trim().startsWith("₹"));
    return {
      name: c.querySelector("h3").textContent.trim(),
      price: price?.textContent.trim() ?? null,
      perMonthSmaller: price
        ? (() => {
            const unit = [...price.querySelectorAll("span")].find((s) => s.textContent.includes("/month"));
            if (!unit) return null;
            return parseFloat(getComputedStyle(unit).fontSize) < parseFloat(getComputedStyle(price).fontSize);
          })()
        : null,
      chips: [...(chipRow?.children ?? [])].map((s) => s.textContent.trim()),
      status: status?.textContent.trim() ?? null,
      statusColour: status ? getComputedStyle(status).color : null,
    };
  }));

is("every card leads with a price", read.every((c) => /^₹/.test(c.price ?? "")), true);
const rent = read.filter((c) => (c.price ?? "").includes("/month"));
is("a rent card keeps its unit", rent.length > 0, true);
is("and sets the unit smaller than the rate", rent.every((c) => c.perMonthSmaller === true), true);
is("no chip is drawn empty", read.flatMap((c) => c.chips).every((t) => t.length > 2), true);
is("every card states its status in words", read.every((c) => c.status), true);
for (const c of read) info(`${c.name}: ${c.price} | ${c.chips.join(" + ")} | ${c.status}`);

/* -- 7. the status tints clear 4.5:1 on the scrim's deepest stop --------- */

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
const nums = (css) => css.match(/[\d.]+/g).slice(0, 3).map(Number);

const inkHex = await page.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue("--color-ink").trim());
const ink = nums(rgbOf(inkHex));
const seenWords = new Set();
for (const c of read) {
  const word = c.status.split(" ·")[0];
  if (seenWords.has(word)) continue;
  seenWords.add(word);
  const got = ratio(lum(...nums(c.statusColour)), lum(...ink));
  atLeast(`"${word}" clears 4.5:1 on the scrim's deepest stop`, Number(got.toFixed(2)), 4.5);
}

/* -- 8. readable over the REAL photographs ------------------------------- */

/*
 * Not the token values — the pixels, per text element.
 *
 * For each piece of text on a card: draw the photograph into a canvas with the
 * same cover crop the card shows; for every scanline the text covers, work out
 * how dark the two scrims are THERE (the vignette as a share of the card, the
 * block scrim in pixels from the block's own top); composite them over the
 * brightest photograph pixel the text covers; composite the element's own
 * background over that, because the chips' white/16 lightens what is behind
 * them; and measure against the element's own colour.
 *
 * The brightest pixel, because a scrim that holds over an average fails over a
 * white sky. Canvas can read these because they are served from this origin.
 */
const sampled = await page.evaluate(() => {
  const read = (name) =>
    window.__stops(getComputedStyle(document.documentElement).getPropertyValue(name));
  const vignette = read("--kkl-photo-scrim");
  const block = read("--kkl-photo-scrim-block");
  if (vignette.length < 2 || block.length < 3) {
    throw new Error(`the scrims parsed to ${vignette.length} and ${block.length} stops`);
  }

  /** Alpha `offset` pixels down a gradient painted on a box `height` tall. */
  const alphaAt = (stops, offset, height) => {
    const at = (stop) => (stop.unit === "%" ? (stop.at / 100) * height : stop.at);
    if (offset <= at(stops[0])) return stops[0].alpha;
    for (let i = 1; i < stops.length; i += 1) {
      if (offset <= at(stops[i])) {
        const a = stops[i - 1];
        const b = stops[i];
        return a.alpha + (b.alpha - a.alpha) * ((offset - at(a)) / (at(b) - at(a)));
      }
    }
    return stops[stops.length - 1].alpha;
  };

  const over = (fg, alpha, bg) => bg.map((c, i) => c * (1 - alpha) + fg[i] * alpha);

  /*
   * Colours go through a canvas rather than a regex. Tailwind v4 compiles
   * `text-white/75` to a color-mix(), which `getComputedStyle` hands back as
   * `color(srgb 1 1 1 / 0.75)` — channels 0..1, not 0..255. Read with a regex
   * that assumes 0..255, white became rgb(1, 1, 1) and this check reported the
   * price's unit as near-black at 2.1:1 on code that was fine. The canvas
   * parses whatever the browser parses and always answers in 0..255.
   */
  const probe = document.createElement("canvas");
  probe.width = 1;
  probe.height = 1;
  const pg = probe.getContext("2d", { willReadFrequently: true });
  const colourOf = (css) => {
    pg.clearRect(0, 0, 1, 1);
    pg.fillStyle = css;
    pg.fillRect(0, 0, 1, 1);
    const d = pg.getImageData(0, 0, 1, 1).data;
    return { rgb: [d[0], d[1], d[2]], alpha: d[3] / 255 };
  };

  return window.__cards().flatMap((card) => {
    const box = card.getBoundingClientRect();
    const img = card.querySelector("img");
    const scrim = card.querySelector("[data-scrim-block]").getBoundingClientRect();

    // The photograph, cropped the way the card crops it.
    const w = 96;
    const h = Math.max(1, Math.round((w * box.height) / box.width));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext("2d");
    const want = box.width / box.height;
    const have = img.naturalWidth / img.naturalHeight;
    const sw = have > want ? img.naturalHeight * want : img.naturalWidth;
    const sh = have > want ? img.naturalHeight : img.naturalWidth / want;
    g.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, w, h);
    const photo = g.getImageData(0, 0, w, h).data;

    const name = card.querySelector("h3").textContent.trim();
    const scale = box.height / h;

    return [...card.querySelectorAll("h3, p, p > span")]
      .filter((el) => (el.textContent ?? "").trim().length > 0)
      .map((el) => {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        const own = colourOf(style.backgroundColor);
        const text = colourOf(style.color);

        const y0 = Math.max(0, Math.floor((r.top - box.top) / scale));
        const y1 = Math.min(h - 1, Math.ceil((r.bottom - box.top) / scale));
        const x0 = Math.max(0, Math.floor(((r.left - box.left) / box.width) * w));
        const x1 = Math.min(w - 1, Math.ceil(((r.right - box.left) / box.width) * w));

        let worst = null;
        for (let y = y0; y <= y1; y += 1) {
          const downCard = y * scale;
          const downBlock = downCard + box.top - scrim.top;
          const a =
            1 -
            (1 - alphaAt(vignette, downCard, box.height)) *
              (1 - alphaAt(block, downBlock, scrim.height));
          for (let x = x0; x <= x1; x += 1) {
            const i = (y * w + x) * 4;
            let bg = over(vignette[0].rgb, a, [photo[i], photo[i + 1], photo[i + 2]]);
            if (own.alpha > 0) bg = over(own.rgb, own.alpha, bg);
            const sum = bg[0] + bg[1] + bg[2];
            if (!worst || sum > worst.sum) worst = { sum, bg, a };
          }
        }
        // Text drawn at less than full opacity is its colour over its own
        // background — the "/month" unit is white/75, and measuring the pure
        // white would flatter it.
        const effective = text.alpha < 1 ? over(text.rgb, text.alpha, worst.bg) : text.rgb;
        return {
          name,
          text: (el.textContent ?? "").trim().slice(0, 30),
          colour: effective.map((n) => Math.round(n)),
          behind: worst.bg.map((n) => Math.round(n)),
          alpha: Number(worst.a.toFixed(2)),
        };
      });
  });
});

const worstPerCard = new Map();
for (const row of sampled) {
  const got = ratio(lum(...row.colour), lum(...row.behind));
  const seen = worstPerCard.get(row.name);
  if (!seen || got < seen.got) worstPerCard.set(row.name, { ...row, got });
}
is("every card had its text measured", worstPerCard.size, count);
atLeast("and every text element on them", sampled.length, count * 5);
for (const [cardName, row] of worstPerCard) {
  atLeast(
    `the worst text on ${cardName} clears 4.5:1 over the real render`,
    Number(row.got.toFixed(2)),
    4.5,
  );
  info(`  ${cardName}: "${row.text}" rgb(${row.colour.join(", ")}) over rgb(${row.behind.join(", ")}) at scrim alpha ${row.alpha}`);
}

/* -- 9. the scrim is the ink token, not a new colour --------------------- */

const scrimStops = await page.evaluate(() => {
  const read = (name) =>
    window.__stops(getComputedStyle(document.documentElement).getPropertyValue(name));
  return { vignette: read("--kkl-photo-scrim"), block: read("--kkl-photo-scrim-block") };
});
is("the vignette has its two stops", scrimStops.vignette.length, 2);
is("the block scrim has its three", scrimStops.block.length, 3);
is(
  "every stop in both scrims is the ink token",
  [...scrimStops.vignette, ...scrimStops.block].every((s) => s.rgb.join() === ink.join()),
  true,
);
is("the block scrim is deep before any text starts", scrimStops.block[1].alpha >= 0.7, true);
const describe = (set) => set.map((s) => `${s.alpha.toFixed(2)} @ ${s.at}${s.unit}`).join(" -> ");
info(`ink ${inkHex}: vignette ${describe(scrimStops.vignette)}; block ${describe(scrimStops.block)}`);

/* -- 10. the hover moves, and stops moving when asked to ----------------- */

/*
 * Read `translate` and `scale`, not `transform`: Tailwind v4 compiles
 * `-translate-y-*` and `scale-*` to the individual properties, so a check that
 * reads `transform` sees "none" on a card that is in fact moving — which is
 * how this check first "failed" against working code.
 */
const motion = (target) => ({
  lift: getComputedStyle(target).translate,
  shadow: getComputedStyle(target).boxShadow,
  zoom: getComputedStyle(target.querySelector("img")).scale,
});

await page.locator(CARD).first().hover();
await page.waitForTimeout(400);
const moved = await page.evaluate(`(${motion.toString()})(window.__cards()[0])`);
is("the card lifts on hover", moved.lift, "0px -3px");
atLeast("the photograph zooms", Math.round(Number(moved.zoom) * 100), 104);
is("and a shadow appears under it", moved.shadow.includes("16px 36px"), true);
info(`hover: translate ${moved.lift}, photo scale ${moved.zoom}`);

const still = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: "reduce" });
const quiet = await still.newPage();
await quiet.addInitScript(inPage);
await quiet.goto(B, { waitUntil: "networkidle" });
await quiet.locator(CARD).first().scrollIntoViewIfNeeded();
await quiet.locator(CARD).first().hover();
await quiet.waitForTimeout(400);
const stillMoved = await quiet.evaluate(`(${motion.toString()})(window.__cards()[0])`);
is("under reduced motion the card does not lift", stillMoved.lift, "0px");
is("and the photograph does not zoom", Number(stillMoved.zoom), 1);
await still.close();

/* -- 11. three widths, no horizontal scroll ------------------------------ */

// Off the cards: one left under the pointer is lifted 3px, and a lifted card
// does not share its neighbours' `top`, so the row measures as 1 across.
await page.mouse.move(0, 0);
await page.waitForTimeout(300);

for (const [width, columns] of [[1280, 3], [768, 2], [390, 1]]) {
  await page.setViewportSize({ width, height: 1000 });
  await page.waitForTimeout(300);
  await page.locator(CARD).first().scrollIntoViewIfNeeded();
  const seen = await page.evaluate(() => {
    const cards = window.__cards();
    const top = (c) => Math.round(c.getBoundingClientRect().top);
    const first = cards[0].getBoundingClientRect();
    const heart = cards[0].querySelector('a[href^="/auth"]').getBoundingClientRect();
    return {
      perRow: cards.filter((c) => top(c) === top(cards[0])).length,
      scrollable: document.documentElement.scrollWidth > window.innerWidth + 1,
      ratio: Number((first.width / first.height).toFixed(3)),
      heights: [...new Set(cards.filter((c) => top(c) === top(cards[0])).map((c) => Math.round(c.getBoundingClientRect().height)))],
      radius: getComputedStyle(cards[0]).borderTopLeftRadius,
      gap: getComputedStyle(cards[0].parentElement).gap,
      heart: Math.round(Math.min(heart.width, heart.height)),
      overflowing: cards.some((c) => {
        const box = c.getBoundingClientRect();
        return [...c.querySelectorAll("p, h3, span")].some((e) => {
          const r = e.getBoundingClientRect();
          return r.width > 0 && (r.right > box.right + 1 || r.bottom > box.bottom + 1);
        });
      }),
    };
  });
  is(`at ${width}px the row is ${columns} across`, seen.perRow, columns);
  is(`at ${width}px nothing scrolls sideways`, seen.scrollable, false);
  // 1 : 0.92 is a floor, not a fixed height — a card whose text runs long takes
  // the room rather than clipping it, so the test is "no shorter than", and
  // the cards beside it match.
  is(`at ${width}px the card is no shorter than 1:0.92`, seen.ratio <= 1.088, true);
  is(`at ${width}px the cards in a row are one height`, seen.heights.length, 1);
  is(`at ${width}px the corner is 22px`, seen.radius, "22px");
  is(`at ${width}px the gap is 20px`, seen.gap, "20px");
  is(`at ${width}px nothing spills out of a card`, seen.overflowing, false);
  atLeast(`at ${width}px the heart is at least 36px`, seen.heart, 36);
  if (OUT) await page.locator(ROW).screenshot({ path: `${OUT}/featured-photo-cards-${width}.png` });
}

/* -- 12. the long-name and missing-chip edges ---------------------------- */

await page.setViewportSize({ width: 1280, height: 1000 });
await page.waitForTimeout(250);
const clamped = await page.evaluate(() => {
  const card = window.__cards()[0];
  const h3 = card.querySelector("h3");
  h3.textContent = "A Development With A Name Far Longer Than Anything A Builder Would Reasonably Register Anywhere In Kolkata";
  const lines = Math.round(h3.getBoundingClientRect().height / parseFloat(getComputedStyle(h3).lineHeight));
  const box = card.getBoundingClientRect();
  const arrow = [...card.querySelectorAll("span")]
    .map((e) => e.getBoundingClientRect())
    .filter((r) => Math.round(r.width) === 44 && Math.round(r.height) === 44)[0];
  return {
    lines,
    arrowFound: Boolean(arrow),
    arrowInside: arrow ? arrow.bottom <= box.bottom + 1 && arrow.right <= box.right + 1 : false,
  };
});
is("a very long name clamps to two lines", clamped.lines, 2);
is("the arrow button is the 44px one", clamped.arrowFound, true);
is("and it is still inside the card", clamped.arrowInside, true);

const hidden = await page.evaluate(() => {
  const card = window.__cards()[1];
  const row = [...card.querySelectorAll("p")].find((p) => /BHK|sq ft/.test(p.textContent ?? ""));
  row.lastElementChild.remove();
  const kids = [...row.children];
  return { left: kids.length, empty: kids.some((k) => k.textContent.trim() === "") };
});
is("removing a value leaves one chip, not an empty one", hidden.left, 1);
is("and no blank chip is left behind", hidden.empty, false);

await browser.close();

/* ------------------------------------------------------------- report --- */
const failed = checks.filter((c) => c.startsWith("FAIL"));
console.log(checks.join("\n"));
const total = checks.filter((c) => !c.startsWith("INFO")).length;
console.log(`\n${total - failed.length}/${total} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
