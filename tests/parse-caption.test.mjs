// Unit tests for the caption parser.
// All captions below are SYNTHETIC test strings written to exercise the parser.
// They are not content, are not taken from the Instagram account, and must never
// be copied into data/.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseAmount, parsePrice, parseCounts, parseAreas, parseCredits,
  parseCaption, extractPhones, extractHandles, parseLocationLines,
} from '../scripts/lib/parse-caption.mjs';

test('parseAmount handles SA grouping, decimal commas and multipliers', () => {
  assert.equal(parseAmount('28 500 000'), 28_500_000);
  assert.equal(parseAmount('28,500,000'), 28_500_000);
  assert.equal(parseAmount('28.500.000'), 28_500_000);
  assert.equal(parseAmount('28.5', 'million'), 28_500_000);
  assert.equal(parseAmount('4,95', 'm'), 4_950_000);
  assert.equal(parseAmount('4.950', 'million'), 4_950_000);
  assert.equal(parseAmount('1.2', 'bn'), 1_200_000_000);
});

test('price: labelled asking price with non-breaking spaces', () => {
  const { price } = parsePrice('Asking price: R 28 500 000'.replace(/ /g, ' '));
  assert.deepEqual(price.value, { amount: 28_500_000, currency: 'ZAR', qualifier: 'asking' });
  assert.equal(price.confidence, 'high');
});

test('price: POA is recorded as a qualifier with no amount', () => {
  const { price } = parsePrice('Test Residence\nPrice on application');
  assert.deepEqual(price.value, { amount: null, currency: null, qualifier: 'poa' });
});

test('price: reduced price wins over the previous price', () => {
  const { price, priceCandidates } = parsePrice('Was R 30m, now R 27.5m');
  assert.equal(price.value.amount, 27_500_000);
  assert.equal(price.value.qualifier, 'reduced');
  assert.equal(priceCandidates.find((c) => c.amount === 30_000_000).qualifier, 'previous');
});

test('price: levies, rates and rentals are not sale prices', () => {
  const r = parsePrice('Levies R 4 500 · Rates R 3 200 · Rental R 85 000 per month');
  assert.equal(r.price, null);
  assert.equal(r.rentalPrices.length, 1);
  assert.equal(r.rentalPrices[0].amount, 85_000);
});

test('price: p/m suffix marks a rental', () => {
  const r = parsePrice('Available to let at R 120 000 p/m');
  assert.equal(r.price, null);
  assert.equal(r.rentalPrices[0].amount, 120_000);
});

test('price: road numbers like R45 are ignored', () => {
  assert.equal(parsePrice('Just off the R45 towards the valley').price, null);
});

test('price: trailing area group is not absorbed into the price', () => {
  const { price } = parsePrice('R 5 950 000 350 m² of living space');
  assert.equal(price.value.amount, 5_950_000);
});

test('price: from / offers-from qualifiers', () => {
  assert.equal(parsePrice('Units from R 3.2m').price.value.qualifier, 'from');
  assert.equal(parsePrice('Offers from R12 000 000').price.value.qualifier, 'offers-from');
});

test('price: conflicting amounts lower confidence and keep alternatives', () => {
  const { price } = parsePrice('R 12 500 000 for the main house. R 3 000 000 for the adjoining plot.');
  assert.equal(price.confidence, 'medium');
  assert.deepEqual(price.alternatives, [3_000_000]);
});

test('counts: labelled and inline forms', () => {
  const c = parseCounts('5 bedrooms | 5.5 bathrooms | triple garage | 6 parking bays');
  assert.equal(c.bedrooms.value, 5);
  assert.equal(c.bathrooms.value, 5.5);
  assert.equal(c.garages.value, 3);
  assert.equal(c.parking.value, 6);
});

test('counts: "double bedroom" is not two bedrooms', () => {
  const c = parseCounts('A double bedroom and a single garage');
  assert.equal(c.bedrooms, null);
  assert.equal(c.garages.value, 1);
});

