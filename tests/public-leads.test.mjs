import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_FILTER_VALUES,
  NO_PUBLIC_LEAD_FILTERS,
  PUBLIC_LEAD_PAGE,
  budgetBandFloor,
  fromMarketplaceLead,
  hasPublicLeadFilters,
  leadCountLine,
  matchesPublicLead,
  publicLeadHref,
  publicLeadHrefWith,
  publicLeadOptions,
  publicLeadShowMoreHref,
  readPublicLeadFilters,
  readShown,
} from '../src/lib/domain/public-leads.ts';

/**
 * The public lead board's rules.
 *
 * The first test is the one that matters: a page nobody has signed in to must
 * not carry the fields the signed-in console carries. The rest keep the browse
 * honest — a filter that offers a value nothing matches, or a budget row sorted
 * as text, is how a working marketplace reads as a broken one.
 */

const CONSOLE_LEAD = {
  id: 'l-4482',
  locationPath: ['Kolkata', 'New Town', 'Action Area I'],
  configuration: '3 BHK',
  budgetBand: '₹1Cr – ₹1.5Cr',
  intentBand: 'hot',
  intentScore: 87,
  status: 'listed',
  ageDays: 37,
  priceCredits: 1100,
  priceConfigurationId: 'pc-9',
  priceConfigurationVersion: 4,
  originalPriceCredits: 1300,
  contactMask: '+91 98••• ••321',
};

const lead = (over = {}) => ({
  id: 'x',
  reference: 'L-1',
  area: 'New Town, Kolkata',
  configurations: ['2 BHK'],
  budgetBand: '₹40L – ₹60L',
  propertyType: null,
  qualification: null,
  priceCredits: 500,
  onSale: false,
  discountPercent: 0,
  ...over,
});

