import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEMO_LANDING,
  DEMO_MOBILE,
  DEMO_SIGNIN_ENV,
  demoSignInIsAllowed,
  isDemoMobile,
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

  test('it lands on the public site, not on an account screen', () => {
    // /account reads from kkl-backend as the account. A demo session has no
    // token, so that read is refused and redirects back to sign-in — which is
    // what happened: the shortcut appeared to do nothing and landed on a
    // blank bounce at /auth?next=%2Faccount.
    assert.equal(DEMO_LANDING, '/');
    assert.equal(DEMO_LANDING.startsWith('/account'), false);
    assert.equal(DEMO_LANDING.startsWith('/seller'), false);
  });
});
