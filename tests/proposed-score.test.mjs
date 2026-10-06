import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROPOSED_SCORE_CAVEAT, isSuppressed, mayPriceFromProposedScore, mayReleaseContact,
  presentProposedScore,
} from '../src/lib/domain/proposed-score.ts';

/**
 * A proposed assessment on a screen reads as a fact unless the screen says
 * otherwise. These tests are the thing stopping it.
 *
 * The v1 version of this file tested one number. That number mixed
 * "we have every answer" with "this person wants to buy", so the tests below
 * exist mostly to prove the screen keeps the two apart.
 */

const completenessLevel = (n, satisfied, why) =>
  ({ level: n, factor: `Factor ${n}`, axis: 'completeness', satisfied, why });

const score = (over = {}) => ({
  policyVersion: 'proposed-v2',
  basis: 'proposed_interpretation',
  approved: false,
  optOut: { optedOut: false, enforcement: 'independent_of_scoring' },
  completeness: {
    axis: 'information_completeness',
    level: 6,
    ceiling: 6,
    stoppedAtLevel: null,
    levels: [1, 2, 3, 4, 5, 6].map((n) =>
      completenessLevel(n, true, 'every required question answered')),
  },
  readiness: {
    verdict: 'low',
    signals: { timeline: 'exploring', siteVisit: 'not asked for' },
    reasons: ['timeline is "Just Exploring"', 'no site visit requested'],
    isALevel: false,
    note: 'Reported separately from completeness.',
  },
  financialFit: {
    verdict: 'undetermined',
    reason: 'no client-approved affordability rule',
    inputsKnown: { budget: true, income: true, loanRequirement: true },
    requiresApproval: 'An affordability rule the client documents.',
    neverTreatedAsUnsuitable: ['cash purchase', 'savings', 'family funding', 'unknown income'],
    inactiveProposal: null,
  },
  proposedLevel: 6,
  levelCeiling: 6,
  blockedBy: ['Level 7 "Financial Capacity + Fit" needs an affordability rule the client approves.'],
  unscoredReason: null,
  commercialEffect: {
    pricing: 'none', contactRelease: 'none', eligibility: 'none',
    why: 'A proposed assessment has no commercial effect until the client approves a policy.',
  },
  caveat: 'Proposed by policy proposed-v2.',
  ...over,
});

