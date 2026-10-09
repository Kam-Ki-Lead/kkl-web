import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROPERTY_SEARCH_CONTROLS,
  TRANSACTION_OPTIONS,
  propertySearchFilters,
  propertySearchHref,
  propertySearchParams,
  readTransaction,
} from '../src/lib/domain/property-search-query.ts';

/**
 * The homepage card's controls, and whether they reach a filter.
 *
 * This suite exists because of a specific defect: a "Search type" box sat in
 * the row with the real fields, looked like a control, and filtered nothing.
 * It was a styled div that displayed which tab you were on.
 *
 * So the rule these tests hold is narrow and literal: every control named on
 * the card changes the query, and every key in the query changes a filter.
 * A field that does neither has no business being drawn.
 */

const search = (over = {}) => ({
  locality: '',
  transaction: '',
  bhk: '',
  budget: 'Any budget',
  anyBudgetLabel: 'Any budget',
  ...over,
});

const keysOf = (over) => propertySearchParams(search(over)).map(([key]) => key);

describe('the property search query', { concurrency: false }, () => {
  test('every control the card draws is one the search honours', () => {
    assert.deepEqual([...PROPERTY_SEARCH_CONTROLS], ['locality', 'transaction', 'bhk', 'budget']);
  });

  test('each control on its own puts its key in the query', () => {
    // The "Search type" box passed none of these: it produced no key at all.
    assert.deepEqual(keysOf({ locality: 'new-town' }), ['locality']);
    assert.deepEqual(keysOf({ transaction: 'rent' }), ['transaction']);
    assert.deepEqual(keysOf({ bhk: '3' }), ['bhk']);
    assert.deepEqual(keysOf({ budget: 'Up to ₹1Cr' }), ['budget']);
  });

  test('each query key reaches a filter', () => {
    assert.equal(propertySearchFilters({ locality: 'new-town' }).locationId, 'new-town');
    assert.equal(propertySearchFilters({ transaction: 'rent' }).transaction, 'rent');
    assert.deepEqual(propertySearchFilters({ bhk: '3' }).configurations, ['3']);
    const budgeted = propertySearchFilters({ budget: { min: 1, max: 2 } });
    assert.equal(budgeted.minBudgetInr, 1);
    assert.equal(budgeted.maxBudgetInr, 2);
  });

  test('all four together survive the round trip', () => {
    const href = propertySearchHref(search({
      locality: 'new-town', transaction: 'sale', bhk: '3', budget: 'Up to ₹1Cr',
    }));
    const query = new URLSearchParams(href.split('?')[1]);
    assert.equal(query.get('locality'), 'new-town');
    assert.equal(query.get('transaction'), 'sale');
    assert.equal(query.get('bhk'), '3');
    assert.equal(query.get('budget'), 'Up to ₹1Cr');
    assert.equal([...query.keys()].length, 4, 'and nothing else rides along');
  });

  // ------------------------------------------------------- buy or rent ----

  test('buy and rent travel as the values the record holds', () => {
    assert.equal(readTransaction('sale'), 'sale');
    assert.equal(readTransaction('rent'), 'rent');
    assert.deepEqual(
      TRANSACTION_OPTIONS.map((o) => o.value),
      ['', 'sale', 'rent'],
      'the control offers exactly those two, plus no preference');
  });

  test('no preference means either, not neither', () => {
    assert.equal(readTransaction(''), undefined);
    assert.equal(readTransaction(null), undefined);
    assert.equal(readTransaction(undefined), undefined);
    assert.equal(propertySearchFilters({ transaction: '' }).transaction, undefined);
    assert.deepEqual(keysOf({ transaction: '' }), [], 'and sends no key at all');
  });

  test('a value the record cannot hold is no preference, not a filter that matches nothing', () => {
    for (const bogus of ['buy', 'lease', 'SALE', 'sale ', 'project', '1']) {
      assert.equal(readTransaction(bogus), undefined, bogus);
    }
    assert.deepEqual(keysOf({ transaction: 'lease' }), []);
  });

  // ----------------------------------------------------------- the rest ----

  test('an untouched card searches everything rather than nothing', () => {
    assert.deepEqual(propertySearchParams(search()), []);
    assert.equal(propertySearchHref(search()), '/search');
    const filters = propertySearchFilters({});
    assert.deepEqual(Object.values(filters).filter((v) => v !== undefined), [],
      'no filter is set');
  });

  test('the any-budget label is a choice, not a value to filter by', () => {
    assert.deepEqual(keysOf({ budget: 'Any budget' }), []);
    // A different card could label it differently; the label is passed in.
    assert.deepEqual(
      propertySearchParams(search({ budget: 'No limit', anyBudgetLabel: 'No limit' })),
      []);
  });

  test('whitespace is not a filter', () => {
    assert.deepEqual(keysOf({ locality: '   ', bhk: '  ', transaction: '  ' }), []);
    assert.equal(propertySearchFilters({ locality: '  ' }).locationId, undefined);
  });
});