describe('the public lead board', { concurrency: false }, () => {
  test('the public shape drops every field the console may show and a public page may not', () => {
    const published = fromMarketplaceLead(CONSOLE_LEAD);
    const keys = Object.keys(published);
    for (const forbidden of [
      'ageDays',
      'intentScore',
      'contactMask',
      'priceConfigurationId',
      'priceConfigurationVersion',
      'originalPriceCredits',
      'locationPath',
    ]) {
      assert.equal(keys.includes(forbidden), false, `${forbidden} must not reach a public card`);
    }
    // And not smuggled inside a value either.
    const serialised = JSON.stringify(published);
    // Distinct values, so a hit is the field and not a digit of the price.
    assert.equal(serialised.includes('321'), false, 'no fragment of a contact mask');
    assert.equal(serialised.includes('87'), false, 'no intent score');
    assert.equal(serialised.includes('37'), false, 'no age in days');
  });

  test('what it does carry is the locality, the requirement and the price', () => {
    const published = fromMarketplaceLead(CONSOLE_LEAD);
    assert.equal(published.area, 'Action Area I, New Town');
    assert.deepEqual(published.configurations, ['3 BHK']);
    assert.equal(published.budgetBand, '₹1Cr – ₹1.5Cr');
    assert.equal(published.priceCredits, 1100);
    assert.equal(published.qualification, 'Hot intent', 'the band as a word, never the score');
  });

  test('a lead with no configured price is not a free lead', () => {
    assert.equal(fromMarketplaceLead({ ...CONSOLE_LEAD, priceCredits: null }).priceCredits, null);
  });

  test('"on sale" comes from the lifecycle status, not from a discount figure', () => {
    assert.equal(fromMarketplaceLead({ ...CONSOLE_LEAD, status: 'on_sale' }).onSale, true);
    assert.equal(fromMarketplaceLead(CONSOLE_LEAD).onSale, false);
  });

  // ----------------------------------------------------------- filters --

  test('filters are read from the URL, and an empty one is no filter', () => {
    assert.deepEqual(readPublicLeadFilters({ area: 'Salt Lake, Kolkata', tab: 'sale' }), {
      area: 'Salt Lake, Kolkata',
      budget: null,
      configuration: null,
      saleOnly: true,
    });
    assert.deepEqual(readPublicLeadFilters({ area: '  ' }), NO_PUBLIC_LEAD_FILTERS);
    assert.equal(hasPublicLeadFilters(NO_PUBLIC_LEAD_FILTERS), false);
  });

  test('a lead matches only when every applied filter matches', () => {
    const l = lead({ area: 'Salt Lake, Kolkata', configurations: ['2 BHK', '3 BHK'] });
    assert.equal(matchesPublicLead(l, NO_PUBLIC_LEAD_FILTERS), true);
    assert.equal(matchesPublicLead(l, { ...NO_PUBLIC_LEAD_FILTERS, configuration: '3 BHK' }), true);
    assert.equal(matchesPublicLead(l, { ...NO_PUBLIC_LEAD_FILTERS, configuration: '4 BHK' }), false);
    assert.equal(
      matchesPublicLead(l, { area: 'Salt Lake, Kolkata', budget: '₹1Cr – ₹1.5Cr', configuration: null, saleOnly: false }),
      false,
      'the area matching does not excuse the budget',
    );
    assert.equal(matchesPublicLead(l, { ...NO_PUBLIC_LEAD_FILTERS, saleOnly: true }), false);
  });

  test('budget bands order by money, not by their first character', () => {
    const bands = ['₹1Cr – ₹1.5Cr', '₹20L – ₹40L', '₹2.5Cr+', '₹60L – ₹80L'];
    assert.deepEqual(
      [...bands].sort((a, b) => budgetBandFloor(a) - budgetBandFloor(b)),
      ['₹20L – ₹40L', '₹60L – ₹80L', '₹1Cr – ₹1.5Cr', '₹2.5Cr+'],
    );
  });

  test('a band nothing can be read from sorts last rather than first', () => {
    assert.equal(budgetBandFloor('Any budget') > budgetBandFloor('₹5Cr+'), true);
  });

  test('a filter row is capped, and ranked by what is actually listed', () => {
    const leads = [];
    for (let i = 0; i < 12; i += 1) leads.push(lead({ area: `Area ${i}` }));
    // Area 3 is the busiest, so it leads the row.
    for (let i = 0; i < 5; i += 1) leads.push(lead({ area: 'Area 3' }));
    const { areas } = publicLeadOptions(leads);
    assert.equal(areas.length, MAX_FILTER_VALUES);
    assert.equal(areas[0], 'Area 3');
  });

  test('a chosen value is always offered, so a filter can always be cleared', () => {
    const leads = [];
    for (let i = 0; i < 12; i += 1) leads.push(lead({ area: `Area ${i}` }));
    const chosen = { ...NO_PUBLIC_LEAD_FILTERS, area: 'Area 11' };
    const { areas } = publicLeadOptions(leads, chosen);
    assert.equal(areas.includes('Area 11'), true, 'even though it is past the cap');
  });

  test('no option is offered that no lead has', () => {
    const leads = [lead({ budgetBand: null, configurations: [] })];
    const options = publicLeadOptions(leads);
    assert.deepEqual(options.budgets, []);
    assert.deepEqual(options.configurations, []);
  });

  // -------------------------------------------------------------- URLs --

  test('changing one filter keeps the others', () => {
    const current = { area: 'Salt Lake, Kolkata', budget: null, configuration: '2 BHK', saleOnly: true };
    assert.equal(
      publicLeadHrefWith(current, { budget: '₹40L – ₹60L' }),
      '/brokers?area=Salt+Lake%2C+Kolkata&budget=%E2%82%B940L+%E2%80%93+%E2%82%B960L&config=2+BHK&tab=sale#leads',
    );
  });

  test('clearing the last filter gives the bare board', () => {
    assert.equal(publicLeadHrefWith(NO_PUBLIC_LEAD_FILTERS, {}), '/brokers#leads');
  });

  test('"show more" advances one page and keeps the filters', () => {
    const current = { ...NO_PUBLIC_LEAD_FILTERS, configuration: '3 BHK' };
    const href = publicLeadShowMoreHref(current, PUBLIC_LEAD_PAGE);
    assert.equal(href.includes('config=3+BHK'), true);
    assert.equal(href.includes(`show=${PUBLIC_LEAD_PAGE * 2}`), true);
  });

  test('the page size cannot be driven past a sane cap, or under one page', () => {
    assert.equal(readShown({}), PUBLIC_LEAD_PAGE);
    assert.equal(readShown({ show: '0' }), PUBLIC_LEAD_PAGE);
    assert.equal(readShown({ show: '-5' }), PUBLIC_LEAD_PAGE);
    assert.equal(readShown({ show: 'all' }), PUBLIC_LEAD_PAGE);
    assert.equal(readShown({ show: '24' }), 24);
    assert.equal(readShown({ show: '99999' }), PUBLIC_LEAD_PAGE * 20);
  });

  test('a card points at the purchase path, not past it', () => {
    assert.equal(publicLeadHref(lead({ id: 'l-4482' })), '/seller/leads/l-4482');
  });

  // -------------------------------------------------------------- copy --

  test('the count line is singular, plural, and honest about none', () => {
    assert.equal(leadCountLine(1, 'Kolkata'), '1 lead available in Kolkata right now');
    assert.equal(leadCountLine(30, 'Kolkata'), '30 leads available in Kolkata right now');
    assert.equal(leadCountLine(0, 'Kolkata'), 'No leads are listed in Kolkata right now');
  });
});