describe('presenting a proposed assessment', { concurrency: false }, () => {
  test('the headline names completeness, not qualification', () => {
    const shown = presentProposedScore(score());
    assert.equal(shown.headline, 'Proposed completeness level 6 of 6');
    assert.match(shown.headline, /completeness/);
    assert.doesNotMatch(shown.headline, /of 10/);
  });

  test('the caveat is always attached', () => {
    const shown = presentProposedScore(score());
    assert.equal(shown.caveat, PROPOSED_SCORE_CAVEAT);
    assert.match(shown.caveat, /not approved by the client/);
    assert.match(shown.caveat, /does not set a price/);
  });

  test('three axes are presented separately', () => {
    const shown = presentProposedScore(score());
    assert.equal(shown.axes.length, 3);
    assert.deepEqual(shown.axes.map((a) => a.label),
      ['Information completeness', 'Buyer readiness', 'Financial fit']);
  });

  // The whole point of v2. A complete questionnaire from somebody who is just
  // looking must not read as a strong lead anywhere on the screen.
  test('a complete questionnaire with low intent shows complete AND not ready', () => {
    const shown = presentProposedScore(score());
    const [complete, ready] = shown.axes;
    assert.equal(complete.value, 'Level 6 of 6');
    assert.equal(ready.value, 'Low');
    assert.match(ready.detail, /Just Exploring/);
  });

  test('readiness is never shown as a level', () => {
    for (const verdict of ['strong', 'moderate', 'low', 'undetermined']) {
      const shown = presentProposedScore(score({
        readiness: { ...score().readiness, verdict } }));
      const ready = shown.axes[1];
      assert.doesNotMatch(ready.value, /[0-9]/, `${verdict} must not read as a number`);
    }
  });

  test('financial fit always reads undetermined, and never unsuitable', () => {
    const shown = presentProposedScore(score());
    assert.equal(shown.axes[2].value, 'Undetermined');
    assert.match(shown.axes[2].detail, /Never treated as unsuitable/);
    assert.match(shown.axes[2].detail, /cash purchase/);
  });

  test('the level ceiling is explained rather than left as a low number', () => {
    const shown = presentProposedScore(score());
    assert.match(shown.ceilingNote, /affordability rule the client approves/);
  });

  test('an unassessed run says so rather than showing zero', () => {
    const shown = presentProposedScore(score({
      completeness: { ...score().completeness, level: null, stoppedAtLevel: 1,
        levels: [completenessLevel(1, false, 'not answered: q01_full_name')] },
      proposedLevel: null,
      unscoredReason: 'level 1 not satisfied: not answered: q01_full_name',
    }));
    assert.equal(shown.headline, 'Not yet assessed');
    assert.equal(shown.axes[0].value, 'None reached');
    assert.match(shown.stopReason, /q01_full_name/);
  });

  test('the gap is explained, not just the number', () => {
    const shown = presentProposedScore(score({
      completeness: { ...score().completeness, level: 2, stoppedAtLevel: 3,
        levels: [
          completenessLevel(1, true, 'every required question answered'),
          completenessLevel(2, true, 'every required question answered'),
          completenessLevel(3, false, 'not answered: q06_purchase_purpose'),
        ] },
      proposedLevel: 2,
    }));
    assert.match(shown.stopReason, /Stopped at level 3/);
    assert.match(shown.stopReason, /q06_purchase_purpose/);
  });

  const suppressedScore = (over = {}) => score({
    optOut: { optedOut: true, enforcement: 'independent_of_scoring' },
    commercialEffect: { ...score().commercialEffect,
      why: 'This person has opted out. No contact and no sale, whatever the assessment says.' },
    ...over,
  });

  test('opt-out is shown, and shown as independent of the assessment', () => {
    assert.equal(presentProposedScore(score()).optOutNotice, null);
    const shown = presentProposedScore(suppressedScore());
    assert.match(shown.optOutNotice, /opted out/);
    assert.match(shown.commercialNote, /No contact and no sale/);
  });

  // Asked for explicitly: a suppressed profile must read as do-not-contact
  // whatever its readiness says.
  test('a suppressed profile carries a structured suppression block', () => {
    assert.equal(presentProposedScore(score()).suppression, null);
    const shown = presentProposedScore(suppressedScore());
    assert.equal(shown.suppression.suppressed, true);
    assert.equal(shown.suppression.chip, 'DO NOT CONTACT');
    assert.match(shown.suppression.banner, /opted out/);
    assert.match(shown.suppression.banner, /Do not call, message/);
    assert.match(shown.suppression.instruction, /not something this screen can authorise/);
  });

  test('strong readiness does not soften the suppression — it is named in it', () => {
    const shown = presentProposedScore(suppressedScore({
      readiness: { ...score().readiness, verdict: 'strong', reasons: [] },
    }));
    assert.equal(shown.suppression.chip, 'DO NOT CONTACT');
    assert.match(shown.suppression.appliesDespite, /readiness reads Strong/);
    assert.match(shown.suppression.appliesDespite, /does not lift the suppression/);
    // And the readiness axis still reports honestly rather than being blanked.
    assert.equal(shown.axes[1].value, 'Strong');
  });

  test('suppression holds across every readiness verdict and completeness level', () => {
    for (const verdict of ['strong', 'moderate', 'low', 'undetermined']) {
      for (const level of [null, 1, 6]) {
        const shown = presentProposedScore(suppressedScore({
          readiness: { ...score().readiness, verdict },
          completeness: { ...score().completeness, level },
          proposedLevel: level,
        }));
        assert.equal(shown.suppression.chip, 'DO NOT CONTACT', `${verdict}/${level}`);
        assert.ok(shown.optOutNotice, `${verdict}/${level}`);
      }
    }
  });

  test('the single-line notice never disagrees with the block', () => {
    const shown = presentProposedScore(suppressedScore());
    assert.ok(shown.optOutNotice.startsWith(shown.suppression.banner));
    assert.ok(shown.optOutNotice.includes(shown.suppression.appliesDespite));
  });

  test('suppression is read from the opt-out state, never from the assessment', () => {
    assert.equal(isSuppressed(suppressedScore()), true);
    assert.equal(isSuppressed(score()), false);
    assert.equal(isSuppressed(score({
      readiness: { ...score().readiness, verdict: 'strong' } })), false);
    assert.equal(isSuppressed(null), false);
  });

  test('all ten factors are listed, with the four this policy does not assess', () => {
    const shown = presentProposedScore(score());
    assert.equal(shown.rows.length, 10);
    assert.ok(shown.rows.every((r) => r.why.length > 0));
    for (const n of [7, 8, 9, 10]) {
      assert.equal(shown.rows.find((r) => r.level === n).state, 'not assessed', `level ${n}`);
    }
    assert.equal(shown.rows.find((r) => r.level === 6).state, 'met');
  });

  test('each row says which axis it measures', () => {
    const shown = presentProposedScore(score());
    assert.equal(shown.rows.find((r) => r.level === 3).axis, 'completeness');
    assert.equal(shown.rows.find((r) => r.level === 7).axis, 'financial_fit');
    assert.equal(shown.rows.find((r) => r.level === 9).axis, 'readiness');
  });

  test('the inactive 60x proposal, when shown at all, is shown as switched off', () => {
    assert.equal(presentProposedScore(score()).inactiveProposalNote, null);
    const shown = presentProposedScore(score({
      financialFit: { ...score().financialFit,
        inactiveProposal: { active: false, affectsOutcome: false, opinion: 'above' } },
    }));
    assert.match(shown.inactiveProposalNote, /switched off/);
    assert.match(shown.inactiveProposalNote, /affects nothing/);
  });

  test('no assessment presents as nothing, not as level zero', () => {
    assert.equal(presentProposedScore(null), null);
  });

  test('a proposed assessment may never price anything or release a contact', () => {
    assert.equal(mayPriceFromProposedScore(score()), false);
    assert.equal(mayPriceFromProposedScore(score({ proposedLevel: 10 })), false);
    assert.equal(mayPriceFromProposedScore(null), false);
    assert.equal(mayReleaseContact(score()), false);
    assert.equal(mayReleaseContact(score({
      readiness: { ...score().readiness, verdict: 'strong' } })), false);
  });
});
