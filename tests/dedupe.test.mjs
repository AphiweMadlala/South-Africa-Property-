// Dedupe tests on SYNTHETIC posts run through the real normaliser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalisePost } from '../scripts/extract/normalize.mjs';
import { clusterPosts, titleOf, shingles, jaccard } from '../scripts/extract/dedupe.mjs';

let n = 0;
const mk = (caption, extra = {}) => {
  n++;
  return normalisePost({
    shortCode: `T${String(n).padStart(4, '0')}`,
    caption,
    ownerUsername: 'southafrica.property',
    timestamp: `2026-0${1 + (n % 8)}-10T08:00:00.000Z`,
    displayUrl: `https://example.com/${n}.jpg`,
    ...extra,
  }, { rawFile: 'synthetic', rawIndex: n });
};
const clusterOf = (result, id) => result.residences.find((r) => r.postIds.includes(id));

// Distinct, information-rich synthetic hashes.
const H1 = { dhash: 'f0e1d2c3b4a59687', dhashCenter: '0f1e2d3c4b5a6978' };
const H2 = { dhash: '123456789abcdef0', dhashCenter: 'fedcba9876543210' };
const FLAT = { dhash: '0000000000000001', dhashCenter: '0000000000000000' };

test('same price, bedrooms and city merge', () => {
  const a = mk('📍 Clifton, Cape Town\nR 45 000 000\n4 bedrooms');
  const b = mk('Now showing in Clifton, Cape Town. R 45 000 000. 4 bedrooms, 4 bathrooms.');
  const r = clusterPosts([a, b]);
  assert.equal(clusterOf(r, a.id), clusterOf(r, b.id));
  assert.equal(clusterOf(r, a.id).edges[0].evidence[0].kind, 'same-price-specs');
});

test('a shared listing URL merges; generic link hosts do not', () => {
  const a = mk('Details: https://example.com/listing/12345 · link in bio linktr.ee/example');
  const b = mk('Still available https://example.com/listing/12345');
  const c = mk('More at linktr.ee/example');
  const r = clusterPosts([a, b, c]);
  assert.equal(clusterOf(r, a.id), clusterOf(r, b.id));
  assert.notEqual(clusterOf(r, a.id), clusterOf(r, c.id));
});

test('the same photograph merges even with conflicting specs, and is flagged for review', () => {
  const a = mk('📍 Constantia\n5 bedrooms');
  const b = mk('📍 Constantia\n6 bedrooms');
  const r = clusterPosts([a, b], { x: { postId: a.id, ...H1 }, y: { postId: b.id, ...H1 } });
  const c = clusterOf(r, a.id);
  assert.equal(c, clusterOf(r, b.id));
  assert.equal(c.needsReview, true);
  assert.match(c.conflicts[0].conflicts[0], /bedrooms 5 vs 6/);
});

test('low-information (flat) hashes are ignored', () => {
  const a = mk('A');
  const b = mk('B');
  const r = clusterPosts([a, b], { x: { postId: a.id, ...FLAT }, y: { postId: b.id, ...FLAT } });
  assert.notEqual(clusterOf(r, a.id), clusterOf(r, b.id));
});

test('an image reused across many posts (a template card) is not identity evidence', () => {
  const posts = Array.from({ length: 6 }, (_, i) => mk(`Post ${i}`));
  const hashes = Object.fromEntries(posts.map((p, i) => [`t${i}`, { postId: p.id, ...H2 }]));
  const r = clusterPosts(posts, hashes);
  assert.equal(r.residences.length, 6);
  assert.equal(r.genericImages.length, 6);
});

test('copied captions merge', () => {
  const body = 'Perched above the bay this pavilion house frames the ocean through a single long window while the living spaces step down the slope toward a rim flow pool and a garden of fynbos planted around old milkwood trees';
  const a = mk(body);
  const b = mk(`${body} #repost`);
  const r = clusterPosts([a, b]);
  assert.equal(clusterOf(r, a.id), clusterOf(r, b.id));
});

test('copied captions in different cities are vetoed and recorded', () => {
  const body = 'A contemporary family home with open plan living spaces flowing to a covered terrace and heated pool, a separate guest suite, staff accommodation, a wine room beneath the stair, a study overlooking the garden, a double garage and generous storage throughout the lower level';
  const a = mk(`📍 Umhlanga\n${body}`);
  const b = mk(`📍 Constantia\n${body}`);
  const r = clusterPosts([a, b]);
  assert.notEqual(clusterOf(r, a.id), clusterOf(r, b.id));
  assert.equal(r.rejected.length, 1);
  assert.match(r.rejected[0].conflicts[0], /city/);
});

test('same suburb and specs alone is not enough to merge', () => {
  const a = mk('📍 Bishopscourt\n5 bedrooms 5 bathrooms');
  const b = mk('📍 Bishopscourt\n5 bedrooms 5 bathrooms');
  const r = clusterPosts([a, b]);
  assert.notEqual(clusterOf(r, a.id), clusterOf(r, b.id));
});

test('titleOf rejects location lines and bare place names', () => {
  assert.equal(titleOf('📍 Bishopscourt'), null);
  assert.equal(titleOf('Bishopscourt, Cape Town'), null);
  assert.equal(titleOf('The Glass House, Clifton'), 'the glass house, clifton');
});

test('titleOf rejects questions, prices and spec lines', () => {
  assert.equal(titleOf('Casa Example 🌿\nmore'), 'casa example');
  assert.equal(titleOf('Would you live here?'), null);
  assert.equal(titleOf('R 12 500 000'), null);
  assert.equal(titleOf('5 bedrooms in the valley'), null);
});

test('shingle jaccard', () => {
  const a = shingles('one two three four five');
  const b = shingles('one two three four six');
  assert.ok(jaccard(a.set, b.set) > 0.3 && jaccard(a.set, b.set) < 1);
});
