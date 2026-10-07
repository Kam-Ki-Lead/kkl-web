import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  REASON_MAX,
  STALE_SCREEN_MESSAGE,
  describeAnswerValue,
  hasUnresolved,
  replacementOptions,
  replacementValue,
  resolutionNotice,
  takesFreeText,
  validateResolution,
} from '../src/lib/domain/contradiction-resolution.ts';
import {
  describeSelection,
  matchStateLabel,
  refreshNotice,
  stalenessNotice,
} from '../src/lib/domain/recommendation-refresh.ts';
import {
  readContradictionView,
  readRefreshResult,
  readResolutionResult,
  readQualificationRun,
} from '../src/lib/services/backend/qualification-reading.ts';

/**
 * A run held for review used to be a dead end. These tests cover the screen's
 * half of settling one — and the three things a refresh must keep apart:
 * what we would offer today, what the buyer picked, and what somebody asked
 * to see.
 *
 * The rules checked here are deliberately the same rules the backend applies.
 * A form that passes validation and then comes back 422 has lost what
 * somebody typed, which is the failure these exist to prevent.
 */

const CITY_QUESTION = {
  key: 'q04_city',
  prompt: 'Which city are you looking to buy in?',
  required: true,
  answerSchema: {
    type: 'single_choice',
    options: [
      { id: 'q04_kolkata', label: 'Kolkata' },
      { id: 'q04_hooghly', label: 'Hooghly' },
      { id: 'q04_howrah', label: 'Howrah' },
    ],
  },
};

const CONFLICT = {
  questionKey: 'q04_city',
  question: CITY_QUESTION,
  answers: [
    {
      answerId: 'ans-1',
      value: { optionId: 'q04_kolkata' },
      rawText: 'Kolkata',
      source: 'whatsapp_inbound',
      recordedAt: '2026-10-07T09:00:00.000Z',
    },
    {
      answerId: 'ans-2',
      value: { optionId: 'q04_hooghly' },
      rawText: 'Actually Hooghly',
      source: 'whatsapp_inbound',
      recordedAt: '2026-10-07T09:01:00.000Z',
    },
  ],
};

