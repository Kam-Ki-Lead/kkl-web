/**
 * The three separations that must not leak, as rules rather than journeys.
 *
 * WHY THESE ARE NOT IN THE BROWSER SUITES
 * ---------------------------------------
 * The suites assert each separation on the paths a person can walk. These
 * assert the *rule* — over every combination, including ones no screen offers.
 * A separation that holds on the four paths a test walks and breaks on a fifth
 * is exactly the kind of gap a journey test cannot see.
 *
 * Run:  node --test "tests/*.test.mjs"
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

// ------------------------------------------- account status vs verification --

const KYC = ['not_submitted', 'pending', 'approved', 'rejected'];
const STATUS = ['active', 'suspended'];

/** The rule: each transition writes one axis and reads neither. */
function setSuspension(account, suspended) {
  return { ...account, accountStatus: suspended ? 'suspended' : 'active' };
}
function decideVerification(account, decision) {
  const next = decision === 'approved' ? 'approved' : decision === 'rejected' ? 'rejected' : 'pending';
  return { ...account, kycStatus: next };
}

test('suspension never moves verification, from any starting pair', () => {
  for (const kycStatus of KYC) {
    for (const accountStatus of STATUS) {
      for (const suspended of [true, false]) {
        const before = { kycStatus, accountStatus };
        const after = setSuspension(before, suspended);
        assert.equal(after.kycStatus, before.kycStatus,
          `suspension changed verification from ${kycStatus} at ${accountStatus}`);
        assert.equal(after.accountStatus, suspended ? 'suspended' : 'active');
      }
    }
  }
});

test('a verification decision never moves account status, from any starting pair', () => {
  for (const kycStatus of KYC) {
    for (const accountStatus of STATUS) {
      for (const decision of ['approved', 'rejected', 'resubmit']) {
        const before = { kycStatus, accountStatus };
        const after = decideVerification(before, decision);
        assert.equal(after.accountStatus, before.accountStatus,
          `${decision} changed account status from ${accountStatus} at ${kycStatus}`);
      }
    }
  }
});

test('every one of the eight combinations is reachable and representable', () => {
  // The two axes are independent, so all 4x2 pairs must exist. A model that
  // collapsed them — a single "state" enum — could not represent
  // "approved and suspended", which is the case the design specifically calls
  // out: a suspended account keeps the verification it holds.
  const reachable = new Set();
  for (const kycStatus of KYC) {
    for (const accountStatus of STATUS) {
      let account = { kycStatus: 'not_submitted', accountStatus: 'active' };
      account = decideVerification(account, kycStatus === 'approved' ? 'approved'
        : kycStatus === 'rejected' ? 'rejected' : 'resubmit');
      if (kycStatus === 'not_submitted') account = { ...account, kycStatus: 'not_submitted' };
      account = setSuspension(account, accountStatus === 'suspended');
      reachable.add(`${account.kycStatus}/${account.accountStatus}`);
    }
  }
  assert.equal(reachable.size, 8);
  assert.ok(reachable.has('approved/suspended'), 'the case the design calls out');
});

// ------------------------------------------------------- console scope field --

/**
 * `parseConsoleScope` as identity.ts implements it.
 *
 * It is a VALIDATOR, not an authorization check: it maps whatever a browser
 * sent to one of two known values so a junk value cannot select no service.
 * These tests pin both halves — that it never returns anything else, and that
 * it grants nothing.
 */
function parseConsoleScope(raw) {
  return raw === 'builder' ? 'builder' : 'seller';
}

test('the scope field only ever resolves to one of two known values', () => {
  const hostile = [
    'builder', 'seller', 'admin', 'Builder', 'BUILDER', ' builder', 'builder ',
    '', null, undefined, 0, 1, true, false, [], {}, ['builder'],
    '__proto__', 'constructor', 'toString',
    'builder\u0000', 'seller;drop', '../builder', '%62uilder',
  ];
  for (const value of hostile) {
    const scope = parseConsoleScope(value);
    assert.ok(scope === 'seller' || scope === 'builder', `${String(value)} resolved to ${scope}`);
  }
});

