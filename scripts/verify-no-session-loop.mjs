/**
 * No session state may put a public page into a navigation loop.
 *
 * WHAT THIS IS FOR
 *
 * The public layout's header reads the shortlist, but only when
 * `hasBrowserSession()` says there is a session to read it with. A change made
 * that guard true for a cookie holding no token. The read was then refused,
 * and `callWithBrowserSession` turns a refusal into `redirect("/auth…")`.
 *
 * Thrown from the LAYOUT, that sends every page to /auth — which renders the
 * same layout, and sends it again. Nothing clears the cookie, so it never
 * ends. Every page in the site reloaded forever.
 *
 * WHY A BROWSER, AND NOT curl
 *
 * The header is inside a Suspense boundary, so the shell has already flushed
 * when the redirect is thrown. The response is **200**; the redirect travels
 * in the RSC stream and the CLIENT router performs it. curl sees a healthy
 * page and no redirect at all. Only a browser counting its own navigations
 * sees the loop — which is why the first version of this check passed against
 * the broken build.
 *
 * Point the backend at a closed port. A page that needs the API to decide
 * whether to redirect is itself the bug.
 *
 *   KKL_ENV=review KKL_DATA_SOURCE=sample KKL_AUTH=backend KKL_PROFILES=backend \
 *   KKL_BACKEND_BASE_URL=http://127.0.0.1:1 npx next start -p 3831
 *   KKL_BASE_URL=http://127.0.0.1:3831 PLAYWRIGHT=./node_modules/playwright-core \
 *     node scripts/verify-no-session-loop.mjs
 *
 * Reads a locally served build. Signs nothing in, touches no deployed
 * environment.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT ?? "playwright");
const B = process.env.KKL_BASE_URL ?? "http://127.0.0.1:3831";
const CHROME = process.env.KKL_CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

/** Public routes that render the public layout, and so the header. */
const PAGES = ["/", "/search", "/brokers", "/auth"];

/**
 * Cookie states a visitor can arrive in.
 *
 * The one that broke was "a session with no token at all" — true to the
 * guard, useless to the API, and never cleared by anything, so each refusal
 * produced another redirect.
 */
const STATES = [
  { name: "no cookies", cookies: [] },
  { name: "a demo session", cookies: [{ name: "kkl_demo_session", value: "8971741611" }] },
  { name: "a stale refresh token", cookies: [{ name: "kkl_refresh", value: "stale" }] },
  { name: "a junk access token", cookies: [{ name: "kkl_access", value: "not-a-real-token" }] },
];

/**
 * How many main-frame navigations a healthy page may make.
 *
 * Playwright reports two per load (the commit and the document), and a page
 * may legitimately redirect once. Four is settled; more is a loop.
 */
const SETTLED = 4;

const checks = [];
const is = (n, a, e) =>
  checks.push(`${a === e ? "PASS" : "FAIL"}  ${n} — ${JSON.stringify(a)}${a === e ? "" : ` (expected ${JSON.stringify(e)})`}`);
const info = (d) => checks.push(`INFO  ${d}`);

/* -- the invariant, at the line that broke it ----------------------------- */

/*
 * `hasBrowserSession()` was the only thing in the application that could
 * report a session with neither an access nor a refresh cookie, which is the
 * exact state that loops. Pinned here because the browser check below can
 * only exercise it on a server that has the demo shortcut switched on.
 */
const guard = readFileSync(new URL("../src/lib/auth/backend.ts", import.meta.url), "utf8");
const body = guard.slice(guard.indexOf("export async function hasBrowserSession"));
const fn = body.slice(0, body.indexOf("\n}") + 2);
is(
  "hasBrowserSession reads only the two token cookies",
  /ACCESS_COOKIE/.test(fn) && /REFRESH_COOKIE/.test(fn) && !/[Dd]emo/.test(fn),
  true,
);
is(
  "and nothing else in the app reports a session without one",
  /return Boolean\(\s*jar\.get\(ACCESS_COOKIE\)\?\.value \|\| jar\.get\(REFRESH_COOKIE\)\?\.value\s*\);/.test(fn),
  true,
);

/* -- the pages, in a browser --------------------------------------------- */

const browser = await chromium.launch({ executablePath: CHROME });

for (const state of STATES) {
  const ctx = await browser.newContext();
  if (state.cookies.length > 0) {
    await ctx.addCookies(state.cookies.map((c) => ({ ...c, url: B })));
  }
  for (const path of PAGES) {
    const page = await ctx.newPage();
    const seen = [];
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) seen.push(new URL(frame.url()).pathname + new URL(frame.url()).search);
    });
    await page.goto(`${B}${path}`, { waitUntil: "domcontentloaded" });
    // Long enough for the header to suspend, resolve, and redirect if it is
    // going to. A loop keeps navigating for as long as it is watched.
    await page.waitForTimeout(4000);
    const settled = seen.length <= SETTLED;
    is(`${path} settles with ${state.name}`, settled ? "settled" : `${seen.length} navigations`, "settled");
    if (!settled) info(`  ${[...new Set(seen)].slice(0, 6).join(" -> ")}`);
    await page.close();
  }
  await ctx.close();
}

await browser.close();

const failed = checks.filter((c) => c.startsWith("FAIL"));
console.log(checks.join("\n"));
const total = checks.filter((c) => !c.startsWith("INFO")).length;
console.log(`\n${total - failed.length}/${total} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
