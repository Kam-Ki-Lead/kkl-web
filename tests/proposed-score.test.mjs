import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROPOSED_SCORE_CAVEAT, mayPriceFromProposedScore, presentProposedScore,
} from '../src/lib/domain/proposed-score.ts';

/**
 * A proposed level on a screen reads as a fact unless the screen says
 * otherwise. These tests are the thing stopping it.
 */

const level = (n, satisfied, why, extra = {}) =>
  ({ level: n, factor: `Factor ${n}`, satisfied, why, ...extra });

const score = (over = {}) => ({
  policyVersion: 'proposed-v1', basis: 'proposed_interpretation', approved: false,
  proposedLevel: 6, unscoredReason: null, stoppedAtLevel: 7, satisfiedAboveGap: [8],
  affordability: { verdict: 'stretch', basis: 'proposed_default' },
  levels: [
    ...[1, 2, 3, 4, 5, 6].map((n) => level(n, true, 'every required question answered')),
    level(7, false, 'not answered: q09_budget_range'),
    level(8, true, 'every required question answered'),
    level(9, false, 'not answered: q13_site_visit_window'),
    level(10, false, 'no contact method requested'),
  ],
  ...over,
});

describe('presenting a proposed score', { concurrency: false }, () => {
  test('the headline never shows a bare number', () => {
    assert.equal(presentProposedScore(score()).headline, 'Proposed level 6 of 10');
    assert.match(presentProposedScore(score()).headline, /^Proposed/);
  });

  test('the caveat is always attached', () => {
    const shown = presentProposedScore(score());
    assert.equal(shown.caveat, PROPOSED_SCORE_CAVEAT);
    assert.match(shown.caveat, /not approved by the client/);
    assert.match(shown.caveat, /does not set a price/);
  });

  test('an unscored run says so rather than showing zero', () => {
    const shown = presentProposedScore(score({
      proposedLevel: null, unscoredReason: 'level 1 not satisfied: not answered: q01_full_name',
      stoppedAtLevel: 1 }));
    assert.equal(shown.headline, 'Not yet scored');
    assert.equal(shown.reachedLabel, 'No level reached');
    assert.match(shown.stopReason, /q01_full_name/);
  });

  test('the gap is explained, not just the number', () => {
    const shown = presentProposedScore(score());
    assert.match(shown.stopReason, /Stopped at level 7/);
    assert.match(shown.stopReason, /q09_budget_range/);
  });

  test('levels met above the gap are shown as such', () => {
    const shown = presentProposedScore(score());
    assert.match(shown.aboveGapNote, /level 8/);
    assert.match(shown.aboveGapNote, /cumulatively/);
    assert.equal(shown.rows.find((r) => r.level === 8).state, 'above the gap');
    assert.equal(shown.rows.find((r) => r.level === 6).state, 'met');
    assert.equal(shown.rows.find((r) => r.level === 7).state, 'not met');
  });

  test('an affordability verdict never appears without its basis', () => {
    const shown = presentProposedScore(score());
    assert.match(shown.affordabilityNote, /unapproved default/);
    assert.match(shown.affordabilityNote, /not a lending assessment/);
    assert.equal(presentProposedScore(score({ affordability: null })).affordabilityNote, null);
  });

  test('every level is listed with its reason', () => {
    const shown = presentProposedScore(score());
    assert.equal(shown.rows.length, 10);
    assert.ok(shown.rows.every((r) => r.why.length > 0));
  });

  test('no score presents as nothing, not as level zero', () => {
    assert.equal(presentProposedScore(null), null);
  });

  test('a proposed score may never price anything', () => {
    assert.equal(mayPriceFromProposedScore(score()), false);
    assert.equal(mayPriceFromProposedScore(score({ proposedLevel: 10 })), false);
    assert.equal(mayPriceFromProposedScore(null), false);
  });
});
