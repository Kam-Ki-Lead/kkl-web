import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  correctionSummary, needsHumanReview, presentAnswers,
} from '../src/lib/domain/answer-corrections.ts';

/**
 * A corrected answer and a contradicted one are the same shape on a list and
 * opposite in meaning. One is somebody tidying up after themselves; the other
 * is a conflict nobody has resolved, and only the second is a staff member's
 * problem. These tests exist to stop the screen flattening them back together.
 */

const answer = (over = {}) => ({
  id: `a-${Math.random().toString(16).slice(2)}`,
  questionKey: 'q04_city',
  status: 'answered',
  value: { optionId: 'q04_hooghly' },
  superseded: false,
  supersededReason: null,
  recordedAt: '2026-10-07T00:00:00.000Z',
  ...over,
});

describe('presenting corrected answers', { concurrency: false }, () => {
  test('a current answer reads as current', () => {
    const [shown] = presentAnswers([answer()]);
    assert.equal(shown.state, 'current');
    assert.equal(shown.tone, 'success');
    assert.equal(shown.needsHumanReview, false);
    assert.equal(shown.note, null);
  });

  test('a corrected answer is named a correction, not just superseded', () => {
    const [shown] = presentAnswers([answer({
      status: 'superseded', superseded: true, supersededReason: 'explicit_correction',
      value: { optionId: 'q04_kolkata' } })]);
    assert.equal(shown.state, 'corrected');
    assert.equal(shown.needsHumanReview, false);
    assert.match(shown.note, /replaced this answer later/);
    assert.match(shown.note, /only the current answer is used/);
    // The old value is still shown. It is evidence of what was said.
    assert.equal(shown.value, 'q04_kolkata');
  });

  test('a contradiction is flagged for a person, and a correction is not', () => {
    const contradicted = presentAnswers([answer({ status: 'contradictory' })]);
    assert.equal(contradicted[0].state, 'contradictory — needs review');
    assert.equal(contradicted[0].tone, 'danger');
    assert.equal(contradicted[0].needsHumanReview, true);
    assert.match(contradicted[0].note, /nobody has said which is meant/);

    const corrected = presentAnswers([answer({
      status: 'superseded', superseded: true, supersededReason: 'explicit_correction' })]);
    assert.equal(corrected[0].needsHumanReview, false);
  });

  test('an answer invalidated by a correction says so in its own words', () => {
    const [shown] = presentAnswers([answer({
      questionKey: 'q09a_budget_detail', status: 'superseded', superseded: true,
      supersededReason: 'dependent_answer_invalidated' })]);
    assert.equal(shown.state, 'invalidated by a correction');
    assert.match(shown.note, /depended on one that was corrected/);
    assert.match(shown.note, /asked again/);
  });

  test('an unusable answer is distinguished from a declined one', () => {
    assert.equal(presentAnswers([answer({ status: 'unclear' })])[0].state, 'not usable');
    assert.equal(presentAnswers([answer({ status: 'skipped' })])[0].state, 'declined');
    assert.equal(presentAnswers([answer({ status: 'unclear' })])[0].needsHumanReview, false);
  });

  test('a status the backend adds later degrades to not usable, not a crash', () => {
    const [shown] = presentAnswers([answer({ status: 'some_future_status' })]);
    assert.equal(shown.state, 'current');
    assert.equal(shown.value, 'some future status');
  });

  test('a superseded answer with no reason still reads as replaced', () => {
    const [shown] = presentAnswers([answer({
      status: 'superseded', superseded: true, supersededReason: null })]);
    assert.equal(shown.state, 'corrected');
    assert.match(shown.note, /Replaced by a later answer/);
  });

  test('values are rendered readably, including Other and multi-select', () => {
    assert.equal(presentAnswers([answer({ value: { optionId: 'q04_kolkata' } })])[0].value,
      'q04_kolkata');
    assert.equal(presentAnswers([answer({
      value: { optionId: 'other', otherText: 'Siliguri' } })])[0].value,
    'other — "Siliguri"');
    assert.equal(presentAnswers([answer({
      value: { optionIds: ['q20_site_visit', 'q20_connect_on_whatsapp'] } })])[0].value,
    'q20_site_visit, q20_connect_on_whatsapp');
    assert.equal(presentAnswers([answer({ value: 'Ritu Sengupta' })])[0].value, 'Ritu Sengupta');
    assert.equal(presentAnswers([answer({ value: null })])[0].value, '—');
  });

  test('a run needs review only when something is genuinely unresolved', () => {
    assert.equal(needsHumanReview([answer(), answer({
      status: 'superseded', superseded: true, supersededReason: 'explicit_correction' })]), false);
    assert.equal(needsHumanReview([answer({ status: 'contradictory' })]), true);
  });

  test('the correction summary answers "did they change anything?" in one line', () => {
    assert.equal(correctionSummary([answer()]), null);
    const summary = correctionSummary([
      answer({ status: 'superseded', superseded: true, supersededReason: 'explicit_correction' }),
      answer({ questionKey: 'q09_budget_range', status: 'superseded', superseded: true,
        supersededReason: 'explicit_correction' }),
      answer(),
    ]);
    assert.match(summary, /2 answers corrected/);
    assert.match(summary, /q04_city, q09_budget_range/);
    assert.match(summary, /original wording is kept/);
  });

  test('a dependent invalidation is not counted as the buyer correcting something', () => {
    const summary = correctionSummary([
      answer({ status: 'superseded', superseded: true,
        supersededReason: 'dependent_answer_invalidated' }),
    ]);
    assert.equal(summary, null, 'the buyer changed one thing, not two');
  });
});
