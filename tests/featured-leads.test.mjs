import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  FEATURED_CTA,
  FEATURED_VIEW_ALL,
  featuredLeadArea,
  featuredLeadHref,
  featuredLeadSummary,
  readFeaturedLeadFeed,
} from '../src/lib/domain/featured-leads.ts';

/**
 * The adapter for the public featured-leads feed.
 *
 * This section used to render published properties under a lead heading. The
 * reader is strict so that cannot come back: a card is built from something
 * shaped like a lead, or it is not built.
 *
 * The other half of these tests is about what a card must never show. The
 * endpoint sends no contact detail, no free-text summary, no age in days and
 * no pricing mechanics — these prove the reader does not invent any of them
 * if a payload arrives carrying them anyway.
 */

const lead = (over = {}) => ({
  id: '11111111-2222-3333-4444-555555555555',
  reference: 'FEAT-ab12cd34',
  area: { id: 'new-town', name: 'New Town' },
  budgetBand: '50l_1cr',
  propertyType: 'Apartment',
  configurations: ['2 BHK', '3 BHK'],
  qualification: { level: null, recorded: false },
  priceCredits: 120,
  sale: { onSale: false, discountPercent: 0 },
  ...over,
});

const feed = (leads, over = {}) => ({
  leads, limit: 6, offset: 0, hasMore: false, ...over,
});

const readOne = (over = {}) => readFeaturedLeadFeed(feed([lead(over)])).leads[0];

