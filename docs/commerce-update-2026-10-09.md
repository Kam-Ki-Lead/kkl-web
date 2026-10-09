# Lead marketplace update — 9 October 2026

Status: work in progress; not deployed or accepted.

## Owner instructions
Lead-first site wording and Buy Leads CTA. Purchase Order System for area/type requests in Seller and Admin. Demand-based lead pricing. Small-credit expiry after 30 days and a paid ₹500 extension. Unsold sale tiers: 7–13 days 90% off, 14–20 days 80% off, 21+ days 50% off. Owner explicitly confirmed that reverse discount ladder and age starting at first availability.

## Delegated defaults
Owner answered “You decide please” for demand and “You decide this also” for wallet details.
- Demand: seller/builder searches, once per account/area/UTC day, trailing 7 days; 2% per 10 events, capped 20%. Staff and anonymous traffic excluded.
- Small recharge: at most 500 credits; 30-day validity, historical balances grandfathered. Earliest expiry spent first. Notices 7 and 1 days beforehand.
- Extension: ₹500, 30 extra days, explicit payment confirmation required; no automatic charge. Razorpay test checkout and signed captured callback implemented; simulated tests passed. Provider sandbox verification remains.
- Round final price upwards to a whole credit once, after demand and age modifiers. Unknown prices remain unknown. No completed order rewritten.

## Existing purchase-request system
Reuses /seller/requests/new and /admin/requests, including durable backend records, owner isolation and Admin replies. A request does not debit money or create a paid order.

## Verification
Owner started the isolated database on 55439. Migrations 032–035 applied to kkl_test. Backend wallet/order tests 21/21; new policy/database tests 5/5; price-boundary tests 3/3; matrix-reprice test 1/1. Frontend quote/origin tests 13/13 and TypeScript pass. No Railway database was touched.

The legacy full migration verifier applied the migrations to a scratch database, then failed on an old hardcoded probe role dependency. It is not claimed as passed.

## Deployment
Backend must deploy migrations before the frontend. Extension checkout requires Razorpay test credentials and KKL_ALLOW_TEST_PAYMENTS=yes; it does not accept live keys. No provider call, browser payment or public staging acceptance is claimed. Notification records and queued email are distinct from provider delivery.

Final local checks: frontend TypeScript and targeted ESLint passed; production build blocked by Google Fonts downloads. No full browser verification claimed. Test checkout uses injected provider responses only. Backend migrations precede frontend deployment.

Build retry after network permission: compilation succeeded; Next build then stopped at its TypeScript subprocess with Windows spawn EPERM. Standalone TypeScript passed. Full build and browser acceptance remain unverified locally.
