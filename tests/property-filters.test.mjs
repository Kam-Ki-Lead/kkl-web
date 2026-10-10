import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  BUDGET,
  FilterError,
  MAX_QTY,
  PAGE_PARAMS,
  PAGE_SIZE_DEFAULT,
  PAGE_SIZE_MAX,
  QTY,
  QTY_BANDS,
  QTY_OPTIONS,
  QTY_STEP,
  inBand,
  parseFilters,
  parsePaging,
  qtyLabel,
  toPropertySearchFilters,
  toSql,
} from '../src/lib/domain/property-filters.ts';

/**
 * The filter vocabulary and its validation.
 *
 * Every rule here is one both endpoints and the hero bar apply, so a
 * disagreement between the number on the Search button and the rows behind
 * it would have to be a bug in this module. The boundaries get the most
 * attention, because inclusive-at-both-ends is the rule range filters
 * silently disagree about: 500 belongs to 0–500 AND to 500–1,000.
 */

const q = (pairs) => new URLSearchParams(pairs);
const refused = (pairs, message) => {
  assert.throws(
    () => parseFilters(q(pairs)),
    (error) => {
      assert.ok(error instanceof FilterError, `expected FilterError, got ${error}`);
      assert.equal(error.status, 400);
      if (message) assert.match(error.message, message);
      return true;
    },
    JSON.stringify(pairs));
};

