import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  CITIES,
  CITY_STORAGE_KEY,
  DEFAULT_CITY_ID,
  HEADER_NAV,
  SEARCH_TEXT_PARAM,
  activeNavLabel,
  cityButtonLabel,
  cityLabel,
  headerSearchHref,
  readCityId,
  shortlistBadge,
} from '../src/lib/domain/site-header.ts';

/**
 * What the header claims about the application's state.
 *
 * Every one of these was a hard-coded value in the approved prototype: the
 * active tab was an attribute on the first link, the city was the word
 * "Kolkata", and the badge was the character "3". Each is now a decision, and
 * a decision can be wrong, so each is tested.
 */

const query = (pairs = {}) => ({ get: (key) => (key in pairs ? pairs[key] : null) });

describe('the header', { concurrency: false }, () => {
  // ------------------------------------------------------- the active tab --

  test('the current tab comes from the route', () => {
    assert.equal(activeNavLabel('/', query()), 'Home');
    assert.equal(activeNavLabel('/seller/leads', query()), 'Buy leads');
    assert.equal(activeNavLabel('/search', query()), 'Projects');
    assert.equal(
      activeNavLabel('/search', query({ possession: 'new_launch' })),
      'New launches',
      'the same path, a different tab');
  });

  test('Home is not current on every other page', () => {
    // The prototype had aria-current="page" written onto the Home link, so a
    // screen reader announced "current page" on Home from inside Projects.
    for (const path of ['/search', '/seller/leads', '/property/ivy-court', '/support']) {
      assert.notEqual(activeNavLabel(path, query()), 'Home', path);
    }
  });

  test('a child route keeps its parent tab lit', () => {
    assert.equal(activeNavLabel('/seller/leads/abc-123', query()), 'Buy leads');
    assert.equal(activeNavLabel('/property/ivy-court-action-area-i', query()), 'Projects');
  });

  test('a route outside the tab set lights none of them', () => {
    for (const path of ['/support', '/legal/privacy', '/account/shortlist', '/auth']) {
      assert.equal(activeNavLabel(path, query()), null, path);
    }
  });

  test('a lookalike path does not count as the real one', () => {
    assert.equal(activeNavLabel('/seller/leadsx', query()), null);
    assert.equal(activeNavLabel('/searching', query()), null);
    assert.equal(activeNavLabel('/home', query()), null);
  });

  test('every tab is reachable from its own href', () => {
    // A tab whose own link does not light it is a tab nobody can select.
    for (const item of HEADER_NAV) {
      const url = new URL(item.href, 'https://example.invalid');
      assert.equal(
        activeNavLabel(url.pathname, url.searchParams),
        item.label,
        `${item.label} (${item.href})`);
    }
  });

  // ------------------------------------------------------------- the city --

  test('the six cities are offered, Kolkata first and by default', () => {
    assert.deepEqual(
      CITIES.map((c) => c.label),
      ['Kolkata', 'Mumbai', 'Delhi NCR', 'Bengaluru', 'Pune', 'Hyderabad']);
    assert.equal(DEFAULT_CITY_ID, 'kolkata');
    assert.ok(CITIES.some((c) => c.id === DEFAULT_CITY_ID), 'the default is one of them');
  });

  test('ids are stable and distinct from labels', () => {
    // Labels are shown; ids are stored. Renaming "Bengaluru" must not evict
    // everyone who had it selected.
    assert.equal(new Set(CITIES.map((c) => c.id)).size, CITIES.length);
    assert.equal(CITY_STORAGE_KEY, 'kkl.header.city.v1');
  });

  test('a stored value is honoured only if it is still on offer', () => {
    assert.equal(readCityId('pune'), 'pune');
    assert.equal(readCityId(' pune '), 'pune', 'trimmed');
    for (const bogus of ['chennai', 'Pune', '', '   ', null, undefined, 42, {}]) {
      assert.equal(readCityId(bogus), null, String(bogus));
    }
  });

  test('a city removed from the list stops resolving', () => {
    const shorter = CITIES.filter((c) => c.id !== 'pune');
    assert.equal(readCityId('pune', shorter), null);
    assert.equal(cityLabel('pune', shorter), 'Kolkata', 'and falls back to the default');
  });

  test('the visible city name is inside the accessible name', () => {
    // WCAG 2.5.3: "click Kolkata" has to match the control.
    const label = cityButtonLabel('kolkata');
    assert.ok(label.includes('Kolkata'), label);
    assert.equal(cityButtonLabel('delhi-ncr'), 'City: Delhi NCR. Change city');
  });

  // ---------------------------------------------------------- the badge --

  test('no badge at zero', () => {
    assert.equal(shortlistBadge(0).text, null);
    assert.equal(shortlistBadge(undefined).text, null);
    assert.equal(shortlistBadge(0).label, 'Shortlist, empty');
  });

  test('a count draws the count', () => {
    assert.equal(shortlistBadge(1).text, '1');
    assert.equal(shortlistBadge(1).label, 'Shortlist, 1 property');
    assert.equal(shortlistBadge(12).text, '12');
    assert.equal(shortlistBadge(12).label, 'Shortlist, 12 properties');
  });

  test('a value nobody can act on draws nothing', () => {
    for (const bad of [-1, 1.5, NaN, Infinity, '3', null, {}]) {
      assert.equal(shortlistBadge(bad).text, null, String(bad));
    }
  });

  test('the badge caps rather than breaking the bar it sits in', () => {
    assert.equal(shortlistBadge(99).text, '99');
    assert.equal(shortlistBadge(100).text, '99+');
    assert.equal(shortlistBadge(99).label, 'Shortlist, 99 properties');
    assert.equal(shortlistBadge(4821).label, 'Shortlist, 4821 properties',
      'the badge caps, the announced count does not');
  });

  // --------------------------------------------------------- the search --

  test('the panel submits to the parameter the results page reads', () => {
    assert.equal(SEARCH_TEXT_PARAM, 'q');
    assert.equal(headerSearchHref('ivy court'), '/search?q=ivy+court');
  });

  test('an empty search is the whole results page, not an empty one', () => {
    assert.equal(headerSearchHref(''), '/search');
    assert.equal(headerSearchHref('   '), '/search');
  });

  test('the term is encoded, not interpolated', () => {
    const href = headerSearchHref('a&b=c#d /e');
    assert.equal(href.startsWith('/search?q='), true);
    const value = new URLSearchParams(href.split('?')[1]).get('q');
    assert.equal(value, 'a&b=c#d /e', 'and comes back out intact');
    assert.equal(href.includes('#'), false, 'nothing escapes into the fragment');
  });
});
