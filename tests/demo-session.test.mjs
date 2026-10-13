import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEMO_ACCOUNTS,
  DEMO_MOBILE,
  DEMO_SIGNIN_ENV,
  accountForRole,
  demoAccountFor,
  demoSignInIsAllowed,
  readDemoRole,
  readDemoSignInOptIn,
} from '../src/lib/auth/demo-access.ts';

/**
 * The review sign-in shortcut, and the gate around it.
 *
 * This is an authentication bypass, so the gate is the part that is tested,
 * exhaustively rather than by example: the table below walks all sixteen
 * combinations of the four inputs and names every one that may sign in. A new
 * condition, or a changed operator, moves a row and fails here.
 */

const SAMPLE_REVIEW = {
  sampleData: true,
  authBackend: false,
  production: false,
  optIn: false,
};

/** Staging: real sign-in through kkl-backend, sample content, opted in. */
const STAGING_OPTED_IN = {
  sampleData: true,
  authBackend: true,
  production: false,
  optIn: true,
};

describe('the review sign-in shortcut', { concurrency: false }, () => {
  test('production refuses it, whatever else is set', () => {
    for (const sampleData of [true, false]) {
      for (const authBackend of [true, false]) {
        for (const optIn of [true, false]) {
          assert.equal(
            demoSignInIsAllowed({ sampleData, authBackend, production: true, optIn }),
            false,
            `production must refuse sample=${sampleData} authBackend=${authBackend} optIn=${optIn}`,
          );
        }
      }
    }
  });

  test('exactly these configurations may sign in, and no others', () => {
    const allowed = [];
    for (const sampleData of [true, false]) {
      for (const authBackend of [true, false]) {
        for (const production of [true, false]) {
          for (const optIn of [true, false]) {
            if (demoSignInIsAllowed({ sampleData, authBackend, production, optIn })) {
              allowed.push(
                `sample=${sampleData} authBackend=${authBackend} production=${production} optIn=${optIn}`,
              );
            }
          }
        }
      }
    }
    assert.deepEqual(allowed.sort(), [
      // Opted in, below production — staging, and anything configured like it.
      'sample=false authBackend=false production=false optIn=true',
      'sample=false authBackend=true production=false optIn=true',
      // A sample build not doing real sign-in: nothing to bypass either way.
      'sample=true authBackend=false production=false optIn=false',
      'sample=true authBackend=false production=false optIn=true',
      'sample=true authBackend=true production=false optIn=true',
    ]);
  });

  test('a sample build that is not doing real sign-in has it without asking', () => {
    assert.equal(demoSignInIsAllowed(SAMPLE_REVIEW), true);
  });

  test('a server doing real sign-in does NOT have it unless it opted in', () => {
    assert.equal(
      demoSignInIsAllowed({ ...SAMPLE_REVIEW, authBackend: true }),
      false,
      'this is the case that sent staging to the real OTP path',
    );
    assert.equal(demoSignInIsAllowed(STAGING_OPTED_IN), true, 'and this is the fix');
  });

  test('a server reading real data does NOT have it unless it opted in', () => {
    assert.equal(demoSignInIsAllowed({ ...SAMPLE_REVIEW, sampleData: false }), false);
  });

  test('the opt-in is read from the environment, not inlined into the bundle', () => {
    assert.equal(DEMO_SIGNIN_ENV, 'KKL_DEMO_SIGNIN');
    assert.equal(DEMO_SIGNIN_ENV.startsWith('NEXT_PUBLIC_'), false);
  });

  test('only an explicit affirmative turns it on', () => {
    for (const on of ['on', 'ON', '1', 'true', 'TRUE', 'yes', ' on ']) {
      assert.equal(readDemoSignInOptIn(on), true, JSON.stringify(on));
    }
    // Everything a dashboard stores when somebody meant to remove the variable.
    for (const off of [undefined, '', '  ', '0', 'false', 'off', 'no', 'disabled']) {
      assert.equal(readDemoSignInOptIn(off), false, JSON.stringify(off));
    }
  });

  test('a number is matched however it is typed, and nothing else is', () => {
    for (const typed of ['8971741611', '+91 89717 41611', '91-8971741611', '89717 41611']) {
      assert.equal(demoAccountFor(typed)?.role, 'buyer', typed);
    }
    for (const other of ['8971741612', '897174161', '9971741611', '', '1234567890']) {
      assert.equal(demoAccountFor(other), null, other);
    }
  });

  test('the number asked for first still works, and signs in as the Buyer', () => {
    assert.equal(DEMO_MOBILE, '8971741611');
    assert.equal(demoAccountFor(DEMO_MOBILE)?.role, 'buyer');
  });

  test('there is one account per console, and each has its own number', () => {
    assert.deepEqual(
      DEMO_ACCOUNTS.map((a) => a.role),
      ['buyer', 'seller', 'builder', 'admin'],
    );
    const numbers = DEMO_ACCOUNTS.flatMap((a) => [a.mobile, ...(a.also ?? [])]);
    assert.equal(new Set(numbers).size, numbers.length, 'two accounts share a number');
    for (const account of DEMO_ACCOUNTS) {
      for (const number of [account.mobile, ...(account.also ?? [])]) {
        assert.match(number, /^[6-9]\d{9}$/, account.role);
        assert.equal(demoAccountFor(number)?.role, account.role, number);
      }
    }
    // The Buyer screens are rendered from this fixture, so its own number
    // reaches the Buyer too, even though the page shows the asked-for one.
    assert.equal(demoAccountFor('9830041288')?.role, 'buyer');
  });

  test('each account lands on its own console, never on somebody else\'s', () => {
    // The bug this pins: every account landed on one place. A Builder sent to
    // the Buyer's /account is in the wrong room, and the first attempt sent
    // all four to /account — which then bounced to a blank /auth?next=%2Faccount.
    assert.deepEqual(
      DEMO_ACCOUNTS.map((a) => a.landing),
      ['/account', '/seller', '/builder', '/admin'],
    );
    for (const account of DEMO_ACCOUNTS) {
      assert.equal(accountForRole(account.role).landing, account.landing);
      assert.match(account.landing, /^\/[a-z]/, 'a landing must be a path on this site');
    }
  });

  test('the landing comes from the table, never from the request', () => {
    // A bypass whose destination is a form field is a redirect anybody can
    // aim. `readDemoRole` is the only way in, and it only knows four words.
    for (const role of ['buyer', 'seller', 'builder', 'admin']) {
      assert.equal(readDemoRole(role), role);
    }
    for (const junk of [undefined, '', 'staff', 'BUYER', '/admin', 'https://example.com', '../admin']) {
      assert.equal(readDemoRole(junk), null, JSON.stringify(junk));
    }
  });
});