test('counts: missing bathrooms stay null (never copied from bedrooms)', () => {
  const c = parseCounts('Four-bedroom family home');
  assert.equal(c.bedrooms.value, 4);
  assert.equal(c.bathrooms, null);
});

test('counts: emoji specs are low confidence', () => {
  const c = parseCounts('🛏 4 🛁 3 🚗 2');
  assert.equal(c.bedrooms.value, 4);
  assert.equal(c.bedrooms.confidence, 'low');
  assert.equal(c.bathrooms.value, 3);
  assert.equal(c.parking.value, 2);
  assert.equal(c.garages, null);
});

test('counts: 4½ bathrooms', () => {
  assert.equal(parseCounts('4½ bathrooms').bathrooms.value, 4.5);
});

test('areas: erf and floor sizes are assigned only with a cue', () => {
  const a = parseAreas('Erf size: 1 250m² · 850 m² under roof · 40m² deck');
  assert.deepEqual(a.erfSize.value, { value: 1250, unit: 'm2' });
  assert.deepEqual(a.floorSize.value, { value: 850, unit: 'm2' });
  assert.deepEqual(a.unassignedAreas.map((x) => x.value), [40]);
});

test('areas: hectares keep SA decimal comma', () => {
  assert.deepEqual(parseAreas('Set on 2,5 hectares').erfSize.value, { value: 2.5, unit: 'ha' });
});

test('credits: stated roles are captured, bare mentions are not given a role', () => {
  const credits = parseCredits(
    'Test Residence by @example_studio\nInterior architecture by @example_interiors\nArchitecture: Example Architects\n📸 @example_photo\nListed by @example_realty\nGreat views, thanks @someone_else',
  );
  const byHandle = Object.fromEntries(credits.filter((c) => c.handle).map((c) => [c.handle, c.role]));
  assert.equal(byHandle.example_studio, 'credit-unspecified');
  assert.equal(byHandle.example_interiors, 'interior-designer');
  assert.equal(byHandle.example_photo, 'photographer');
  assert.equal(byHandle.example_realty, 'listing');
  assert.equal(byHandle.someone_else, 'mentioned');
  const named = credits.find((c) => c.name === 'Example Architects');
  assert.equal(named.role, 'architect');
  assert.equal(named.confidence, 'medium');
});

test('credits: a handle before an unrelated verb stays "mentioned"', () => {
  const [c] = parseCredits('@example_studio designed this home in 2019');
  assert.equal(c.role, 'mentioned');
});

test('phones and handles', () => {
  assert.deepEqual(extractPhones('Call 082 123 4567 or +27 21 555 0100'), ['082 123 4567', '+27 21 555 0100']);
  assert.deepEqual(extractHandles('Email info@example.co.za or DM @example.studio.'), ['example.studio']);
});

test('location lines', () => {
  const [loc] = parseLocationLines('📍 Test Bay, Test City\n5 bedrooms');
  assert.equal(loc.value, 'Test Bay, Test City');
  assert.equal(loc.confidence, 'high');
});

test('parseCaption: signals are evidence only', () => {
  const p = parseCaption('JUST SOLD 🔑\nThis home is no longer on the market. Want your home featured? DM us.');
  const kinds = p.signals.map((s) => s.kind);
  assert.ok(kinds.includes('sold'));
  assert.ok(p.ctas.some((c) => c.kind === 'dm'));
  assert.ok(p.ctas.some((c) => c.kind === 'submit-feature'));
});

test('parseCaption: lowercase "sold" in a question is not a sold signal', () => {
  const p = parseCaption('Have you ever sold a home? Tell us below.');
  assert.ok(!p.signals.some((s) => s.kind === 'sold'));
});

test('parseCaption: an empty caption yields nulls, not defaults', () => {
  const p = parseCaption('');
  for (const k of ['price', 'bedrooms', 'bathrooms', 'garages', 'parking', 'erfSize', 'floorSize', 'propertyType']) {
    assert.equal(p[k], null, k);
  }
  assert.deepEqual(p.credits, []);
});
