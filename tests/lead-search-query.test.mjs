import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  NOT_FORWARDED,
  leadSearchHref,
  leadSearchParams,
} from '../src/lib/domain/lead-search-query.ts';

/**
 * The homepage's Buy/Rent search and `/seller/leads` have to agree on a
 * vocabulary. They did not, and the result was a search that looked like it
 * worked and returned nothing.
 *
 * `filterMarketplace` in `services/backend/commerce.ts` is the contract these
 * tests encode:
 *
 *   areaId        lead.locationPath[0] === query.areaId   (an id, resolved to
 *                                                          a name by the adapter)
 *   budgetBand    lead.budgetBand === query.budgetBand    (EXACT equality)
 *   configuration lead.configuration.includes(query.configuration)
 *
 * The third is a substring match against text like "2 BHK, 3 BHK", which is
 * why the canonical form matters.
 */

/** The marketplace's configuration match, copied from the adapter. */
const configurationMatches = (leadConfiguration, queryConfig) =>
  leadConfiguration.includes(queryConfig);

const paramsOf = (search) => new Map(leadSearchParams(search));

describe('the homepage lead search', { concurrency: false }, () => {
  test('an area is forwarded as the record id the marketplace resolves', () => {
    assert.deepEqual(paramsOf({ areaId: 'new-town', bhk: '' }).get('area'), 'new-town');
  });

  test('a BHK is forwarded in the form the marketplace actually matches', () => {
    const config = paramsOf({ areaId: '', bhk: '3' }).get('config');
    assert.equal(config, '3 BHK');
    assert.ok(configurationMatches('2 BHK, 3 BHK', config),
      'the canonical form matches a multi-configuration lead');
    assert.ok(configurationMatches('3 BHK', config));
    assert.equal(configurationMatches('2 BHK', config), false,
      'and does not match a configuration the buyer did not state');
  });

  test('a bare digit would have matched by luck, which is why it is not sent', () => {
    // The old behaviour. Kept as a test so nobody "simplifies" back to it.
    assert.ok(configurationMatches('21 BHK', '3') === false);
    assert.ok(configurationMatches('3 BHK', '3'), 'it happens to work here');
    assert.ok(configurationMatches('13 BHK', '3'),
      'and wrongly here — a substring is not a configuration');
  });

  test('the property type is never forwarded as a configuration', () => {
    // This was the live defect: the card defaulted to "Apartment" with no BHK
    // chosen and sent it as `config`, so the default homepage lead search
    // asked for leads whose configuration contained "Apartment".
    const params = paramsOf({ areaId: 'new-town', bhk: '' });
    assert.equal(params.has('config'), false);
    for (const type of ['Apartment', 'Villa', 'Plot', 'Commercial']) {
      assert.equal(configurationMatches('2 BHK, 3 BHK', type), false,
        `${type} can never match a configuration`);
    }
  });

  test('a display budget label is never forwarded as a budget band', () => {
    const params = paramsOf({ areaId: 'new-town', bhk: '3' });
    assert.equal(params.has('budget'), false);
    // Exact equality against what the buyer stated: a label cannot match.
    for (const label of ['Up to ₹50L', 'Up to ₹1Cr', '₹1.5Cr and above']) {
      assert.notEqual(label, '25l_50l');
      assert.notEqual(label, '50l_1cr');
    }
    assert.match(NOT_FORWARDED.budget, /results page/);
  });

  test('nothing chosen sends nobody to a query that filters everything out', () => {
    assert.deepEqual(leadSearchParams({ areaId: '', bhk: '' }), []);
    assert.equal(leadSearchHref({ areaId: '', bhk: '' }), '/seller/leads');
  });

  test('whitespace is not a filter', () => {
    assert.deepEqual(leadSearchParams({ areaId: '   ', bhk: '  ' }), []);
  });

  test('the href carries both filters when both are chosen', () => {
    const href = leadSearchHref({ areaId: 'new-town', bhk: '3' });
    const query = new URLSearchParams(href.split('?')[1]);
    assert.equal(query.get('area'), 'new-town');
    assert.equal(query.get('config'), '3 BHK');
    assert.equal([...query.keys()].length, 2, 'and nothing else');
  });

  test('what is withheld is explained rather than silently dropped', () => {
    assert.match(NOT_FORWARDED.propertyType, /no property-type filter/);
    assert.ok(NOT_FORWARDED.budget.length > 40);
  });
});
