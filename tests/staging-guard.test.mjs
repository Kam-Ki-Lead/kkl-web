/**
 * The staging rules, against the real module.
 *
 * `deployment-guard.test.mjs` beside this one mirrors the rule as a pure
 * function, for the 72-combination truth table. That is useful and it is also
 * the thing a mirror cannot do: prove the shipped code behaves this way. So
 * these tests run `src/lib/config/runtime.ts` itself, in a child process with
 * a prepared environment, because the module decides some of this at load
 * (NEXT_PUBLIC_* is substituted at build time, which a single process cannot
 * re-do) and throws by design.
 *
 * Run:  node --experimental-strip-types --test "tests/*.test.mjs"
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Loads the guard with exactly this environment and reports what it decided.
 *
 * The child inherits nothing: a KKL_ variable left in the parent's
 * environment by whoever ran the suite would otherwise decide the test.
 */
function guardDecision(env) {
  const script = `
    import('./src/lib/config/runtime.ts')
      .then((m) => {
        try { m.assertDeploymentSafe(); process.stdout.write('SERVE'); }
        catch (error) { process.stdout.write('REFUSE ' + error.message); }
      })
      .catch((error) => process.stdout.write('REFUSE_AT_LOAD ' + error.message));
  `;
  const out = execFileSync(
    process.execPath,
    ['--experimental-strip-types', '--no-warnings', '--input-type=module', '-e', script],
    { cwd: repoRoot, env: { PATH: process.env.PATH, ...env }, encoding: 'utf8' },
  );
  return out.startsWith('SERVE')
    ? { serve: true, message: '' }
    : { serve: false, message: out };
}

/** A staging deployment that satisfies every rule, for one-at-a-time breaking. */
const WORKING_STAGING = {
  NODE_ENV: 'production',
  NEXT_PUBLIC_KKL_ENV: 'staging',
  NEXT_PUBLIC_KKL_DATA_SOURCE: 'sample',
  KKL_ENV: 'staging',
  KKL_DATA_SOURCE: 'sample',
  KKL_AUTH: 'backend',
  KKL_BACKEND_BASE_URL: 'https://kkl-backend-staging.up.railway.app',
};

describe('a public staging deployment', { concurrency: false }, () => {
  test('serves with a real session and a backend origin', () => {
    const result = guardDecision(WORKING_STAGING);
    assert.equal(result.serve, true, result.message);
  });

  test('refuses the sample sign-in step, which lets anyone in', () => {
    // The reason staging cannot simply reuse the review configuration. With
    // KKL_AUTH unset the sign-in step accepts any six digits by design, which
    // on a private review host is a reviewer clicking through screens and on
    // a public URL is an open door to every dashboard.
    const result = guardDecision({ ...WORKING_STAGING, KKL_AUTH: undefined });
    assert.equal(result.serve, false);
    assert.match(result.message, /KKL_AUTH is not "backend"/);
    assert.match(result.message, /any six digits/);
  });

  test('refuses a backend switch with no backend to talk to', () => {
    const result = guardDecision({ ...WORKING_STAGING, KKL_BACKEND_BASE_URL: undefined });
    assert.equal(result.serve, false);
    assert.match(result.message, /requires KKL_BACKEND_BASE_URL/);
  });

  test('accepts the lead-request origin as the backend origin', () => {
    const result = guardDecision({
      ...WORKING_STAGING,
      KKL_BACKEND_BASE_URL: undefined,
      KKL_LEAD_REQUESTS_BASE_URL: 'https://kkl-backend-staging.up.railway.app',
    });
    assert.equal(result.serve, true, result.message);
  });

  test('refuses a development identity secret, by any of its names', () => {
    for (const name of [
      'KKL_DEV_AUTH_SECRET',
      'KKL_BACKEND_DEV_SECRET',
      'KKL_LEAD_REQUESTS_DEV_SECRET',
    ]) {
      const result = guardDecision({ ...WORKING_STAGING, [name]: 'shhh' });
      assert.equal(result.serve, false, name);
      assert.match(result.message, new RegExp(name));
      assert.match(result.message, /invents an account for a name/);
    }
  });
});

describe('the rules staging does not change', { concurrency: false }, () => {
  test('production with sample services still never serves', () => {
    const result = guardDecision({
      ...WORKING_STAGING,
      NEXT_PUBLIC_KKL_ENV: 'production',
      KKL_ENV: 'production',
    });
    assert.equal(result.serve, false);
    // Refused at module load, before any request: the build itself is the
    // combination that must not exist.
    assert.match(result.message, /production.*sample|sample.*production/s);
  });

  test('a bundle built for review deployed as staging still does not serve', () => {
    const result = guardDecision({
      ...WORKING_STAGING,
      NEXT_PUBLIC_KKL_ENV: 'review',
    });
    assert.equal(result.serve, false);
    assert.match(result.message, /built with NEXT_PUBLIC_KKL_ENV=review but deployed with KKL_ENV=staging/);
  });

  test('a served build with no declarations still does not serve', () => {
    const result = guardDecision({
      NODE_ENV: 'production',
      NEXT_PUBLIC_KKL_ENV: 'staging',
      NEXT_PUBLIC_KKL_DATA_SOURCE: 'sample',
    });
    assert.equal(result.serve, false);
    assert.match(result.message, /KKL_ENV and KKL_DATA_SOURCE are not set/);
  });

  test('a review deployment keeps the sample sign-in step', () => {
    // Not an oversight: review runs where only the reviewer can reach it, and
    // the approved prototype's sign-in step is part of what is being reviewed.
    const result = guardDecision({
      NODE_ENV: 'production',
      NEXT_PUBLIC_KKL_ENV: 'review',
      NEXT_PUBLIC_KKL_DATA_SOURCE: 'sample',
      KKL_ENV: 'review',
      KKL_DATA_SOURCE: 'sample',
    });
    assert.equal(result.serve, true, result.message);
  });

  test('an unknown environment name is refused at load', () => {
    const result = guardDecision({
      NODE_ENV: 'production',
      NEXT_PUBLIC_KKL_ENV: 'stage',
      NEXT_PUBLIC_KKL_DATA_SOURCE: 'sample',
      KKL_ENV: 'stage',
      KKL_DATA_SOURCE: 'sample',
    });
    assert.equal(result.serve, false);
    assert.match(result.message, /"development", "review", "staging" or "production"/);
  });
});
