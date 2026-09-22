/**
 * Route sweep: every route, at desktop and mobile width.
 *
 * The sweep this replaces was run by hand and recorded as a sentence. A
 * sentence cannot be re-run, and "no console errors" is exactly the claim that
 * quietly stops being true. This drives every route in the application at
 * 1440px and 390px and asserts four things per route per width:
 *
 *   - the response is 200 (or the documented redirect for a handoff route)
 *   - no uncaught page error
 *   - no console error
 *   - no sub-resource failed to load
 *   - no horizontal overflow (scrollWidth > clientWidth + 1)
 *
 * Horizontal overflow is in the list because it is the responsive failure that
 * screenshots at a fixed width hide: the page looks right and scrolls sideways.
 *
 * Run:
 *   NEXT_PUBLIC_KKL_ENV=review NEXT_PUBLIC_KKL_DATA_SOURCE=sample npx next build
 *   KKL_ENV=review KKL_DATA_SOURCE=sample npx next start -p 3811
 *   PLAYWRIGHT=/path/to/playwright/index.mjs node scripts/verify-route-sweep.mjs
 */
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3811';

/**
 * Every route with a concrete parameter, because a sweep of `[id]` proves
 * nothing. Sample identifiers come from the seeded fixtures.
 */
const ROUTES = [
  // public portal and Buyer
  '/', '/search', '/search?q=new+town', '/property/greenview-residency',
  '/property/greenview-residency/enquiry', '/property/greenview-residency/site-visit',
  '/auth', '/find-my-match', '/find-my-match/review', '/matches',
  '/account', '/account/enquiries', '/account/enquiries/e-39884',
  '/account/shortlist', '/account/profile', '/account/notifications',
  '/builders', '/brokers', '/support', '/legal/terms', '/legal/privacy',
  '/legal/refunds', '/enquiry/unavailable?reason=expired',
  // Seller
  '/seller', '/seller/register', '/seller/onboarding', '/seller/kyc',
  '/seller/kyc/status', '/seller/restricted', '/seller/leads',
  '/seller/leads?tab=sale', '/seller/leads/L-4471', '/seller/leads/L-4471/buy',
  '/seller/purchased', '/seller/billing', '/seller/billing/recharge',
  '/seller/billing/history', '/seller/billing/invoices',
  '/seller/billing/invoices/INV-2026-0821', '/seller/billing/details',
  '/seller/billing/expiry', '/seller/support', '/seller/support/new',
  '/seller/support/T-2260', '/seller/profile',
  // Builder
  '/builder', '/builder/register', '/builder/verification', '/builder/restrictions',
  '/builder/subscription', '/builder/subscription/renewal',
  '/builder/properties', '/builder/properties/bl-greenview/basics',
  '/builder/properties/bl-greenview/location', '/builder/properties/bl-greenview/pricing',
  '/builder/properties/bl-greenview/specifications', '/builder/properties/bl-greenview/media',
  '/builder/properties/bl-greenview/preview',
  '/builder/enquiries', '/builder/enquiries/E-8801', '/builder/enquiries/notifications',
  '/builder/marketplace', '/builder/marketplace/L-4530', '/builder/marketplace/L-4530/buy',
  '/builder/leads', '/builder/billing', '/builder/billing/recharge',
  '/builder/billing/history', '/builder/billing/invoices',
  '/builder/billing/invoices/INV-2026-0903', '/builder/support',
  '/builder/support/new', '/builder/support/T-3140', '/builder/profile',
  // Admin
  '/admin/login', '/admin', '/admin/users', '/admin/users/U-10442',
  '/admin/users/U-10501', '/admin/kyc', '/admin/kyc?filter=all', '/admin/kyc/K-3318',
  '/admin/properties', '/admin/properties?filter=all', '/admin/properties/P-2204',
  '/admin/leads/intake', '/admin/leads/intake/INT-2291', '/admin/leads',
  '/admin/leads/LD-88104', '/admin/leads/LD-88066', '/admin/settings/pricing',
  '/admin/settings', '/admin/orders', '/admin/orders/ORD-10233/delivery',
  '/admin/orders/ORD-10402/delivery', '/admin/wallets',
  '/admin/wallets?account=U-10455', '/admin/wallets/U-10442/adjust',
  '/admin/refunds', '/admin/subscriptions', '/admin/support',
  '/admin/support?filter=all', '/admin/support/T-2291', '/admin/voice',
  '/admin/voice/C-7741', '/admin/voice/C-7722', '/admin/whatsapp',
  '/admin/notifications', '/admin/consent', '/admin/reports', '/admin/audit',
  '/admin/system',
];

const WIDTHS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

const browser = await chromium.launch();
const failures = [];
let checks = 0;

for (const viewport of WIDTHS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  });

  for (const route of ROUTES) {
    const problems = [];
    const page = await context.newPage();

    page.on('console', (m) => {
      if (m.type() === 'error') problems.push(`console: ${m.text()}`);
    });
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    page.on('requestfailed', (r) => {
      // Playwright reports a navigation aborted by a redirect as a failure.
      if (r.failure()?.errorText !== 'net::ERR_ABORTED') {
        problems.push(`requestfailed: ${r.url()} — ${r.failure()?.errorText}`);
      }
    });

    let status = 0;
    try {
      const response = await page.goto(`${BASE}${route}`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
      status = response?.status() ?? 0;
    } catch (error) {
      problems.push(`navigation: ${error.message}`);
    }

    if (status !== 200) problems.push(`status ${status}`);

    if (status === 200) {
      const overflow = await page.evaluate(() => {
        const d = document.documentElement;
        return d.scrollWidth - d.clientWidth;
      });
      if (overflow > 1) problems.push(`horizontal overflow by ${overflow}px`);
    }

    checks += 1;
    if (problems.length > 0) {
      failures.push({ route, viewport: viewport.name, problems });
      console.log(`FAIL  ${viewport.name.padEnd(7)} ${route}`);
      problems.forEach((p) => console.log(`        ${p}`));
    }

    await page.close();
  }

  await context.close();
}

await browser.close();

console.log(
  `\n${checks - failures.length}/${checks} route renders clean ` +
  `(${ROUTES.length} routes × ${WIDTHS.length} widths).`,
);
if (failures.length > 0) {
  console.log('\nRoutes with problems:');
  failures.forEach((f) => console.log(` - ${f.route} @ ${f.viewport}`));
  process.exit(1);
}