describe('the property filter', { concurrency: false }, () => {
  // ------------------------------------------------------ quantity presets --

  test('every preset the control offers is one the parser accepts', () => {
    // A control offering a value the server rejects is the defect this pairing
    // exists to make impossible.
    for (const option of QTY_OPTIONS) {
      if (option.value === '' || option.value === 'custom') continue;
      assert.deepEqual(parseFilters(q({ qty: option.value })).qty, QTY[option.value], option.value);
    }
  });

  test('the presets are generated from the step, not written out', () => {
    assert.equal(QTY_STEP, 500);
    assert.deepEqual(Object.keys(QTY), [
      '0-500', '500-1000', '1000-1500', '1500-2000', '2000plus',
    ]);
    assert.deepEqual(QTY['0-500'], [0, 500]);
    assert.deepEqual(QTY['500-1000'], [500, 1000]);
    assert.deepEqual(QTY['1000-1500'], [1000, 1500]);
    assert.deepEqual(QTY['1500-2000'], [1500, 2000]);
    assert.deepEqual(QTY['2000plus'], [2000, null], 'open ended');
    assert.equal(Object.keys(QTY).length, QTY_BANDS + 1);
  });

  test('the labels group thousands and mark the open end', () => {
    assert.equal(qtyLabel('0-500'), '0–500');
    assert.equal(qtyLabel('500-1000'), '500–1,000');
    assert.equal(qtyLabel('2000plus'), '2,000+');
  });

  // ---------------------------------------------------- boundaries 500/1000 --

  test('500 is in both bands that touch it', () => {
    assert.equal(inBand(500, QTY['0-500']), true, '0–500 includes its top');
    assert.equal(inBand(500, QTY['500-1000']), true, '500–1,000 includes its floor');
  });

  test('1000 is in both bands that touch it', () => {
    assert.equal(inBand(1000, QTY['500-1000']), true);
    assert.equal(inBand(1000, QTY['1000-1500']), true);
  });

  test('a value just outside a band is outside it', () => {
    assert.equal(inBand(501, QTY['0-500']), false);
    assert.equal(inBand(499, QTY['500-1000']), false);
    assert.equal(inBand(1999, QTY['2000plus']), false);
    assert.equal(inBand(2000, QTY['2000plus']), true, 'the floor is included');
    assert.equal(inBand(9_999_999, QTY['2000plus']), true, 'and there is no ceiling');
  });

  // ------------------------------------------------------- custom: min only --

  test('a min on its own is open-ended upward', () => {
    assert.deepEqual(parseFilters(q({ qty: 'custom', qtyMin: '750' })).qty, [750, null]);
    const filters = toPropertySearchFilters(parseFilters(q({ qty: 'custom', qtyMin: '750' })));
    assert.equal(filters.minLeadsAvailable, 750);
    assert.equal(filters.maxLeadsAvailable, undefined, 'no upper limit reaches the service');
  });

  // ------------------------------------------------------- custom: max only --

  test('a max on its own starts at zero', () => {
    assert.deepEqual(parseFilters(q({ qty: 'custom', qtyMax: '300' })).qty, [0, 300]);
    const filters = toPropertySearchFilters(parseFilters(q({ qty: 'custom', qtyMax: '300' })));
    assert.equal(filters.minLeadsAvailable, 0);
    assert.equal(filters.maxLeadsAvailable, 300);
  });

  // -------------------------------------------------------- custom: both ends --

  test('both ends are taken literally and inclusively', () => {
    assert.deepEqual(parseFilters(q({ qty: 'custom', qtyMin: '100', qtyMax: '200' })).qty, [100, 200]);
    assert.deepEqual(parseFilters(q({ qty: 'custom', qtyMin: '7', qtyMax: '7' })).qty, [7, 7],
      'a single value is a range of one');
    assert.deepEqual(parseFilters(q({ qty: 'custom', qtyMin: '0', qtyMax: '0' })).qty, [0, 0],
      'zero is a value, not an absent field');
  });

  // -------------------------------------------------------- custom: refused --

  test('min greater than max is refused', () => {
    refused({ qty: 'custom', qtyMin: '900', qtyMax: '100' }, /qtyMin cannot be greater than qtyMax/);
  });

  test('neither end is refused', () => {
    refused({ qty: 'custom' }, /needs qtyMin, qtyMax or both/);
    refused({ qty: 'custom', qtyMin: '', qtyMax: '' }, /needs qtyMin, qtyMax or both/);
  });

  test('non-numeric input is refused, by field name', () => {
    refused({ qty: 'custom', qtyMin: 'abc' }, /qtyMin must be a whole number/);
    refused({ qty: 'custom', qtyMax: '12.5' }, /qtyMax must be a whole number/);
    refused({ qty: 'custom', qtyMin: '-5' }, /qtyMin must be a whole number/);
    refused({ qty: 'custom', qtyMin: '1e3' }, /qtyMin must be a whole number/);
    refused({ qty: 'custom', qtyMin: '٣' }, /qtyMin must be a whole number/);
    refused({ qty: 'custom', qtyMin: '0x10' }, /qtyMin must be a whole number/);
    refused({ qty: 'custom', qtyMin: ' 5 5' }, /qtyMin must be a whole number/);
  });

  test('a number too long or too large is refused', () => {
    refused({ qty: 'custom', qtyMin: '1234567890' }, /whole number/, 'ten digits');
    refused({ qty: 'custom', qtyMin: String(MAX_QTY + 1) }, /qtyMin is too large/);
    assert.deepEqual(parseFilters(q({ qty: 'custom', qtyMin: String(MAX_QTY) })).qty, [MAX_QTY, null],
      'the cap itself is allowed');
  });

  test('an unknown preset is refused rather than ignored', () => {
    refused({ qty: '0-499' }, /invalid qty/);
    refused({ qty: 'lots' }, /invalid qty/);
  });

  // ------------------------------------------------------------- repeated --

  test('a repeated parameter is refused, not silently resolved', () => {
    // ?mode=buy&mode=rent is not a search anybody meant, and picking one of
    // them produces a result the caller cannot explain.
    const url = new URLSearchParams();
    url.append('mode', 'buy');
    url.append('mode', 'rent');
    assert.throws(() => parseFilters(url), /repeated parameter: mode/);

    assert.throws(() => parseFilters({ bhk: ['1', '2'] }), /repeated parameter: bhk/);
    assert.throws(() => parseFilters({ qty: ['0-500', '500-1000'] }), /repeated parameter: qty/);
  });

  test('a single value in an array is still a single value', () => {
    assert.equal(parseFilters({ mode: ['rent'] }).mode, 'rent');
  });

  test('a non-string parameter is refused', () => {
    assert.throws(() => parseFilters({ mode: 7 }), /invalid parameter: mode/);
    assert.throws(() => parseFilters({ mode: { toString: () => 'buy' } }), /invalid parameter: mode/);
  });

  // -------------------------------------------------------------- unknown --

  test('an unknown parameter is refused by name', () => {
    // A typo that is silently ignored returns the wrong results and says
    // nothing about it.
    refused({ bkh: '3' }, /unknown parameter: bkh/);
    refused({ qtymin: '5' }, /unknown parameter: qtymin/);
    refused({ page: '2' }, /unknown parameter: page/);
  });

  test('paging is accepted only where it is offered', () => {
    assert.deepEqual(parseFilters(q({ page: '2', pageSize: '20' }), { allow: PAGE_PARAMS }), {});
  });

  test('paging defaults and clamps', () => {
    assert.deepEqual(parsePaging(q({})), { page: 1, pageSize: PAGE_SIZE_DEFAULT });
    assert.deepEqual(parsePaging(q({ page: '3', pageSize: '20' })), { page: 3, pageSize: 20 });
    assert.deepEqual(parsePaging(q({ page: '0' })), { page: 1, pageSize: PAGE_SIZE_DEFAULT },
      'page is at least 1');
    assert.deepEqual(parsePaging(q({ page: '-4' })), { page: 1, pageSize: PAGE_SIZE_DEFAULT });
    assert.equal(parsePaging(q({ pageSize: '500' })).pageSize, PAGE_SIZE_MAX,
      'the ceiling stops this becoming an export');
    assert.equal(parsePaging(q({ pageSize: '0' })).pageSize, 1);
    assert.equal(parsePaging(q({ page: 'abc' })).page, 1, 'nonsense falls back');
  });

  // ------------------------------------------------------- the other fields --

  test('mode, bhk and budget accept only their own vocabulary', () => {
    assert.equal(parseFilters(q({ mode: 'buy' })).mode, 'buy');
    assert.equal(parseFilters(q({ mode: 'rent' })).mode, 'rent');
    refused({ mode: 'lease' }, /invalid mode/);
    refused({ mode: 'BUY' }, /invalid mode/);

    assert.equal(parseFilters(q({ bhk: '4plus' })).bhk, '4plus');
    refused({ bhk: '5' }, /invalid bhk/);

    assert.deepEqual(parseFilters(q({ budget: '1cr-2cr' })).budget, BUDGET['1cr-2cr']);
    refused({ budget: 'cheap' }, /invalid budget/);
  });

  test('budget bands are inclusive and the top one is open', () => {
    assert.equal(inBand(5_000_000, BUDGET.u50l), true, 'the boundary belongs to both');
    assert.equal(inBand(5_000_000, BUDGET['50l-1cr']), true);
    assert.equal(inBand(20_000_000, BUDGET['2crplus']), true);
    assert.equal(inBand(999_999_999, BUDGET['2crplus']), true);
  });

  test('buy means the value the record holds', () => {
    assert.equal(toPropertySearchFilters(parseFilters(q({ mode: 'buy' }))).transaction, 'sale');
    assert.equal(toPropertySearchFilters(parseFilters(q({ mode: 'rent' }))).transaction, 'rent');
  });

  test('4plus is a floor, not a fifth exact value', () => {
    const four = toPropertySearchFilters(parseFilters(q({ bhk: '4plus' })));
    assert.equal(four.minBedrooms, 4);
    assert.equal(four.configurations, undefined);

    const three = toPropertySearchFilters(parseFilters(q({ bhk: '3' })));
    assert.deepEqual(three.configurations, ['3']);
    assert.equal(three.minBedrooms, undefined);
  });

  test('location is trimmed, bounded and optional', () => {
    assert.equal(parseFilters(q({ location: '  New Town  ' })).location, 'New Town');
    assert.equal(parseFilters(q({ location: '   ' })).location, undefined, 'whitespace is not a filter');
    assert.equal(parseFilters(q({ location: 'a'.repeat(80) })).location.length, 80);
    refused({ location: 'a'.repeat(81) }, /location is too long/);
  });

  test('an empty query is an unfiltered search, not an error', () => {
    assert.deepEqual(parseFilters(q({})), {});
    assert.deepEqual(
      Object.values(toPropertySearchFilters(parseFilters(q({})))).filter((v) => v !== undefined),
      []);
  });

  // ------------------------------------------------------- combined filter --

  test('a combined filter keeps every part', () => {
    const parsed = parseFilters(q({
      location: 'New Town',
      mode: 'buy',
      bhk: '4plus',
      budget: '1cr-2cr',
      qty: '500-1000',
    }));
    assert.deepEqual(parsed, {
      location: 'New Town',
      mode: 'buy',
      bhk: '4plus',
      budget: [10_000_000, 20_000_000],
      qty: [500, 1000],
    });

    const filters = toPropertySearchFilters(parsed);
    assert.equal(filters.text, 'New Town');
    assert.equal(filters.transaction, 'sale');
    assert.equal(filters.minBedrooms, 4);
    assert.equal(filters.minBudgetInr, 10_000_000);
    assert.equal(filters.maxBudgetInr, 20_000_000);
    assert.equal(filters.minLeadsAvailable, 500);
    assert.equal(filters.maxLeadsAvailable, 1000);
  });

  test('a combined filter with a custom range keeps the custom range', () => {
    const filters = toPropertySearchFilters(parseFilters(q({
      mode: 'rent', bhk: '2', qty: 'custom', qtyMin: '250',
    })));
    assert.equal(filters.transaction, 'rent');
    assert.deepEqual(filters.configurations, ['2']);
    assert.equal(filters.minLeadsAvailable, 250);
    assert.equal(filters.maxLeadsAvailable, undefined);
  });

  // ------------------------------------------------------------------ SQL --

  test('every caller value travels as a placeholder', () => {
    const { text, values } = toSql(parseFilters(q({
      location: "O'Brien 100%_", mode: 'buy', bhk: '4plus', budget: '2crplus', qty: '500-1000',
    })));
    // Nothing a caller typed may appear in the statement itself.
    assert.equal(text.includes("O'Brien"), false, 'the term is not interpolated');
    assert.equal(text.includes('100%'), false);
    assert.ok(values.includes("%O'Brien 100\\%\\_%"), 'wildcards escaped, value parameterised');
    assert.ok(text.includes("ESCAPE '\\'"), 'and the escape character is declared');
    // Every $n in the statement has a value behind it, and none is missing.
    const placeholders = [...text.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]));
    assert.equal(Math.max(...placeholders), values.length);
    assert.equal(new Set(placeholders).size <= values.length, true);
  });

  test('an open-ended band adds no upper bound to the statement', () => {
    const open = toSql(parseFilters(q({ qty: '2000plus' })));
    const closed = toSql(parseFilters(q({ qty: '500-1000' })));
    assert.equal((open.text.match(/<=/g) ?? []).length, 0);
    assert.equal((closed.text.match(/<=/g) ?? []).length, 1);
  });

  test('the city stays fixed and parameterised', () => {
    const { text, values } = toSql(parseFilters(q({})));
    assert.match(text, /l\.city = \$1/);
    assert.equal(values[0], 'Kolkata');
  });
});
