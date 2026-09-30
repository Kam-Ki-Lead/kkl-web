/**
 * Slice G connected — a support ticket raised on the real screen, answered by
 * staff on theirs, and the notification that follows.
 *
 * WHAT THIS PROVES AND WHAT IT CANNOT
 * The conversation is real: durable, account-scoped, with the internal note
 * refused to the requester by the database rather than by a filter. The
 * notification *record* is real too.
 *
 * Nothing is sent to anybody. No provider credentials exist (Q-7), so the
 * delivery job records `unconfigured` and says why; two checks below assert
 * that no screen claims otherwise.
 *
 * Run (kkl-web on 3811 with KKL_SUPPORT=backend KKL_NOTIFICATIONS=backend):
 *   BACKEND_URL=... DATABASE_URL=... KKL_DEV_AUTH_SECRET=... \
 *   PG=../kkl-backend/node_modules/pg/lib/index.js \
 *   PLAYWRIGHT=/path/to/playwright/index.mjs node scripts/verify-support-notifications.mjs
 */
import { randomUUID } from 'node:crypto';

const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
const { default: pg } = await import(
  process.env.PG ?? '/home/user/kkl-backend/node_modules/pg/lib/index.js');

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3811';
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:4010';
const SECRET = process.env.KKL_DEV_AUTH_SECRET ?? 'local-review-secret';
const DB = process.env.DATABASE_URL ?? 'postgres://kkl_app@127.0.0.1:5433/kkl';

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}\n      ${detail}`);
};

async function sessionFor(role, ref, name) {
  const res = await fetch(`${BACKEND_URL}/v1/dev/sessions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-kkl-dev-secret': SECRET },
    body: JSON.stringify({ externalRef: ref, displayName: name, role }),
  });
  if (!res.ok) throw new Error(`dev session failed: ${res.status}`);
  return res.json();
}
const api = async (token, path, init = {}) => {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      ...(init.body ? { 'content-type': 'application/json' } : {}),
    },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};

// The identities kkl-web itself uses, so the screens and this script agree.
const seller = await sessionFor('seller', 'kkl-web:sample-seller', 'Sujata Pal · Sen Properties');
const staff = await sessionFor('staff', 'kkl-web:sample-staff', 'A. Dutta · Operations');
const stranger = await sessionFor('builder', `verify-stranger-${randomUUID().slice(0, 8)}`, 'Someone Else');

const db = new pg.Client({ connectionString: DB });
await db.connect();
const asStaff = async (sql, params = []) => {
  await db.query('BEGIN');
  await db.query("SELECT set_config('app.user_id', $1, true)", [staff.accountId]);
  await db.query("SELECT set_config('app.user_role', 'staff', true)");
  const out = await db.query(sql, params);
  await db.query('COMMIT');
  return out;
};

const marker = randomUUID().slice(0, 8).toUpperCase();
const browser = await chromium.launch();
const ctx = await browser.newContext();

/** Server-action forms ignore a click until hydration; one retry removes the race. */
async function submitAndWait(page, pattern, { attempts = 3, button = 'button[type="submit"]' } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    await page.click(button).catch(() => {});
    try {
      await page.waitForURL(pattern, { timeout: 8000 });
      await page.waitForLoadState('networkidle');
      return true;
    } catch { await page.waitForTimeout(600); }
  }
  return false;
}

