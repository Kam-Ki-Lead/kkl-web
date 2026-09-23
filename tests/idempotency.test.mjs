/**
 * Idempotency keys reused with DIFFERENT inputs.
 *
 * WHY THIS IS NOT IN THE BROWSER SUITES
 * -------------------------------------
 * They assert the safe case: the same key replayed with the same inputs
 * returns the first outcome rather than charging twice. The dangerous case is
 * the same key with *different* inputs — a retried request whose body changed,
 * or a client reusing a key by mistake. Driving that through a browser means
 * forging a form post; here it is four lines.
 *
 * The question a real implementation has to answer: does a key bind to the
 * REQUEST or to the OUTCOME? Binding to the outcome alone means a second
 * request with the same key but a different amount silently returns the first
 * amount's result — the caller believes their ₹5,000 recharge succeeded when
 * ₹100 was credited.
 *
 * Run:  node --test "tests/*.test.mjs"
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

/** How the sample stores behave today: key -> outcome, inputs not recorded. */
function outcomeOnlyStore() {
  const seen = new Map();
  return {
    recharge({ key, amountInr }) {
      const replayed = seen.get(key);
      if (replayed) return { ...replayed, duplicate: true };
      const outcome = { kind: 'credited', amountInr, reference: `PAY-${seen.size + 1}` };
      seen.set(key, outcome);
      return { ...outcome, duplicate: false };
    },
  };
}

/** What a real implementation needs: the key binds to the request it settled. */
function requestBoundStore() {
  const seen = new Map();
  return {
    recharge({ key, amountInr }) {
      const record = seen.get(key);
      if (record) {
        if (record.amountInr !== amountInr) {
          return { kind: 'key_reused_with_different_input', settledAmountInr: record.amountInr };
        }
        return { ...record.outcome, duplicate: true };
      }
      const outcome = { kind: 'credited', amountInr, reference: `PAY-${seen.size + 1}` };
      seen.set(key, { amountInr, outcome });
      return { ...outcome, duplicate: false };
    },
  };
}

test('replaying a key with the SAME input returns the first outcome, not a second charge', () => {
  const store = outcomeOnlyStore();
  const first = store.recharge({ key: 'k1', amountInr: 2_000 });
  const second = store.recharge({ key: 'k1', amountInr: 2_000 });

  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(second.reference, first.reference, 'one payment, not two');
});

test('the sample store returns the FIRST amount when a key is reused with a different one', () => {
  // This is the current behaviour, asserted so the limitation is visible rather
  // than discovered. It is safe against double-charging and wrong about what it
  // tells the caller.
  const store = outcomeOnlyStore();
  store.recharge({ key: 'k1', amountInr: 100 });
  const second = store.recharge({ key: 'k1', amountInr: 5_000 });

  assert.equal(second.kind, 'credited');
  assert.equal(second.amountInr, 100, 'the caller asked for 5,000 and is told about 100');
  assert.equal(second.duplicate, true);
});

test('binding the key to the request surfaces the mismatch instead of hiding it', () => {
  // What kkl-backend must do. Recorded here as the required behaviour, not as
  // something this repository implements.
  const store = requestBoundStore();
  store.recharge({ key: 'k1', amountInr: 100 });
  const second = store.recharge({ key: 'k1', amountInr: 5_000 });

  assert.equal(second.kind, 'key_reused_with_different_input');
  assert.equal(second.settledAmountInr, 100);
});

test('a purchase key reused for a different lead must not release the wrong lead', () => {
  // The same shape, with a worse consequence: contact details, not an amount.
  const store = (() => {
    const seen = new Map();
    return {
      buy({ key, leadId }) {
        const record = seen.get(key);
        if (record) {
          if (record.leadId !== leadId) return { kind: 'key_reused_with_different_input' };
          return { kind: 'purchased', leadId: record.leadId, duplicate: true };
        }
        seen.set(key, { leadId });
        return { kind: 'purchased', leadId, duplicate: false };
      },
    };
  })();

  store.buy({ key: 'k1', leadId: 'L-4471' });
  const wrong = store.buy({ key: 'k1', leadId: 'L-4468' });

  assert.equal(wrong.kind, 'key_reused_with_different_input');
  assert.notEqual(wrong.leadId, 'L-4468', 'releasing L-4468 on a key that settled L-4471 is a leak');
});

test('a fresh key per submission is what makes a retried POST safe', () => {
  // Why the actions mint a key per visit rather than per session: two genuine
  // purchases must not collide, while one purchase retried must.
  const store = outcomeOnlyStore();
  const a = store.recharge({ key: 'visit-a', amountInr: 1_000 });
  const b = store.recharge({ key: 'visit-b', amountInr: 1_000 });
  const aRetried = store.recharge({ key: 'visit-a', amountInr: 1_000 });

  assert.notEqual(a.reference, b.reference, 'two visits, two payments');
  assert.equal(aRetried.reference, a.reference, 'one visit retried, one payment');
});
