import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_LOCALITIES_HREF,
  HIGHLIGHT_MIN,
  POPULAR_LOCALITIES_HEADING,
  isHighlighted,
  listingCountLabel,
  localityHref,
  localityLinkLabel,
  localityPills,
  moreLocalitiesLabel,
  moreLocalityCount,
} from '../src/lib/domain/locality-pills.ts';

/**
 * The pill cloud's rules.
 *
 * Three of these exist because the pill is almost all number: a count that is
 * wrong, pluralised wrong, or drawn for a locality with nothing in it is the
 * whole component being wrong.
 */

const ROWS = [
  { id: 'new-town', name: 'New Town', listingCount: 7 },
  { id: 'rajarhat', name: 'Rajarhat', listingCount: 3 },
  { id: 'salt-lake', name: 'Salt Lake', listingCount: 3 },
  { id: 'alipore', name: 'Alipore', listingCount: 1 },
  { id: 'ballygunge', name: 'Ballygunge', listingCount: 1 },
  { id: 'behala', name: 'Behala', listingCount: 1 },
];

describe('the popular-localities pill cloud', { concurrency: false }, () => {
  test('the heading is one constant', () => {
    assert.equal(POPULAR_LOCALITIES_HEADING, 'Popular localities');
  });

  test('one listing is "1 listing", and nothing else is', () => {
    assert.equal(listingCountLabel(1), '1 listing');
    assert.equal(listingCountLabel(0), '0 listings');
    assert.equal(listingCountLabel(2), '2 listings');
    assert.equal(listingCountLabel(120), '120 listings');
  });

  test('the accessible name carries the count, so the badge need not be read', () => {
    assert.equal(localityLinkLabel('New Town', 7), 'New Town, 7 listings');
    assert.equal(localityLinkLabel('Alipore', 1), 'Alipore, 1 listing');
  });

  test('the threshold is inclusive, and it is one constant', () => {
    assert.equal(HIGHLIGHT_MIN, 3);
    assert.equal(isHighlighted(HIGHLIGHT_MIN - 1), false);
    assert.equal(isHighlighted(HIGHLIGHT_MIN), true, 'three listings is highlighted, not four');
    assert.equal(isHighlighted(HIGHLIGHT_MIN + 1), true);
  });

  test('the sample page highlights exactly New Town, Rajarhat and Salt Lake', () => {
    assert.deepEqual(
      localityPills(ROWS).filter((l) => isHighlighted(l.listingCount)).map((l) => l.name),
      ['New Town', 'Rajarhat', 'Salt Lake'],
    );
  });

  test('an empty locality is dropped rather than drawn with a zero', () => {
    const withEmpty = [...ROWS, { id: 'nowhere', name: 'Nowhere', listingCount: 0 }];
    assert.equal(localityPills(withEmpty).some((l) => l.id === 'nowhere'), false);
    assert.equal(localityPills(withEmpty).length, ROWS.length);
  });

  test('the service\'s order is kept, not re-sorted', () => {
    // Highest count first, then alphabetical — decided by the service. If this
    // re-sorted, a service change would silently stop reaching the screen.
    assert.deepEqual(localityPills(ROWS).map((l) => l.id), ROWS.map((l) => l.id));
  });

  test('"+N more" counts what is not on screen, and never goes negative', () => {
    assert.equal(moreLocalityCount(26, 6), 20);
    assert.equal(moreLocalityCount(6, 6), 0, 'nothing left means no pill');
    assert.equal(moreLocalityCount(4, 6), 0, 'and a total smaller than the cloud is still none');
  });

  test('and it pluralises the noun it is counting', () => {
    assert.equal(moreLocalitiesLabel(20), '+20 more localities');
    assert.equal(moreLocalitiesLabel(1), '+1 more locality');
  });

  test('a pill goes where the locality card went', () => {
    assert.equal(localityHref('in-wb-kol-new-town'), '/search?locality=in-wb-kol-new-town');
  });

  test('and an id that is not URL-safe cannot break out of the query', () => {
    assert.equal(localityHref('a&b=c'), '/search?locality=a%26b%3Dc');
  });

  test('the overflow pill has a destination', () => {
    assert.equal(ALL_LOCALITIES_HREF, '/search');
  });
});
