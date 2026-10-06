/**
 * Deployment configuration failures, as a truth table.
 *
 * WHY THIS IS NOT IN THE SHELL SCRIPT
 * -----------------------------------
 * `verify-sample-mode-guard.sh` builds and serves the application for each of
 * eight scenarios, which takes minutes and covers the combinations somebody
 * thought of. The guard's decision is a pure function of its inputs, so the
 * whole space is 4 x 2 x 5 x 3 = 120 combinations and can be checked in
 * milliseconds. The shell script proves the guard is *wired in*; this proves it
 * is *right*.
 *
 * `staging-guard.test.mjs` beside this one runs the real module in a child
 * process. Prefer adding a rule there: a mirror can drift, and this one has
 * no way to notice. What the mirror is still for is the exhaustive table.
 *
 * Run:  node --experimental-strip-types --test "tests/*.test.mjs"
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * The rule, as src/proxy.ts and src/lib/config/runtime.ts implement it.
 *
 * Mirrored rather than imported because the modules are TypeScript behind the
 * `@/` alias and one of them throws at module load by design. If the two ever
 * disagree the shell script catches it, because that one runs the real thing.
 */
function guard({
  builtEnv, builtSource, serverEnv, serverSource,
  // The two that only matter once a deployment is publicly reachable. They
  // default to the configuration a staging deployment must have, so the
  // exhaustive table below varies the four values it is about.
  auth = 'backend',
  backendOrigin = 'https://kkl-backend-staging.up.railway.app',
  devSecrets = [],
}) {
  // 1. A served build must say what it is. Missing declarations first, because
  //    "nobody configured this" must be a visible failure rather than a
  //    silent fallback to whatever the bundle happens to contain.
  const missing = [];
  if (serverEnv === undefined) missing.push('KKL_ENV');
  if (serverSource === undefined) missing.push('KKL_DATA_SOURCE');
  if (missing.length > 0) return { serve: false, reason: `missing:${missing.join('+')}` };

  // 2. The bundle and the server must agree. NEXT_PUBLIC_* is frozen at build
  //    time, so a mismatch means this is not the bundle this environment asked
  //    for — the exact accident that let a review build serve production.
  if (builtEnv !== serverEnv) return { serve: false, reason: 'env_mismatch' };
  if (builtSource !== serverSource) return { serve: false, reason: 'source_mismatch' };

  // 3. Production must never run sample services.
  if (serverEnv === 'production' && serverSource === 'sample') {
    return { serve: false, reason: 'production_with_sample' };
  }

  // 4. A publicly reachable deployment running sample services must still have
  //    a real session, because the sample sign-in step accepts any six digits.
  //    Staging gets this rule instead of rule 3: refusing `sample` outright
  //    would make staging impossible, since the platform-wide `api` client does
  //    not exist.
  if (PUBLIC.has(serverEnv) && serverSource === 'sample') {
    if (auth !== 'backend') return { serve: false, reason: 'public_sample_without_real_auth' };
    if (!backendOrigin) return { serve: false, reason: 'public_auth_without_origin' };
  }

  // 5. And it must not carry the development identity issuer's secret.
  if (PUBLIC.has(serverEnv) && devSecrets.length > 0) {
    return { serve: false, reason: 'public_with_dev_secret' };
  }

  return { serve: true, reason: 'ok' };
}

const ENVS = ['development', 'review', 'staging', 'production'];
const SOURCES = ['sample', 'api'];
const PUBLIC = new Set(['staging', 'production']);

test('the documented local review configuration serves', () => {
  const result = guard({
    builtEnv: 'review', builtSource: 'sample',
    serverEnv: 'review', serverSource: 'sample',
  });
  assert.equal(result.serve, true);
});

test('production with sample services never serves, however it is reached', () => {
  // The combination the guard exists for. Checked across every build/server
  // pairing that could produce it, not just the obvious one.
  for (const builtEnv of ENVS) {
    for (const builtSource of SOURCES) {
      const result = guard({
        builtEnv, builtSource,
        serverEnv: 'production', serverSource: 'sample',
      });
      assert.equal(result.serve, false,
        `served with builtEnv=${builtEnv} builtSource=${builtSource}`);
    }
  }
});