describe('settling a contradiction', { concurrency: false }, () => {
  test('an option id is read back as the label the client wrote', () => {
    assert.equal(describeAnswerValue(CITY_QUESTION, { optionId: 'q04_hooghly' }), 'Hooghly');
    assert.equal(
      describeAnswerValue(CITY_QUESTION, { optionId: 'q04_other', otherText: 'Chandannagar' }),
      'q04_other — “Chandannagar”',
      'an id with no label still shows, rather than disappearing',
    );
    assert.equal(describeAnswerValue(null, 'Ritu Sengupta'), 'Ritu Sengupta');
    assert.equal(describeAnswerValue(null, null), '—');
  });

  test('a multi-select reads as its labels, not its ids', () => {
    const question = {
      ...CITY_QUESTION,
      answerSchema: {
        type: 'multi_choice',
        options: [
          { id: 'q20_site_visit', label: 'Site Visit' },
          { id: 'q20_loan', label: 'Loan Assistance' },
        ],
      },
    };
    assert.equal(
      describeAnswerValue(question, { optionIds: ['q20_site_visit', 'q20_loan'] }),
      'Site Visit, Loan Assistance',
    );
  });

  test('a question with options is not offered as a text box', () => {
    assert.equal(takesFreeText(CITY_QUESTION), false);
    assert.equal(replacementOptions(CITY_QUESTION).length, 3);
    assert.equal(takesFreeText({ ...CITY_QUESTION, answerSchema: { type: 'text' } }), true);
    assert.equal(takesFreeText(null), true, 'with no schema, assume the safer shape');
  });

  test('a replacement is wrapped the way the question wants it', () => {
    assert.deepEqual(replacementValue(CITY_QUESTION, ' q04_howrah '), { optionId: 'q04_howrah' });
    assert.equal(replacementValue({ ...CITY_QUESTION, answerSchema: { type: 'text' } }, ' Ritu '), 'Ritu');
    assert.equal(
      replacementValue({ ...CITY_QUESTION, answerSchema: { type: 'integer' } }, '42'),
      42,
    );
  });

  // ------------------------------------------------------- validation ----

  test('a reason is mandatory and says why', () => {
    const problem = validateResolution({
      questionKey: 'q04_city',
      choice: { kind: 'keep', answerId: 'ans-1' },
      reason: '  ',
      contradiction: CONFLICT,
    });
    assert.equal(problem.field, 'reason');
    assert.match(problem.message, /read by whoever looks at this run next/);
  });

  test('a reason longer than the service accepts is caught before sending', () => {
    const problem = validateResolution({
      questionKey: 'q04_city',
      choice: { kind: 'keep', answerId: 'ans-1' },
      reason: 'x'.repeat(REASON_MAX + 1),
      contradiction: CONFLICT,
    });
    assert.equal(problem.field, 'reason');
    assert.match(problem.message, new RegExp(String(REASON_MAX)));
  });

  test('neither keeping nor entering is refused', () => {
    const problem = validateResolution({
      questionKey: 'q04_city', choice: null, reason: 'Confirmed on the call.',
    });
    assert.equal(problem.field, 'choice');
    assert.match(problem.message, /Not both, and not neither/);
  });

  test('keeping an answer that is not one of the conflicting ones is refused', () => {
    const problem = validateResolution({
      questionKey: 'q04_city',
      choice: { kind: 'keep', answerId: 'ans-from-another-run' },
      reason: 'Confirmed on the call.',
      contradiction: CONFLICT,
    });
    assert.equal(problem.field, 'choice');
    assert.match(problem.message, /not one of the conflicting answers/);
  });

  test('an entered value outside the question’s own options is refused', () => {
    const problem = validateResolution({
      questionKey: 'q04_city',
      choice: { kind: 'enter', value: { optionId: 'q04_mumbai' } },
      reason: 'Confirmed on the call.',
      contradiction: CONFLICT,
    });
    assert.equal(problem.field, 'value');
    assert.match(problem.message, /the question's own options/);
  });

  test('an empty replacement is refused', () => {
    for (const value of [null, '', '   ', { optionId: '  ' }]) {
      const problem = validateResolution({
        questionKey: 'q04_city',
        choice: { kind: 'enter', value },
        reason: 'Confirmed on the call.',
        contradiction: CONFLICT,
      });
      assert.equal(problem.field, 'value', JSON.stringify(value));
    }
  });

  test('a sound resolution passes, both ways', () => {
    assert.equal(validateResolution({
      questionKey: 'q04_city',
      choice: { kind: 'keep', answerId: 'ans-2' },
      reason: 'She confirmed Hooghly when we rang back.',
      contradiction: CONFLICT,
    }), null);
    assert.equal(validateResolution({
      questionKey: 'q04_city',
      choice: { kind: 'enter', value: { optionId: 'q04_howrah' } },
      reason: 'Neither was right — she meant Howrah.',
      contradiction: CONFLICT,
    }), null);
  });

  // ------------------------------------------------------ what we say ----

  test('a saved resolution never implies anybody was contacted', () => {
    const notice = resolutionNotice({
      questionKey: 'q04_city', resolution: 'kept', duplicate: false, resumed: true,
      recommendationsStale: ['q04_city'],
    });
    assert.match(notice, /gone back to collecting/);
    assert.match(notice, /Nobody was contacted/);
    assert.match(notice, /no suppression was lifted/);
    assert.match(notice, /no \n?consent was granted|no consent was granted/);
    assert.match(notice, /out of date \(q04_city\)/);
    assert.doesNotMatch(notice, /call|dial|messag/i);
  });

  test('a run still in conflict is not described as resumed', () => {
    const notice = resolutionNotice({
      questionKey: 'q04_city', resolution: 'entered', duplicate: false, resumed: false,
      stillInConflict: true,
    });
    assert.match(notice, /still in conflict, so it stays held/);
    assert.doesNotMatch(notice, /gone back to collecting/);
  });

  test('a replayed save says nothing was written twice', () => {
    const notice = resolutionNotice({
      questionKey: 'q04_city', resolution: 'kept', duplicate: true, resumed: false,
    });
    assert.match(notice, /nothing was written twice/);
  });

  test('a stale screen is told to reload, and told nothing was saved', () => {
    assert.match(STALE_SCREEN_MESSAGE, /Reload/);
    assert.match(STALE_SCREEN_MESSAGE, /Nothing was saved/);
  });

  test('hasUnresolved is false for a run with nothing waiting', () => {
    assert.equal(hasUnresolved(null), false);
    assert.equal(hasUnresolved({ runId: 'r', observedAt: null, unresolved: [], resolved: [], note: null }), false);
    assert.equal(hasUnresolved({ runId: 'r', observedAt: null, unresolved: [CONFLICT], resolved: [], note: null }), true);
  });

  // --------------------------------------------------------- readers ----

  test('a contradiction payload is read with its question and evidence', () => {
    const view = readContradictionView({
      runId: 'run-1',
      observedAt: '2026-10-07T09:02:00.000Z',
      unresolved: [{
        questionKey: 'q04_city',
        question: { key: 'q04_city', prompt: 'Which city?', required: true,
          answerSchema: { type: 'single_choice', options: [{ id: 'q04_kolkata', label: 'Kolkata' }] } },
        answers: [{ answerId: 'a1', value: { optionId: 'q04_kolkata' }, rawText: 'Kolkata',
          source: 'whatsapp_inbound', recordedAt: '2026-10-07T09:00:00.000Z' }],
      }],
      resolved: [{ id: 'res-1', questionKey: 'q04_city', resolution: 'kept',
        resultingAnswerId: 'a9', reason: 'Confirmed.', actorRole: 'staff',
        recordedAt: '2026-10-07T09:05:00.000Z' }],
      note: 'Resolving does not contact anybody.',
    });
    assert.equal(view.unresolved[0].question.prompt, 'Which city?');
    assert.equal(view.unresolved[0].answers[0].source, 'whatsapp_inbound');
    assert.equal(view.resolved[0].actorRole, 'staff');
    assert.equal(view.observedAt, '2026-10-07T09:02:00.000Z');
  });

  test('a service failure reads as a failure, not as "nothing to settle"', () => {
    // The browser check cannot exercise this: the conflicts read happens
    // inside the Next server, where a page-level route interception does not
    // reach. The distinction it protects is the dangerous one — a panel that
    // renders "nothing is waiting for a person" when the service is down
    // tells a staff member a run is clear when nobody knows whether it is.
    assert.equal(readContradictionView({ error: 'The service is unavailable.' }), null,
      'an error body is not a view with an empty list');
    assert.equal(hasUnresolved(null), false);
    const empty = readContradictionView({ runId: 'r', observedAt: null, unresolved: [], resolved: [] });
    assert.notEqual(empty, null, 'but a genuinely empty run still reads');
    assert.equal(hasUnresolved(empty), false);
  });

  test('an unreadable contradiction payload is rejected, not half-read', () => {
    assert.equal(readContradictionView(null), null);
    assert.equal(readContradictionView({ runId: 'r' }), null);
    assert.equal(readContradictionView({ unresolved: [{ questionKey: 'q', answers: [{}] }] }), null);
  });

  test('a resolution result carries what did not happen', () => {
    const result = readResolutionResult({
      id: 'res-1', questionKey: 'q04_city', resolution: 'kept', resultingAnswerId: 'a9',
      reason: 'Confirmed.', duplicate: false, resumed: true, stillInConflict: false,
      recommendationsStale: ['q04_city'],
      providerDispatch: { attempted: false, dispatched: false, providerVerified: false,
        reason: 'resolving_a_contradiction_does_not_contact_anybody' },
    });
    assert.equal(result.resumed, true);
    assert.equal(result.providerDispatch.dispatched, false);
    assert.match(result.providerDispatch.reason, /does_not_contact_anybody/);
    assert.deepEqual(result.recommendationsStale, ['q04_city']);
  });
});

describe('refreshing recommendations', { concurrency: false }, () => {
  test('a fresh run says so without being recomputed', () => {
    const notice = stalenessNotice({ staleSince: null, staleBecause: [] });
    assert.equal(notice.stale, false);
    assert.match(notice.headline, /up to date/);
  });

  test('a stale run names what changed and promises what will not', () => {
    const notice = stalenessNotice({
      staleSince: '2026-10-07T09:00:00.000Z',
      staleBecause: ['q04_city', 'q09_budget_range'],
    });
    assert.equal(notice.stale, true);
    assert.deepEqual(notice.because, ['q04_city', 'q09_budget_range']);
    assert.match(notice.detail, /q04_city, q09_budget_range changed/);
    assert.match(notice.detail, /never cancels, replaces or duplicates a visit request/);
    assert.match(notice.detail, /never removes a selection/);
  });

  test('a run with no staleness field at all reads as fresh rather than crashing', () => {
    const notice = stalenessNotice(null);
    assert.equal(notice.stale, false);
  });

  test('a selection that no longer fits is flagged, never withdrawn', () => {
    const { label, tone } = matchStateLabel('no_longer_matching');
    assert.match(label, /flagged for a person/);
    assert.equal(tone, 'warning');
    assert.doesNotMatch(label, /removed|cancelled|withdrawn/i);
  });

  test('a selection with a visit request says request, not booking', () => {
    const shown = describeSelection({
      selectionId: 's1', listingId: 'l1', freeTextLabel: null, enquiryId: 'e1',
      matchState: 'no_longer_matching', detail: 'No longer meets the current answers.',
    });
    assert.match(shown.visit, /not a confirmed booking/);
    assert.match(shown.visit, /Preserved exactly as it was/);
    assert.equal(shown.tone, 'warning');
  });

  test('a project the buyer named that is not ours cannot be re-checked', () => {
    const shown = describeSelection({
      selectionId: 's2', listingId: null, freeTextLabel: 'Somewhere they named',
      enquiryId: null, matchState: 'not_assessable', detail: null,
    });
    assert.equal(shown.title, 'Somewhere they named');
    assert.match(shown.state, /cannot be re-checked/);
    assert.equal(shown.visit, null);
  });

  test('a refresh with no matches says so rather than reading as a failure', () => {
    const line = refreshNotice({
      runId: 'r', refreshedAt: null, wasStale: true, staleBecause: [], area: null,
      matchCount: 0, unavailableReason: 'no published listing matches these answers',
      selections: [], visitRequestsPreserved: 0, needsAttention: false,
      summary: '', guarantees: [],
    });
    assert.match(line, /No project in the current inventory/);
    assert.match(line, /no published listing matches/);
    assert.doesNotMatch(line, /error|failed/i);
  });

  test('a refresh reports flagged selections and preserved visits separately', () => {
    const line = refreshNotice({
      runId: 'r', refreshedAt: null, wasStale: true, staleBecause: ['q05_preferred_location'],
      area: null, matchCount: 3, unavailableReason: null,
      selections: [], visitRequestsPreserved: 2, needsAttention: true,
      summary: '', guarantees: [],
    });
    assert.match(line, /3 projects meet the current answers/);
    assert.match(line, /flagged, not removed/);
    assert.match(line, /2 visit requests are untouched/);
  });

  test('an unresolvable area is said out loud rather than silently widening', () => {
    const line = refreshNotice({
      runId: 'r', refreshedAt: null, wasStale: false, staleBecause: [],
      area: { usable: false, narrowedBy: null, selection: null, unresolved: [],
        searchedNodeCount: 0, note: null },
      matchCount: 1, unavailableReason: null, selections: [], visitRequestsPreserved: 0,
      needsAttention: false, summary: '', guarantees: [],
    });
    assert.match(line, /could not be resolved, so the search was not narrowed/);
  });

  test('a refresh payload is read with its guarantees intact', () => {
    const result = readRefreshResult({
      runId: 'run-1', refreshedAt: '2026-10-07T09:10:00.000Z', wasStale: true,
      staleBecause: ['q05_preferred_location'],
      area: { usable: true, narrowedBy: 'q04_city', selection: 'in-wb-kol',
        unresolved: [{ optionId: 'q05_em_bypass', status: 'ambiguous', reason: 'spans localities' }],
        searchedNodeCount: 52, note: 'The city answer carried the search.' },
      recommendations: { matches: [{ listingId: 'l1' }, { listingId: 'l2' }], unavailable: null },
      selections: [{ selectionId: 's1', listingId: 'l1', freeTextLabel: null, enquiryId: 'e1',
        matchState: 'matching', detail: 'Still meets the current answers.' }],
      visitRequestsPreserved: 1, needsAttention: false,
      summary: 'Every selection still meets the current answers.',
      guarantees: ['No visit request was cancelled, replaced or duplicated.'],
    });
    assert.equal(result.matchCount, 2);
    assert.equal(result.visitRequestsPreserved, 1);
    assert.equal(result.area.unresolved[0].optionId, 'q05_em_bypass');
    assert.match(result.guarantees[0], /No visit request was cancelled/);
  });

  test('an unreadable refresh payload is rejected', () => {
    assert.equal(readRefreshResult(null), null);
    assert.equal(readRefreshResult({ runId: 'r' }), null);
    assert.equal(readRefreshResult({ runId: 'r', selections: [{}] }), null);
  });

  test('a run reports staleness and a correction in progress without recomputing', () => {
    const run = readQualificationRun({
      id: 'run-1', reference: 'QR-1', leadId: 'lead-1', channel: 'whatsapp',
      state: 'collecting', reviewStatus: 'pending', interruptionCount: 0,
      questionSet: { id: 'qs-1', versionLabel: 'client-v1', provenance: 'client_supplied' },
      answers: [], calls: [], messages: [], consentEvidence: [], reviews: [], transcript: [],
      qualification: { reason: 'question_to_level_mapping_not_confirmed' },
      recommendations: { staleSince: '2026-10-07T09:00:00.000Z', staleBecause: ['q04_city'],
        refreshPath: '/v1/admin/qualification/runs/run-1/recommendations', note: 'Staleness means…' },
      pendingAction: { kind: 'correction', step: 'confirm' },
    });
    assert.equal(run.recommendations.staleSince, '2026-10-07T09:00:00.000Z');
    assert.deepEqual(run.recommendations.staleBecause, ['q04_city']);
    assert.equal(run.pendingAction.kind, 'correction');
    assert.equal(run.pendingAction.step, 'confirm');
  });

  test('a backend that predates these fields reads as null, not as stale', () => {
    const run = readQualificationRun({
      id: 'run-1', reference: 'QR-1', leadId: 'lead-1', channel: 'voice',
      state: 'collecting', reviewStatus: 'pending', interruptionCount: 0,
      questionSet: { id: 'qs-1', versionLabel: 'client-v1', provenance: 'client_supplied' },
      answers: [], calls: [], messages: [], consentEvidence: [], reviews: [], transcript: [],
      qualification: {},
    });
    assert.equal(run.recommendations, null);
    assert.equal(run.pendingAction, null);
    assert.equal(stalenessNotice(run.recommendations).stale, false);
  });
});
