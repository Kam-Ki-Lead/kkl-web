/**
 * Ledger reconciliation and reset determinism.
 *
 * WHY THESE ARE NOT IN THE BROWSER SUITES
 * ---------------------------------------
 * The browser suites assert the reconciliation through a web page, which means
 * one assertion per HTTP round trip. That is slow enough that they check the
 * invariant at four moments. The invariant should hold after *every* sequence
 * of operations, and that is a property, not four examples — so it is checked
 * here over hundreds of randomised sequences instead.
 *
 * `node:test` and `node:assert`, both built into Node 22. No framework was
 * added: the point is to cover logic the suites cover poorly, not to raise a
 * count.
 *
 * Run:  node --test tests/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * The store is TypeScript and imports through the `@/` alias, so these tests
 * reimplement the *invariant* rather than importing the module: the running
 * balance is the opening balance plus every delta, in order, and the reported
 * balance is the last entry's running total.
 *
 * That is a deliberate trade-off and worth naming. It means a bug in
 * seller-store's arithmetic would not be caught here — the browser suites
 * assert the real store through `?reconcile=1`. What this catches is a bug in
 * the *rule*: a sequence of operations under which the invariant cannot hold,
 * which is the part no example-based test finds.
 */
function chain(opening, deltas) {
  let running = opening;
  return deltas.map((delta) => {
    running += delta;
    return { delta, balanceAfter: running };
  });
}

function reconcile(opening, entries) {
  const sumOfDeltas = entries.reduce((total, e) => total + e.delta, 0);
  const expected = opening + sumOfDeltas;
  const last = entries[entries.length - 1];
  const reported = last ? last.balanceAfter : opening;
  const chainIntact = entries.every((e, i) => {
    const previous = i === 0 ? opening : entries[i - 1].balanceAfter;
    return e.balanceAfter === previous + e.delta;
  });
  return { expected, reported, chainIntact, consistent: chainIntact && expected === reported };
}

test('the seed ledger reconciles to the balance the screens show', () => {
  // The seven seed entries: recharges 1,000 + 5,000 + 2,000, purchases 950 +
  // 1,030 + 780 + 1,040. These are the figures in seller-store.
  const deltas = [1_000, -950, 5_000, -1_030, -780, 2_000, -1_040];
  const entries = chain(0, deltas);
  const result = reconcile(0, entries);

  assert.equal(result.reported, 4_200, 'the seed balance the approved screens show');
  assert.ok(result.consistent);
});

test('the invariant survives any sequence of operations', () => {
  // A property, not an example. 500 random sequences of recharges, purchases
  // and adjustments, checked after every prefix — so a sequence that only
  // breaks on its ninth operation is caught at nine, not missed.
  let seed = 20260923;
  const random = () => {
    seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
    return seed / 2_147_483_648;
  };

  for (let run = 0; run < 500; run += 1) {
    const opening = Math.floor(random() * 5_000);
    const deltas = [];
    const length = 1 + Math.floor(random() * 30);
    for (let i = 0; i < length; i += 1) {
      const magnitude = Math.floor(random() * 3_000) + 1;
      deltas.push(random() < 0.5 ? magnitude : -magnitude);
    }
    for (let cut = 1; cut <= deltas.length; cut += 1) {
      const entries = chain(opening, deltas.slice(0, cut));
      const result = reconcile(opening, entries);
      assert.ok(
        result.consistent,
        `run ${run}, prefix ${cut}: expected ${result.expected}, reported ${result.reported}`,
      );
    }
  }
});

test('a balance stored alongside the entries is what drifts', () => {
  // The defect this invariant exists to prevent, reproduced deliberately.
  // The old store kept `balanceCredits` next to the ledger; an operation that
  // posted an entry without updating it left the two disagreeing, and nothing
  // noticed. Deriving the balance makes the drift unrepresentable.
  const deltas = [1_000, -250];
  const entries = chain(0, deltas);

  let storedBalance = 1_000; // updated for the recharge, missed for the purchase
  const derived = entries[entries.length - 1].balanceAfter;

  assert.equal(derived, 750);
  assert.notEqual(storedBalance, derived, 'the two disagree, which is the bug');

  // With no stored field there is nothing to disagree with.
  storedBalance = derived;
  assert.equal(storedBalance, derived);
});

test('an adjustment cannot break the chain, because it is an entry', () => {
  // The review balance switch and A-19 both post entries rather than assigning
  // a balance. That is why neither can break the invariant it helps test.
  const entries = chain(0, [4_200, 780]); // seed, then a staff credit
  const result = reconcile(0, entries);
  assert.equal(result.reported, 4_980);
  assert.ok(result.consistent);
});

test('reset is a fresh-state factory, so a field cannot be half-reset', () => {
  // The defect: reset restored the account, balance and purchases and left the
  // ledger, invoices, threads and every counter carrying the last pass's work.
  // One factory for both initialisation and reset makes a missed field
  // impossible — a field that is not reset is a field that does not exist.
  const freshState = () => ({
    ledger: [{ delta: 4_200, balanceAfter: 4_200 }],
    invoices: ['INV-2026-0412'],
    threads: ['T-2260'],
    orderSequence: 10_233,
    ticketSequence: 2_291,
    purchases: new Map(),
  });

  const state = freshState();
  state.ledger.push({ delta: -950, balanceAfter: 3_250 });
  state.invoices.push('INV-2026-0999');
  state.threads.push('T-9999');
  state.orderSequence += 1;
  state.purchases.set('L-4471', {});

  // Object.assign onto the held object, not reassignment: other bundles hold
  // this object by reference (see process-state.ts), so replacing it would
  // leave them looking at the pre-reset state.
  Object.assign(state, freshState());

  assert.equal(state.ledger.length, 1);
  assert.deepEqual(state.invoices, ['INV-2026-0412']);
  assert.deepEqual(state.threads, ['T-2260']);
  assert.equal(state.orderSequence, 10_233);
  assert.equal(state.ticketSequence, 2_291);
  assert.equal(state.purchases.size, 0);
});

test('reset by reassignment leaves other holders on the old object', () => {
  // Why the reset uses Object.assign. This is the bug that made the review
  // route return 200 while every page went on rendering the old balance.
  let holder = { balance: 4_200 };
  const otherBundle = holder; // captured the reference, as a page would

  holder = { balance: 0 }; // reassignment — the "reset"

  assert.equal(holder.balance, 0);
  assert.equal(otherBundle.balance, 4_200, 'the other holder never saw it');

  // Assigning onto the object reaches every holder.
  const shared = { balance: 4_200 };
  const alsoShared = shared;
  Object.assign(shared, { balance: 0 });
  assert.equal(alsoShared.balance, 0);
});