test('a served build that declares nothing is refused', () => {
  for (const builtEnv of ENVS) {
    for (const builtSource of SOURCES) {
      assert.equal(guard({ builtEnv, builtSource }).serve, false);
      assert.equal(guard({ builtEnv, builtSource, serverEnv: 'review' }).serve, false);
      assert.equal(guard({ builtEnv, builtSource, serverSource: 'sample' }).serve, false);
    }
  }
});

test('the missing-declaration message names which one is missing', () => {
  assert.match(guard({ builtEnv: 'review', builtSource: 'sample' }).reason, /KKL_ENV\+KKL_DATA_SOURCE/);
  assert.match(
    guard({ builtEnv: 'review', builtSource: 'sample', serverEnv: 'review' }).reason,
    /missing:KKL_DATA_SOURCE/,
  );
  assert.match(
    guard({ builtEnv: 'review', builtSource: 'sample', serverSource: 'sample' }).reason,
    /missing:KKL_ENV/,
  );
});

test('every bundle/server disagreement is refused', () => {
  for (const builtEnv of ENVS) {
    for (const serverEnv of ENVS) {
      for (const builtSource of SOURCES) {
        for (const serverSource of SOURCES) {
          const result = guard({ builtEnv, builtSource, serverEnv, serverSource });
          if (builtEnv !== serverEnv || builtSource !== serverSource) {
            assert.equal(result.serve, false,
              `${builtEnv}/${builtSource} served as ${serverEnv}/${serverSource}`);
          }
        }
      }
    }
  }
});

test('a publicly reachable sample deployment needs a real session', () => {
  for (const serverEnv of ENVS) {
    const result = guard({
      builtEnv: serverEnv, builtSource: 'sample',
      serverEnv, serverSource: 'sample',
      // `null`, not `undefined`: a default parameter treats undefined as absent
      // and would hand this test the very value it is trying to remove.
      auth: null,
    });
    if (PUBLIC.has(serverEnv)) {
      assert.equal(result.serve, false, `${serverEnv} served the sample sign-in step publicly`);
    } else {
      assert.equal(result.serve, true, `${serverEnv} is private and keeps the prototype step`);
    }
  }
});

test('a development identity secret is refused wherever the public can reach it', () => {
  for (const serverEnv of ENVS) {
    for (const serverSource of SOURCES) {
      if (serverEnv === 'production' && serverSource === 'sample') continue;
      const result = guard({
        builtEnv: serverEnv, builtSource: serverSource,
        serverEnv, serverSource,
        devSecrets: ['KKL_DEV_AUTH_SECRET'],
      });
      assert.equal(result.serve, !PUBLIC.has(serverEnv), `${serverEnv}/${serverSource}`);
    }
  }
});

test('the whole 120-combination space has exactly the serving cases expected', () => {
  const serving = [];
  for (const builtEnv of ENVS) {
    for (const builtSource of SOURCES) {
      for (const serverEnv of [...ENVS, undefined]) {
        for (const serverSource of [...SOURCES, undefined]) {
          if (guard({ builtEnv, builtSource, serverEnv, serverSource }).serve) {
            serving.push(`${builtEnv}/${builtSource}`);
          }
        }
      }
    }
  }
  // Only matched pairs serve, and production+sample is excluded from them.
  // Only matched pairs serve. production+sample is excluded; staging+sample is
  // not, because staging's rule is a real session rather than a real data
  // source — and with `auth` at its default here, that rule is satisfied.
  assert.deepEqual(serving.sort(), [
    'development/api',
    'development/sample',
    'production/api',
    'review/api',
    'review/sample',
    'staging/api',
    'staging/sample',
  ]);
  assert.ok(!serving.includes('production/sample'), 'the one that must never serve');
});

test('the guard cannot tell where it is running, and does not pretend to', () => {
  // The honest position, pinned as a test. Two deployments differing only in
  // where they physically run are indistinguishable to this function — which
  // is why it requires the deployment to declare itself, and why a
  // KKL_ENV=review deployment serving real users is an operational risk rather
  // than a detectable one.
  const onALaptop = guard({ builtEnv: 'review', builtSource: 'sample', serverEnv: 'review', serverSource: 'sample' });
  const onAProductionHost = guard({ builtEnv: 'review', builtSource: 'sample', serverEnv: 'review', serverSource: 'sample' });
  assert.deepEqual(onALaptop, onAProductionHost);
  assert.equal(onAProductionHost.serve, true, 'not a defect — a stated residual risk');
});
