/**
 * Where the three checkouts and Playwright are, resolved rather than assumed.
 *
 * Four verification scripts had a Windows developer's absolute paths baked in
 * as defaults — `C:/Users/<name>/AppData/.../playwright` for the browser, and
 * `C:/Users/<name>/Downloads/...` for the three repository roots whose git
 * revisions `verify-phase5.mjs` records in its evidence file. `revision()`
 * swallows a failure and returns "unreadable", so on any other machine the
 * Phase 5 browser evidence recorded three "unreadable" revisions: a
 * verification record that did not know which code it had tested.
 *
 * Everything here resolves from this file's own location, with an environment
 * variable for a layout that is not side by side. Nothing names a person's
 * home directory.
 */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** This repository. scripts/ sits directly under it. */
export const WEB_ROOT = process.env.KKL_WEB_ROOT
  ? resolve(process.env.KKL_WEB_ROOT)
  : resolve(here, '..');

/** kkl-backend and kkl-voice, checked out beside kkl-web. */
export const BACKEND_ROOT = process.env.KKL_BACKEND_ROOT
  ? resolve(process.env.KKL_BACKEND_ROOT)
  : resolve(WEB_ROOT, '../kkl-backend');
export const VOICE_ROOT = process.env.KKL_VOICE_ROOT
  ? resolve(process.env.KKL_VOICE_ROOT)
  : resolve(WEB_ROOT, '../kkl-voice');

/**
 * The short revision of a checkout, and why it could not be read when it
 * could not — "no checkout at <path>" and "git rev-parse failed" are
 * different problems, and an evidence file that calls both "unreadable"
 * hides which one happened.
 */
export function revision(root) {
  if (!existsSync(join(root, '.git'))) return `no checkout at ${root}`;
  try {
    return execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf8' }).trim();
  } catch (error) {
    return `git rev-parse failed in ${root}: ${error.message.split('\n')[0]}`;
  }
}

/** All three, for an evidence block. */
export function revisions() {
  return {
    web: revision(WEB_ROOT),
    backend: revision(BACKEND_ROOT),
    voice: revision(VOICE_ROOT),
  };
}

/**
 * Playwright.
 *
 * PLAYWRIGHT may name a directory (a checkout of the package) or a module
 * specifier. With neither, the normal resolution from this repository is
 * used, which is what a machine with Playwright installed already has.
 */
export function loadPlaywright() {
  const require = createRequire(import.meta.url);
  const spec = process.env.PLAYWRIGHT;
  if (!spec) return require('playwright');
  const trimmed = spec.replace(/[\\/]+$/, '');
  const looksLikePath = /^[a-zA-Z]:[\\/]/.test(trimmed) || trimmed.startsWith('/')
    || trimmed.startsWith('.');
  return looksLikePath ? require(join(trimmed, 'index.js')) : require(trimmed);
}