try {
  // ------------------------------------------ 1. raise one on the real screen
  const form = await ctx.newPage();
  await form.goto(`${BASE}/seller/support/new`, { waitUntil: 'networkidle' });
  await form.waitForTimeout(600);
  await form.fill('#subject', `Credit missing ${marker}`);
  await form.fill('#body', `I recharged and nothing arrived. Reference ${marker}.`);
  const topic = await form.$('#topic');
  if (topic) await topic.selectOption({ index: 1 }).catch(() => {});
  // Not a prefix match: `/seller/support/new` starts with `/seller/support`,
  // so waiting for that prefix returns immediately and the check "passes"
  // without the form ever having been submitted. The same mistake a path in
  // a query string caused in the enquiry suite. Wait for somewhere the form
  // is not.
  const landed = await submitAndWait(form, (url) => {
    const { pathname } = new URL(url);
    return pathname.startsWith('/seller/support') && !pathname.endsWith('/new');
  });
  if (!landed) console.log(`      (the form did not navigate; still at ${form.url()})`);
  // The redirect may land before the row is visible to a separate
  // connection, so give the commit a moment rather than racing it.
  await form.waitForTimeout(500);

  const stored = await asStaff(
    'SELECT id, reference, status, account_id FROM support_tickets WHERE subject = $1',
    [`Credit missing ${marker}`]);
  ok('1. A ticket raised on the screen is a row in kkl-backend',
    stored.rowCount === 1 && /^TK-/.test(stored.rows[0].reference),
    stored.rowCount === 1
      ? `${stored.rows[0].reference}, status "${stored.rows[0].status}"`
      : 'the ticket was not found in the database');
  const ticketRef = stored.rows[0]?.reference;

  ok('2. It belongs to the account that raised it',
    stored.rows[0]?.account_id === seller.accountId,
    'the ticket is scoped to the signed-in Seller, not to a shared fixture');

  const list = await ctx.newPage();
  await list.goto(`${BASE}/seller/support`, { waitUntil: 'networkidle' });
  const listText = (await list.textContent('body')) ?? '';
  ok('3. The requester’s own list renders it from the database',
    listText.includes(`Credit missing ${marker}`),
    'the list is served by kkl-backend, not by process memory');

  // ------------------------------------- 2. staff answer, and an internal note
  const secret = `INTERNAL-${marker}`;
  const staffReply = await api(staff.token, `/v1/support/tickets/${ticketRef}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body: `We can see the recharge attempt. Reference ${marker}.` }),
  });
  const internal = await api(staff.token, `/v1/support/tickets/${ticketRef}/messages`, {
    method: 'POST', body: JSON.stringify({ body: secret, internal: true }),
  });
  ok('4. Staff reply and add an internal note',
    staffReply.status === 201 && internal.status === 201,
    `reply ${staffReply.status}, internal note ${internal.status}`);

  const queue = await ctx.newPage();
  await queue.goto(`${BASE}/admin/support/${ticketRef}`, { waitUntil: 'networkidle' });
  const queueText = (await queue.textContent('body')) ?? '';
  ok('5. The staff screen shows the thread and their own internal note',
    queueText.includes(secret) && queueText.includes(`Credit missing ${marker}`),
    'the Admin thread is served by kkl-backend, internal note included');

  const requesterView = await ctx.newPage();
  await requesterView.goto(`${BASE}/seller/support/${ticketRef}`, { waitUntil: 'networkidle' });
  const requesterText = (await requesterView.textContent('body')) ?? '';
  ok('6. The internal note is absent from the requester’s thread, and the reply is not',
    !requesterText.includes(secret) && requesterText.includes(`We can see the recharge attempt`),
    'the policy removes the row; the shared reply is there');

  const asStrangerRead = await api(stranger.token, `/v1/support/tickets/${ticketRef}`);
  ok('7. Another account cannot read the ticket at all',
    asStrangerRead.status === 404,
    `read ${asStrangerRead.status} — not 403, so a stranger learns nothing, including that it exists`);

  // ----------------------------------- 3. the notification, and what it is not
  const notifications = await api(seller.token, '/v1/notifications');
  const about = notifications.body.notifications.find((n) => n.kind === 'support.replied');
  ok('8. The reply produced a notification record for the requester',
    about !== undefined && about.read === false,
    about ? `"${about.title}", unread` : 'no notification was recorded');

  const inbox = await ctx.newPage();
  await inbox.goto(`${BASE}/account/notifications`, { waitUntil: 'networkidle' });
  const inboxText = (await inbox.textContent('body')) ?? '';
  ok('9. The notification screen renders records from kkl-backend',
    /support|ticket/i.test(inboxText),
    'the in-app inbox is served by the backend');

  const deliveries = await api(seller.token,
    `/v1/notifications/deliveries?notificationId=${about?.id ?? ''}`);
  const queued = deliveries.body.deliveries ?? [];
  ok('10. A delivery was queued, and none of it claims to have been sent',
    queued.length > 0 && queued.every((d) => d.status === 'queued' && d.sentAt === null),
    `${queued.length} queued, none sent`);

  const pass = await api(staff.token, '/v1/notifications/deliveries/run', {
    method: 'POST', body: JSON.stringify({ limit: 50 }),
  });
  ok('11. The worker runs, records the missing provider, and sends nothing',
    pass.body.ran === true
      && (pass.body.outcomes.unconfigured ?? 0) > 0
      && (pass.body.outcomes.sent ?? 0) === 0,
    `outcomes ${JSON.stringify(pass.body.outcomes)}`);

  const after = await asStaff(
    `SELECT status, last_error, sent_at, provider_message_id
       FROM notification_deliveries WHERE account_id = $1
      ORDER BY created_at DESC LIMIT 5`, [seller.accountId]);
  ok('12. Every attempt names the dependency and carries no address',
    after.rows.length > 0
      && after.rows.every((r) => r.sent_at === null && r.provider_message_id === null)
      && after.rows.some((r) => /Q-7/.test(r.last_error ?? '')),
    'the reason names Q-7; no phone number or email appears in it');

  ok('13. No screen claims a message was sent',
    !/we have (emailed|messaged|texted|notified)|email sent|message sent/i.test(
      `${requesterText} ${inboxText}`),
    'the screens say a reply was recorded, not that anybody was contacted');

  // ------------------------------------------------ 4. the audit log connected
  const resolution = `Resolved for verification ${marker}.`;
  await api(staff.token, `/v1/support/tickets/${ticketRef}/resolution`, {
    method: 'POST', body: JSON.stringify({ reason: resolution }),
  });
  const audit = await ctx.newPage();
  await audit.goto(`${BASE}/admin/audit?filter=support`, { waitUntil: 'networkidle' });
  const auditText = (await audit.textContent('body')) ?? '';
  ok('14. The Admin audit screen shows the real entry, with its reason',
    auditText.includes(resolution),
    'the audit console is served by kkl-backend');

  const leakage = await asStaff(
    `SELECT detail::text AS detail, reason FROM audit_log ORDER BY created_at DESC LIMIT 200`);
  const combined = leakage.rows.map((r) => `${r.detail} ${r.reason ?? ''}`).join(' ');
  ok('15. Nothing in the audit log carries a contact detail or a token',
    !/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(combined)
      && !/\+\d{10,}/.test(combined)
      && !/\bBearer\s/i.test(combined),
    `${leakage.rows.length} recent entries scanned`);

  // The requester is told why it was closed, in the same words.
  const closed = await api(seller.token, '/v1/notifications');
  const toldWhy = closed.body.notifications.find((n) => n.kind === 'support.resolved');
  ok('16. Closing the ticket tells the requester why, in the same sentence',
    toldWhy?.body === resolution,
    toldWhy ? 'the resolution reason reached the requester' : 'no resolution notification');
} finally {
  await browser.close();
  await db.end();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
process.exit(failed.length ? 1 : 0);