describe('reading the featured-leads feed', { concurrency: false }, () => {
  test('a well-formed lead becomes a card', () => {
    const row = readOne();
    assert.equal(row.id, '11111111-2222-3333-4444-555555555555');
    assert.equal(row.reference, 'FEAT-ab12cd34');
    assert.equal(featuredLeadArea(row), 'New Town');
    assert.equal(row.priceCredits, 120);
    assert.deepEqual(row.configurations, ['2 BHK', '3 BHK']);
  });

  test('the summary is built from structured fields only', () => {
    assert.equal(featuredLeadSummary(readOne()), '2 BHK, 3 BHK · Apartment · budget 50l_1cr');
    assert.equal(
      featuredLeadSummary(readOne({ configurations: [], propertyType: null, budgetBand: null })),
      'Requirement not stated',
      'and says so rather than leaving an empty line');
  });

  test('a missing area is named, never guessed', () => {
    assert.equal(featuredLeadArea(readOne({ area: { id: null, name: null } })), 'Area not stated');
  });

  // --------------------------------------------------------- privacy ----

  test('a payload carrying contact detail does not put it on a card', () => {
    // The endpoint sends none of this. If a future change ever did, the card
    // still cannot show it, because the reader builds a fixed shape.
    const row = readOne({
      fullName: 'Ritu Sengupta',
      phone: '+919830000000',
      email: 'ritu@example.invalid',
      summary: 'PRIVATE SUMMARY — 12 Park Street',
      contact: { phone: '+919830000000' },
      notes: 'internal note',
    });
    const wire = JSON.stringify(row);
    for (const secret of ['Ritu', '9830000000', 'example.invalid', 'PRIVATE', 'Park Street', 'internal note']) {
      assert.equal(wire.includes(secret), false, `"${secret}" must not survive the read`);
    }
    for (const field of ['fullName', 'phone', 'email', 'summary', 'contact', 'notes']) {
      assert.equal(field in row, false, `${field} is not a card field`);
    }
  });

  test('a payload carrying pricing mechanics or an age does not surface them', () => {
    const row = readOne({
      baseCredits: 1000,
      demandPercent: 6,
      originalPriceCredits: 1060,
      policyVersion: '2026-10-09',
      ageDays: 9,
    });
    for (const field of [
      'baseCredits', 'demandPercent', 'originalPriceCredits', 'policyVersion', 'ageDays',
    ]) {
      assert.equal(field in row, false, `${field} would let the discount schedule be read off`);
    }
    assert.equal(JSON.stringify(row).includes('2026-10-09'), false);
  });

  // --------------------------------------------------- qualification ----

  test('a level is shown only when the backend says it was recorded', () => {
    const recorded = readOne({ qualification: { level: 4, recorded: true } });
    assert.equal(recorded.qualification.recorded, true);
    assert.equal(recorded.qualification.level, 4);

    const absent = readOne({ qualification: { level: null, recorded: false } });
    assert.equal(absent.qualification.recorded, false);
    assert.equal(absent.qualification.level, null);
  });

  test('a level that arrives without being marked recorded is not shown', () => {
    // Guards against a card showing a number nobody vouched for.
    const row = readOne({ qualification: { level: 9, recorded: false } });
    assert.equal(row.qualification.level, null);
    assert.equal(row.qualification.recorded, false);
  });

  test('recorded with no level is not treated as recorded', () => {
    const row = readOne({ qualification: { level: null, recorded: true } });
    assert.equal(row.qualification.recorded, false);
  });

  // ------------------------------------------------------------ sale ----

  test('a discount badge needs both the flag and a percentage', () => {
    assert.equal(readOne({ sale: { onSale: true, discountPercent: 50 } }).sale.onSale, true);
    assert.equal(readOne({ sale: { onSale: true, discountPercent: 0 } }).sale.onSale, false,
      'a claimed sale with no discount is not a sale');
    assert.equal(readOne({ sale: { onSale: false, discountPercent: 50 } }).sale.onSale, false);
  });

  // -------------------------------------------------------- strictness ----

  test('an unreadable row is dropped, not rendered with holes', () => {
    const mixed = readFeaturedLeadFeed(feed([
      lead(),
      { id: 'no-reference' },
      lead({ priceCredits: null }),
      lead({ area: undefined }),
      lead({ sale: undefined }),
      lead({ qualification: undefined }),
      lead({ id: 'second-good', reference: 'FEAT-99999999' }),
    ]));
    assert.equal(mixed.leads.length, 2, 'only the two complete rows');
    assert.deepEqual(mixed.leads.map((l) => l.reference), ['FEAT-ab12cd34', 'FEAT-99999999']);
  });

  test('a property payload can never become a lead card', () => {
    // The exact shape this section used to render. It must read as nothing.
    const property = {
      id: 'ivy-court-action-area-i',
      slug: 'ivy-court-action-area-i',
      title: 'Ivy Court',
      locality: 'Action Area I',
      priceRange: { minInr: 9000000, maxInr: 12000000 },
      configurations: ['3 BHK'],
      media: [{ url: '/x.png', alt: 'Ivy Court' }],
    };
    assert.deepEqual(readFeaturedLeadFeed(feed([property])).leads, []);
  });

  test('a payload that is not a feed is refused outright', () => {
    assert.equal(readFeaturedLeadFeed(null), null);
    assert.equal(readFeaturedLeadFeed({}), null);
    assert.equal(readFeaturedLeadFeed({ error: 'unavailable' }), null);
    assert.equal(readFeaturedLeadFeed([lead()]), null, 'an array is not the envelope');
    assert.deepEqual(readFeaturedLeadFeed(feed([])).leads, [], 'but an empty feed is a feed');
  });

  test('a price must be a whole non-negative number of credits', () => {
    for (const price of [null, undefined, -1, 1.5, '120', NaN, Infinity]) {
      assert.equal(readFeaturedLeadFeed(feed([lead({ priceCredits: price })])).leads.length, 0,
        `priceCredits=${String(price)}`);
    }
    assert.equal(readOne({ priceCredits: 0 }).priceCredits, 0, 'zero is readable');
  });

  // ------------------------------------------------------- navigation ----

  test('View all opens the lead marketplace, not the property search', () => {
    assert.equal(FEATURED_VIEW_ALL, '/seller/leads');
    assert.notEqual(FEATURED_VIEW_ALL, '/search');
  });

  test('a card leads into the existing purchase workflow', () => {
    assert.equal(featuredLeadHref(readOne()),
      '/seller/leads/11111111-2222-3333-4444-555555555555');
    assert.equal(FEATURED_CTA, 'Buy Leads');
  });

  test('an id with awkward characters is still a safe href', () => {
    const row = readOne({ id: 'a b/c?d#e' });
    assert.equal(featuredLeadHref(row), '/seller/leads/a%20b%2Fc%3Fd%23e');
  });

  test('paging is read back as the backend sent it', () => {
    const page = readFeaturedLeadFeed(feed([lead()], { limit: 6, offset: 12, hasMore: true }));
    assert.equal(page.limit, 6);
    assert.equal(page.offset, 12);
    assert.equal(page.hasMore, true);
    assert.equal(readFeaturedLeadFeed(feed([lead()])).hasMore, false);
  });
});
