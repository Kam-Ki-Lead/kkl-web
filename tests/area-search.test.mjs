import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  AREA_QUERY_MIN,
  areaLabel,
  areaOptionsFor,
  mergeAreas,
  rankAreas,
} from '../src/lib/domain/area-search.ts';

/**
 * Ranking areas against what somebody typed.
 *
 * The case that matters is the one that produced a wrong selection rather
 * than a slow one. Labels are "<area>, <parent>", so "new town" matches the
 * three Action Areas as well as New Town itself. Unordered, the first Action
 * Area was highlighted, and typing a locality's own name then pressing Enter
 * chose one of its sub-localities.
 */

const AREAS = [
  { id: 'action-area-i', label: 'Action Area I, New Town' },
  { id: 'action-area-ii', label: 'Action Area II, New Town' },
  { id: 'action-area-iii', label: 'Action Area III, New Town' },
  { id: 'new-town', label: 'New Town, Kolkata' },
  { id: 'rajarhat', label: 'Rajarhat, Kolkata' },
  { id: 'salt-lake', label: 'Salt Lake, Kolkata' },
];

const labels = (rows) => rows.map((r) => r.label);

describe('ranking areas', { concurrency: false }, () => {
  test("a locality's own name comes before its sub-localities", () => {
    // The defect this ordering exists for: Enter on "new town" must not
    // select Action Area I.
    const ranked = rankAreas(AREAS, 'new town');
    assert.equal(ranked[0].id, 'new-town');
    assert.equal(ranked.length, 4, 'the three Action Areas still match');
  });

  test('an exact label beats a prefix, and a prefix beats a mere contains', () => {
    // Rank 2 needs a label that CONTAINS the query without starting it —
    // which is exactly the sub-locality case: "…, Park Street".
    const pool = [
      { id: 'c', label: 'Camac Lane, Park Street' },
      { id: 'b', label: 'Park Street Extension, Kolkata' },
      { id: 'a', label: 'park street' },
    ];
    assert.deepEqual(labels(rankAreas(pool, 'park street')), [
      'park street',
      'Park Street Extension, Kolkata',
      'Camac Lane, Park Street',
    ]);
    // And a label that matches neither way is absent, not last.
    assert.deepEqual(labels(rankAreas([...pool, { id: 'd', label: 'Park Circus, Kolkata' }], 'park street')).includes('Park Circus, Kolkata'), false);
  });

  test('ties break alphabetically, so the order never wobbles', () => {
    assert.deepEqual(labels(rankAreas(AREAS, 'action area')), [
      'Action Area I, New Town',
      'Action Area II, New Town',
      'Action Area III, New Town',
    ]);
  });

  test('matching ignores case', () => {
    assert.deepEqual(rankAreas(AREAS, 'SALT LAKE').map((a) => a.id), ['salt-lake']);
    assert.deepEqual(rankAreas(AREAS, 'sAlT').map((a) => a.id), ['salt-lake']);
  });

  test('an empty query matches everything', () => {
    assert.equal(rankAreas(AREAS, '').length, AREAS.length);
    assert.equal(rankAreas(AREAS, '   ').length, AREAS.length);
  });

  test('a query nothing matches returns nothing, not everything', () => {
    assert.deepEqual(rankAreas(AREAS, 'zzzz'), []);
  });

  // ------------------------------------------------------- the "all" row --

  test('the everything choice leads the list, but only before a keystroke', () => {
    const idle = areaOptionsFor(AREAS, '', 'All of Kolkata');
    assert.equal(idle[0].id, '');
    assert.equal(idle[0].label, 'All of Kolkata');

    // "All of Kolkata" is not an answer to "rajar". Left in, it would be the
    // first row — the one Enter takes — and it clears the filter.
    const typing = areaOptionsFor(AREAS, 'rajar', 'All of Kolkata');
    assert.equal(typing.some((o) => o.id === ''), false);
    assert.equal(typing[0].id, 'rajarhat');
  });

  test('without an everything label there is no empty row at all', () => {
    assert.equal(areaOptionsFor(AREAS, '').some((o) => o.id === ''), false);
  });

  // ------------------------------------------------------------ merging --

  test('what the service found is added to the preloaded page', () => {
    const found = [{ id: 'behala', label: 'Behala, Kolkata' }];
    const merged = mergeAreas(AREAS, found);
    assert.equal(merged.length, AREAS.length + 1);
    assert.equal(merged.some((a) => a.id === 'behala'), true,
      'a locality past the preloaded hundred becomes reachable');
  });

  test('a record in both keeps the preloaded copy, so the list cannot reorder', () => {
    const merged = mergeAreas(AREAS, [{ id: 'rajarhat', label: 'RAJARHAT (service copy)' }]);
    assert.equal(merged.length, AREAS.length);
    assert.equal(merged.find((a) => a.id === 'rajarhat').label, 'Rajarhat, Kolkata');
  });

  test('nothing found leaves the preloaded page exactly as it was', () => {
    assert.equal(mergeAreas(AREAS, []), AREAS);
  });

  // ------------------------------------------------------------- labels --

  test('the chosen id resolves to its label', () => {
    assert.equal(areaLabel('salt-lake', AREAS, 'All of Kolkata'), 'Salt Lake, Kolkata');
    assert.equal(areaLabel('', AREAS, 'All of Kolkata'), 'All of Kolkata');
  });

  test('an id no longer on offer resolves to nothing, not to a guess', () => {
    // Storage and URLs outlive records. A stale id must not silently read as
    // some other area.
    assert.equal(areaLabel('demolished', AREAS, 'All of Kolkata'), '');
  });

  test('the service is not asked about a single character', () => {
    assert.equal(AREA_QUERY_MIN, 2);
  });
});