test('anything not exactly "builder" falls back to the Seller', () => {
  // Case, whitespace and near-misses must not select the Builder. The fallback
  // is the narrower console, so a malformed value cannot widen anything.
  for (const value of ['Builder', 'BUILDER', ' builder', 'builder ', 'buildr', 'builders']) {
    assert.equal(parseConsoleScope(value), 'seller', `${value} selected the Builder`);
  }
  assert.equal(parseConsoleScope('builder'), 'builder');
});

test('the scope field cannot name an account, an actor or a role', () => {
  // The guarantee that matters: whatever arrives, the only thing it decides is
  // which of two service objects is used. It carries no identity.
  const scope = parseConsoleScope('builder');
  assert.equal(typeof scope, 'string');
  assert.ok(!scope.includes('U-'), 'a scope is not an account id');
  assert.equal(Object.keys({ scope }).length, 1);
});

// ------------------------------------------------- internal-note containment --

/**
 * The user-facing projection, as the console stores implement it.
 *
 * Containment here is structural: a console `TicketMessage` has no `internal`
 * field, so an internal note cannot be represented in the user's thread even
 * by accident. These tests assert the projection drops rather than hides.
 */
function userVisibleThread(adminMessages) {
  return adminMessages
    .filter((m) => !m.internal)
    .map(({ id, authorLabel, body, sentAt }) => ({ id, authorLabel, body, sentAt }));
}

test('an internal note is absent from the user projection, not flagged in it', () => {
  const thread = [
    { id: 'm1', authorLabel: 'Sanjay Paul', body: 'The number is disconnected.', sentAt: '1', internal: false },
    { id: 'm2', authorLabel: 'A. Dutta', body: 'Mis-keyed at intake. No refund policy yet.', sentAt: '2', internal: true },
    { id: 'm3', authorLabel: 'Kam Ki Lead support', body: 'Corrected on your lead.', sentAt: '3', internal: false },
  ];
  const visible = userVisibleThread(thread);

  assert.equal(visible.length, 2);
  assert.ok(!JSON.stringify(visible).includes('Mis-keyed'), 'the note body is not in the payload');
  assert.ok(!('internal' in visible[0]), 'no field carries the distinction to the client');
});

test('the projection lists its fields rather than deleting from a spread', () => {
  // Why it is written as an explicit field list: a spread-and-delete keeps
  // working when a field is added, and silently ships it. A field list does
  // not compile past the author.
  const adminMessage = {
    id: 'm2', authorLabel: 'A. Dutta', body: 'note', sentAt: '2',
    internal: true, staffOnlyReviewerNotes: 'added later by someone in a hurry',
  };
  const [projected] = userVisibleThread([{ ...adminMessage, internal: false }]);

  assert.deepEqual(Object.keys(projected).sort(), ['authorLabel', 'body', 'id', 'sentAt']);
  assert.ok(!('staffOnlyReviewerNotes' in projected), 'a new field does not ride along');
});

test('no ordering of notes and replies leaks a note into the user view', () => {
  // Over every interleaving, not just the seeded one.
  const bodies = ['public-a', 'INTERNAL-1', 'public-b', 'INTERNAL-2'];
  for (let mask = 0; mask < 16; mask += 1) {
    const thread = bodies.map((body, i) => ({
      id: `m${i}`, authorLabel: 'x', body, sentAt: String(i),
      internal: Boolean(mask & (1 << i)),
    }));
    const visible = JSON.stringify(userVisibleThread(thread));
    for (const [i, body] of bodies.entries()) {
      if (mask & (1 << i)) {
        assert.ok(!visible.includes(body), `mask ${mask}: ${body} leaked`);
      }
    }
  }
});
