// Normaliser tests against a SYNTHETIC Apify-shaped fixture (tests/fixtures).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalisePost, mediaType } from '../scripts/extract/normalize.mjs';

const items = JSON.parse(readFileSync(new URL('./fixtures/apify-posts.synthetic.json', import.meta.url)));
const prov = (i) => ({ rawFile: 'fixture', rawIndex: i });

test('media types', () => {
  assert.equal(mediaType(items[0]), 'carousel');
  assert.equal(mediaType(items[1]), 'reel');
  assert.equal(mediaType(items[2]), 'image');
});

test('carousel post normalises with provenance, specs, place and credits', () => {
  const p = normalisePost(items[0], prov(0));
  assert.equal(p.id, 'TESTAAA0001');
  assert.equal(p.media.length, 2);
  assert.deepEqual(p.provenance, { rawFile: 'fixture', rawIndex: 0 });
  assert.equal(p.metrics.likes, null, 'hidden likes (-1) become null');
  assert.equal(p.metrics.comments, 12);
  assert.equal(p.parsed.price.value.amount, 38_500_000);
  assert.equal(p.parsed.bedrooms.value, 5);
  assert.equal(p.parsed.bathrooms.value, 5.5);
  assert.equal(p.parsed.garages.value, 2);
  assert.deepEqual(p.parsed.erfSize.value, { value: 1100, unit: 'm2' });
  assert.deepEqual(p.parsed.floorSize.value, { value: 780, unit: 'm2' });
  assert.equal(p.place.name, 'Camps Bay');
  assert.equal(p.place.source, 'location-tag');
  const roles = Object.fromEntries(p.parsed.credits.filter((c) => c.source === 'caption').map((c) => [c.handle, c.role]));
  assert.equal(roles.example_architects, 'architect');
  assert.equal(roles.example_photographer, 'photographer');
  assert.equal(roles.example_realty, 'listing');
  assert.ok(p.parsed.credits.some((c) => c.source === 'photo-tag' && c.handle === 'example_realty'));
  assert.ok(p.parsed.ctas.some((c) => c.kind === 'submit-feature'));
});

test('reel without specs keeps nulls and records the collab author', () => {
  const p = normalisePost(items[1], prov(1));
  assert.equal(p.type, 'reel');
  assert.equal(p.parsed.price, null);
  assert.equal(p.parsed.bedrooms, null);
  assert.equal(p.place, null);
  assert.deepEqual(p.coauthors, ['example_studio']);
  assert.ok(p.parsed.ctas.some((c) => c.kind === 'link-in-bio'));
  assert.ok(p.parsed.ctas.some((c) => c.kind === 'question'));
});
