import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEMO_MOBILE,
  demoSignInIsAllowed,
  isDemoMobile,
} from '../src/lib/auth/demo-access.ts';

/**
 * The review sign-in shortcut, and the gate around it.
 *
 * This is an authentication bypass. The tests that matter are the ones proving
 * it cannot be reached: a server reading the real backend, a server doing real
 * sign-in, and a server declaring itself production must each refuse it on
 * their own, without relying on the other two.
 */

const REVIEW_ON_SAMPLE = { sampleData: true, authBackend: false, production: false };

describe('the review sign-in shortcut', { concurrency: false }, () => {
  test('is allowed on a review server showing sample fixtures', () => {
    assert.equal(demoSignInIsAllowed(REVIEW_ON_SAMPLE), true);
  });

  test('is refused when sign-in is switched to the real backend', () => {
    assert.equal(
      demoSignInIsAllowed({ ...REVIEW_ON_SAMPLE, authBackend: true }),
      false,
      'a server doing real sign-in offers no bypass',
    );
  });

  test('is refused on a server declaring itself production', () => {
    assert.equal(demoSignInIsAllowed({ ...REVIEW_ON_SAMPLE, production: true }), false);
  });

  test('is refused when the data is real, whatever else is set', () => {
    assert.equal(demoSignInIsAllowed({ ...REVIEW_ON_SAMPLE, sampleData: false }), false);
  });

  test('every condition has to hold, so no two of them can cover a third', () => {
    // All eight combinations, stated rather than reasoned about.
    const allowed = [];
    for (const sampleData of [true, false]) {
      for (const authBackend of [true, false]) {
        for (const production of [true, false]) {
          if (demoSignInIsAllowed({ sampleData, authBackend, production })) {
            allowed.push(`${sampleData}/${authBackend}/${production}`);
          }
        }
      }
    }
    assert.deepEqual(allowed, ['true/false/false'], 'exactly one combination may sign in');
  });

  test('the number is matched however it is typed, and nothing else is', () => {
    for (const typed of ['8971741611', '+91 89717 41611', '91-8971741611', '89717 41611']) {
      assert.equal(isDemoMobile(typed), true, typed);
    }
    for (const other of ['8971741612', '897174161', '9971741611', '', '1234567890']) {
      assert.equal(isDemoMobile(other), false, other);
    }
  });

  test('the number is the one that was asked for', () => {
    assert.equal(DEMO_MOBILE, '8971741611');
  });
});
